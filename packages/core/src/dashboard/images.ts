import { DomainError } from "../errors"
import { env } from "../env"

// Photos a restaurant may use: its own folder in our Storage bucket (uploads
// from the dashboard), or Unsplash (the demo photos). Anything else could
// point anywhere, and would also break next/image, which only loads from
// these two places.
export function assertImageUrl(url: string | null, restaurantId: string) {
  if (url === null) return
  const ownFolder = `${env.supabaseUrl()}/storage/v1/object/public/menu-images/${restaurantId}/`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new DomainError("INVALID_INPUT", "That photo link is not valid.")
  }
  const unsplash =
    parsed.protocol === "https:" && parsed.hostname === "images.unsplash.com"
  if (!url.startsWith(ownFolder) && !unsplash) {
    throw new DomainError(
      "INVALID_INPUT",
      "Upload the photo here instead of linking to it."
    )
  }
}
