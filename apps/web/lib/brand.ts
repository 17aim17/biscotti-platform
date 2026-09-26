import type { CSSProperties } from "react"

// Restaurant branding stored in restaurants.theme (JSON).
export type Brand = {
  primary: string
  tagline: string | null
  heroImageUrl: string | null
}

const HEX = /^#[0-9a-fA-F]{6}$/

export function readBrand(theme: unknown): Brand {
  const t = (theme ?? {}) as Record<string, unknown>
  return {
    primary:
      typeof t.primary === "string" && HEX.test(t.primary)
        ? t.primary
        : "#c2410c",
    tagline: typeof t.tagline === "string" ? t.tagline : null,
    heroImageUrl: typeof t.heroImageUrl === "string" ? t.heroImageUrl : null,
  }
}

// CSS variables for one restaurant's pages. shadcn components use --primary,
// so buttons and focus rings pick up the brand color automatically.
export function brandStyle(brand: Brand): CSSProperties {
  return {
    "--brand": brand.primary,
    "--primary": brand.primary,
    "--primary-foreground": "#ffffff",
    "--ring": brand.primary,
  } as CSSProperties
}
