// Place search and reverse lookup (a point on the map to an address) with
// Photon: komoot's free OpenStreetMap geocoder, built for search-as-you-type.
// The public server asks for fair use; a production app would use a paid or
// self-hosted geocoder (backlog).
import type { Pin } from "@/components/delivery-map"

export type Place = { label: string; pin: Pin }

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    district?: string
    locality?: string
    city?: string
    state?: string
    countrycode?: string
  }
}

const PHOTON = "https://photon.komoot.io"

function toPlace(f: PhotonFeature): Place {
  const p = f.properties
  const street = [p.housenumber, p.street].filter(Boolean).join(" ")
  const parts = [p.name, street, p.district ?? p.locality, p.city ?? p.state]
  const label = [...new Set(parts.filter(Boolean))].join(", ")
  const [lng, lat] = f.geometry.coordinates
  return { label, pin: { lat, lng } }
}

async function photon(
  path: string,
  params: URLSearchParams,
  signal: AbortSignal
) {
  const response = await fetch(`${PHOTON}${path}?${params}`, { signal })
  if (!response.ok) throw new Error(`Photon ${response.status}`)
  const data = (await response.json()) as { features: PhotonFeature[] }
  return data.features.filter((f) => f.properties.countrycode === "IN")
}

// Places matching the text, within about 50 km of `near`.
export async function searchPlaces(
  query: string,
  near: Pin,
  signal: AbortSignal
): Promise<Place[]> {
  const d = 0.5
  const params = new URLSearchParams({
    q: query,
    lang: "en",
    limit: "6",
    lat: String(near.lat),
    lon: String(near.lng),
    bbox: [near.lng - d, near.lat - d, near.lng + d, near.lat + d].join(),
  })
  return (await photon("/api/", params, signal)).map(toPlace)
}

// The address at a point, for a pin dropped or dragged on the map. Falls back
// to the coordinates when there is nothing named nearby.
export async function addressAt(
  pin: Pin,
  signal: AbortSignal
): Promise<string> {
  const params = new URLSearchParams({
    lat: String(pin.lat),
    lon: String(pin.lng),
    lang: "en",
    limit: "1",
  })
  const [feature] = await photon("/reverse", params, signal)
  return feature
    ? toPlace(feature).label
    : `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
}
