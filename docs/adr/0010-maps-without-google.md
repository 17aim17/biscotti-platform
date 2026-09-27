# ADR 0010: Maps without Google

Status: accepted

## Context

Delivery needs a map pin (to check the outlet's delivery radius), a place search, and the address of a dropped pin. Google Maps needs a billing account and an API key.

## Decision

- Leaflet with OpenStreetMap tiles for the map; the delivery area is drawn as a circle and the radius is checked on the server with the haversine distance.
- Photon (komoot's public OpenStreetMap geocoder) for search-as-you-type and for the address of a pin. Nominatim was tried first but its usage policy forbids search-as-you-type.
- The pin and the search box stay in sync: moving the pin looks up its address; picking a result moves the pin. The customer types the house or flat number separately, so a lookup never overwrites it.

## Consequences

- No keys or billing; works locally and on a free deploy.
- The public Photon server asks for fair use. A paid or self-hosted geocoder is needed before real traffic (backlog).
- The server trusts the pin's coordinates for the radius check; nothing ties them to the typed address. Staff see the address and can reject. Server-side geocoding is in the backlog.
