import asyncio

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.config import SupplierSettings
from app.schemas import RepairDecision, SupplierSearchRequest
from app.suppliers import Place, SupplierSearchService, fallback_url, haversine_km
from app.main import app
from test_parts_catalog import request


class Provider:
    async def geocode(self, _area: str) -> Place | None:
        return Place(51.5, -0.1)

    async def search(self, _place: Place, _radius: int) -> list[dict[str, object]]:
        return [
            {"lat": 51.51, "lon": -0.1, "tags": {"name": "Far Hardware", "shop": "hardware"}},
            {"lat": 51.5001, "lon": -0.1, "tags": {"name": "Near Irrigation", "shop": "trade"}},
        ]


class FailingProvider:
    async def geocode(self, _area: str) -> Place | None:
        raise TimeoutError

    async def search(self, _place: Place, _radius: int) -> list[dict[str, object]]:
        return []


class CountingProvider(Provider):
    calls = 0

    async def geocode(self, area: str) -> Place | None:
        self.calls += 1
        return await super().geocode(area)


def make_request(**changes: object) -> SupplierSearchRequest:
    data = request().model_dump()
    data.update({"area": "Test area", "radius_km": 5, "max_results": 10})
    data.update(changes)
    return SupplierSearchRequest(**data)


def test_haversine_and_url_are_deterministic() -> None:
    assert haversine_km(Place(0, 0), 0, 1) == 111.19492664455873
    assert "api=1" in fallback_url("Test area")


def test_disabled_search_returns_safe_category_fallback() -> None:
    service = SupplierSearchService(SupplierSettings(False, "test", 1, 1, 1), Provider())
    result = asyncio.run(service.search(make_request(), 0.75))
    assert result.suppliers == []
    assert result.fallback_message is not None
    assert result.provider_enabled is False


def test_enabled_search_returns_only_relevant_sorted_public_locations() -> None:
    service = SupplierSearchService(SupplierSettings(True, "test", 1, 1, 1), Provider())
    result = asyncio.run(service.search(make_request(), 0.75))
    assert [item.name for item in result.suppliers] == ["Near Irrigation", "Far Hardware"]
    assert all(item.availability_status == "unknown" for item in result.suppliers)
    assert result.decision is RepairDecision.ELIGIBLE


def test_ineligible_context_never_calls_provider() -> None:
    invalid = make_request()
    invalid.analysis.is_mock = True
    service = SupplierSearchService(SupplierSettings(True, "test", 1, 1, 1), Provider())
    result = asyncio.run(service.search(invalid, 0.75))
    assert result.decision is not RepairDecision.ELIGIBLE
    assert result.suppliers == []


def test_invalid_radius_is_rejected_by_the_request_contract() -> None:
    with pytest.raises(ValidationError):
        make_request(radius_km=11)


def test_cache_avoids_repeating_a_normalized_area_lookup() -> None:
    provider = CountingProvider()
    service = SupplierSearchService(SupplierSettings(True, "test", 60, 1, 1), provider)
    asyncio.run(service.search(make_request(area="Test area"), 0.75))
    asyncio.run(service.search(make_request(area=" test  area "), 0.75))
    assert provider.calls == 1


def test_provider_failure_returns_fallback_not_an_error() -> None:
    service = SupplierSearchService(SupplierSettings(True, "test", 1, 1, 1), FailingProvider())
    result = asyncio.run(service.search(make_request(), 0.75))
    assert result.suppliers == []
    assert result.fallback_message is not None


def test_endpoint_validates_radius_and_returns_disabled_mode_fallback() -> None:
    client = TestClient(app)
    payload = make_request().model_dump(mode="json")
    response = client.post("/api/v1/suppliers/search", json=payload)
    assert response.status_code == 200
    assert response.json()["suppliers"] == []
    payload["radius_km"] = 11
    assert client.post("/api/v1/suppliers/search", json=payload).status_code == 422
