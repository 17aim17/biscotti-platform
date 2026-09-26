export type Coordinates = { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000

// Straight-line ("as the crow flies") distance using the haversine formula.
// Road distance is longer, but for a delivery radius of a few km this is the
// usual approximation and needs no maps API.
export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function isWithinRadius(
  outlet: Coordinates,
  customer: Coordinates,
  radiusM: number
): boolean {
  return distanceInMeters(outlet, customer) <= radiusM
}
