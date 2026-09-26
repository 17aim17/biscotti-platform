// Only follow ?next= paths on this site. Anything else ("https://evil.example",
// "//evil.example") falls back to the home page, so a crafted login link
// cannot send someone to another site after they sign in.
export function safeNextPath(
  next: string | undefined | null,
  fallback = "/"
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return fallback
  }
  return next
}
