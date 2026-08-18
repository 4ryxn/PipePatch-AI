"""Small, bounded OpenStreetMap supplier discovery adapter.

It is deliberately user-triggered, uses only a general area, and keeps a
process-local short-lived cache. No search term, coordinate, or result is logged
or persisted by PipePatch.
"""

import asyncio
import math
import time
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import urlencode

import httpx

from app.config import SupplierSettings
from app.parts_catalog import parts_estimate
from app.schemas import (
    RepairDecision,
    SupplierLead,
    SupplierSearchRequest,
    SupplierSearchResponse,
)

MAX_RADIUS_KM = 10.0
MAX_RESULTS = 10
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
AVAILABILITY = (
    "Availability: unknown — contact this supplier to confirm compatible parts and in-store stock."
)


@dataclass(frozen=True)
class Place:
    latitude: float
    longitude: float


class SupplierProvider(Protocol):
    async def geocode(self, area: str) -> Place | None: ...

    async def search(self, place: Place, radius_m: int) -> list[dict[str, Any]]: ...


class OsmSupplierProvider:
    """Official public OSM APIs, with a descriptive User-Agent and timeouts."""

    def __init__(self, settings: SupplierSettings) -> None:
        self._settings = settings

    async def geocode(self, area: str) -> Place | None:
        timeout = httpx.Timeout(self._settings.request_timeout_seconds)
        async with httpx.AsyncClient(
            timeout=timeout, headers={"User-Agent": self._settings.user_agent}
        ) as client:
            response = await client.get(
                NOMINATIM_URL, params={"q": area, "format": "jsonv2", "limit": "1"}
            )
            response.raise_for_status()
            results = response.json()
        if not isinstance(results, list) or not results:
            return None
        result = results[0]
        try:
            return Place(float(result["lat"]), float(result["lon"]))
        except (KeyError, TypeError, ValueError):
            return None

    async def search(self, place: Place, radius_m: int) -> list[dict[str, Any]]:
        query = (
            "[out:json][timeout:10];("
            'nwr["shop"~"^(hardware|doityourself|trade|building_materials)$"]'
            f"(around:{radius_m},{place.latitude},{place.longitude});"
            'nwr["name"~"irrigation",i]'
            f"(around:{radius_m},{place.latitude},{place.longitude});"
            ");out center tags;"
        )
        timeout = httpx.Timeout(self._settings.request_timeout_seconds)
        async with httpx.AsyncClient(
            timeout=timeout, headers={"User-Agent": self._settings.user_agent}
        ) as client:
            response = await client.post(OVERPASS_URL, data={"data": query})
            response.raise_for_status()
            payload = response.json()
        elements = payload.get("elements", []) if isinstance(payload, dict) else []
        return [element for element in elements if isinstance(element, dict)]


