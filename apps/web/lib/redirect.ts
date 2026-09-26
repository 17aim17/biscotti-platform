// Only follow ?next= paths on this site, so a crafted login link cannot send
// someone to another site after they sign in. The value is resolved the way a
// browser would resolve it: checking only the first characters misses tricks
// like "/\t/evil.example", which browsers read as "//evil.example".
const BASE = "http://this-site.invalid"

export function safeNextPath(
  next: string | undefined | null,
  fallback = "/"
): string {
  if (!next || !next.startsWith("/")) return fallback
  let url: URL
  try {
    url = new URL(next, BASE)
  } catch {
    return fallback
  }
  if (url.origin !== BASE) return fallback
  return `${url.pathname}${url.search}${url.hash}`
}
