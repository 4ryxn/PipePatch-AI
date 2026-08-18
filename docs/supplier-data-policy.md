# Supplier data policy

PipePatch's optional nearby-materials search is explicitly user-triggered. It sends only a manually entered general city, area, locality, or postcode to the backend. Users must not enter a home address. PipePatch has no autocomplete, background refresh, tracking, location history, reverse-geocoding grids, or persistence of search terms/results.

When enabled, the backend makes one Nominatim geocode request and one Overpass POI query, never from browser code. It uses a descriptive configured User-Agent, a short process-local TTL cache, and process-wide Nominatim pacing of at most one request each second. Results use public OpenStreetMap data and show `© OpenStreetMap contributors` attribution. They are incomplete, approximate points, not a current or comprehensive supplier directory.

Results show approximate straight-line distance only. PipePatch never verifies driving distance, travel time, hours, stock, compatible parts, store prices, or the cheapest route; availability is always unknown and users must contact the supplier. A generic external category search is provided when the provider is disabled, fails, or finds no results.

The public Nominatim and Overpass services are suitable only for this bounded final-year-project use. A deployed or higher-volume service must use a compliant commercial or self-hosted provider and continue to meet the applicable [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) and [Overpass fair-use guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).