def haversine_km(origin: Place, latitude: float, longitude: float) -> float:
    radius = 6371.0
    phi_1, phi_2 = math.radians(origin.latitude), math.radians(latitude)
    d_phi, d_lambda = (
        math.radians(latitude - origin.latitude),
        math.radians(longitude - origin.longitude),
    )
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(d_lambda / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def fallback_url(area: str) -> str:
    return "https://www.google.com/maps/search/?" + urlencode(
        {"api": "1", "query": f"hardware store near {area}"}
    )


class SupplierSearchService:
    def __init__(
        self, settings: SupplierSettings, provider: SupplierProvider | None = None
    ) -> None:
        self._settings = settings
        self._provider = provider or OsmSupplierProvider(settings)
        self._cache: dict[tuple[str, float, int], tuple[float, SupplierSearchResponse]] = {}
        self._lock = asyncio.Lock()
        self._last_geocode = 0.0

    async def search(
        self, request: SupplierSearchRequest, threshold: float
    ) -> SupplierSearchResponse:
        refusal = parts_estimate(request, threshold)
        url = fallback_url(request.area)
        if refusal.decision is not RepairDecision.ELIGIBLE:
            return SupplierSearchResponse(
                decision=refusal.decision,
                suppliers=[],
                reasons=refusal.reasons,
                fallback_search_url=url,
                fallback_message="Complete every safety and measurement gate before supplier discovery.",
                provider_enabled=self._settings.enabled,
            )
        if not self._valid_request(request):
            return self._fallback(
                url, "Use a general city, area, or postcode and a radius from 0.1 to 10 km."
            )
        if not self._settings.enabled:
            return self._fallback(
                url,
                "Nearby discovery is disabled in this environment. Use the category search link instead.",
            )
        key = (" ".join(request.area.lower().split()), request.radius_km, request.max_results)
        now = time.monotonic()
        cached = self._cache.get(key)
        if cached and cached[0] > now:
            return cached[1]
        async with self._lock:
            cached = self._cache.get(key)
            if cached and cached[0] > time.monotonic():
                return cached[1]
            wait = self._settings.nominatim_min_interval_seconds - (
                time.monotonic() - self._last_geocode
            )
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_geocode = time.monotonic()
            try:
                origin = await self._provider.geocode(request.area)
                if origin is None:
                    result = self._fallback(
                        url, "The general area could not be located. Try a city, area, or postcode."
                    )
                else:
                    raw = await self._provider.search(origin, int(request.radius_km * 1000))
                    leads = _leads(origin, raw, request.max_results)
                    result = SupplierSearchResponse(
                        decision=RepairDecision.ELIGIBLE,
                        suppliers=leads,
                        reasons=[],
                        fallback_search_url=url,
                        fallback_message=None
                        if leads
                        else "No relevant public OSM locations were found nearby. Try the category search link.",
                        provider_enabled=True,
                    )
            except (httpx.HTTPError, asyncio.TimeoutError, ValueError, TypeError):
                result = self._fallback(
                    url,
                    "Nearby discovery is temporarily unavailable. Try again or use the category search link.",
                )
            self._cache[key] = (time.monotonic() + self._settings.cache_ttl_seconds, result)
            return result

    @staticmethod
    def _valid_request(request: SupplierSearchRequest) -> bool:
        return (
            2 <= len(request.area.strip()) <= 120
            and math.isfinite(request.radius_km)
            and 0.1 <= request.radius_km <= MAX_RADIUS_KM
            and 1 <= request.max_results <= MAX_RESULTS
        )

    def _fallback(self, url: str, message: str) -> SupplierSearchResponse:
        return SupplierSearchResponse(
            decision=RepairDecision.ELIGIBLE,
            suppliers=[],
            reasons=[],
            fallback_search_url=url,
            fallback_message=message,
            provider_enabled=self._settings.enabled,
        )


def _leads(origin: Place, elements: list[dict[str, Any]], maximum: int) -> list[SupplierLead]:
    result: list[SupplierLead] = []
    for element in elements:
        tags = element.get("tags")
        if not isinstance(tags, dict):
            continue
        latitude = element.get(
            "lat",
            element.get("center", {}).get("lat")
            if isinstance(element.get("center"), dict)
            else None,
        )
        longitude = element.get(
            "lon",
            element.get("center", {}).get("lon")
            if isinstance(element.get("center"), dict)
            else None,
        )
        name = tags.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        try:
            lat, lon = float(latitude), float(longitude)
        except (TypeError, ValueError):
            continue
        shop = tags.get("shop")
        category = "irrigation supply" if "irrigation" in name.lower() else str(shop or "hardware")
        address = (
            ", ".join(
                str(tags[key])
                for key in ("addr:housenumber", "addr:street", "addr:city")
                if key in tags
            )
            or None
        )
        result.append(
            SupplierLead(
                name=name.strip(),
                category=category,
                public_address=address,
                latitude=lat,
                longitude=lon,
                distance_km=round(haversine_km(origin, lat, lon), 2),
                directions_url="https://www.google.com/maps/dir/?"
                + urlencode({"api": "1", "destination": f"{lat},{lon}"}),
                availability_message=AVAILABILITY,
            )
        )
    return sorted(result, key=lambda item: item.distance_km)[:maximum]
