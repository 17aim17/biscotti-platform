import { THEME_PRESETS, type ThemePreset } from "@workspace/core"
import type { CSSProperties } from "react"

// Restaurant branding, stored in restaurants.theme (JSON):
//   { "preset": "classic", "primary": "#8a2c12", "accent": "#b08d57",
//     "tagline": "...", "heroImageUrl": "https://...", "logoUrl": "https://..." }
// A restaurant picks one of a few curated presets and two colors, so every
// combination still looks good. Components never use fixed colors; they read
// the --sf-* variables produced here.

// The preset names and the stored format belong to core; this file decides
// how each preset looks.
export const PRESETS = THEME_PRESETS
export type Preset = ThemePreset

export type Brand = {
  preset: Preset
  primary: string
  accent: string
  tagline: string | null
  heroImageUrl: string | null
  logoUrl: string | null
}

const HEX = /^#[0-9a-fA-F]{6}$/
const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null)
const hex = (v: unknown, fallback: string) =>
  typeof v === "string" && HEX.test(v) ? v : fallback

export function readBrand(theme: unknown): Brand {
  const t = (theme ?? {}) as Record<string, unknown>
  const preset = PRESETS.includes(t.preset as Preset)
    ? (t.preset as Preset)
    : "classic"
  return {
    preset,
    primary: hex(t.primary, "#8a2c12"),
    accent: hex(t.accent, "#b08d57"),
    tagline: str(t.tagline),
    heroImageUrl: str(t.heroImageUrl),
    logoUrl: str(t.logoUrl),
  }
}

type PresetStyle = {
  bg: string
  card: string
  ink: string
  muted: string
  line: string
  radiusCard: string
  radiusControl: string
  // Button fill. Always a background-image so solid and gradient presets
  // use the same class (a solid color is a one-color gradient).
  button: (b: Brand) => string
  buttonShadow: (b: Brand) => string
  // Button and small label lettering: case, letter spacing, size.
  buttonText: { case: "uppercase" | "none"; tracking: string; size: string }
  // Color of the outlined Add button.
  add: (b: Brand) => string
  cardShadow: string
  // Headline font; null keeps Fraunces.
  displayFont: string | null
  // Soft colored light behind the page (vibrant only).
  glows: boolean
}

const PRESET_STYLES: Record<Preset, PresetStyle> = {
  // Quiet luxury, like a printed menu: ivory paper, a high-contrast editorial
  // serif, near-square corners, hairlines instead of boxes, letterspaced caps.
  classic: {
    bg: "#f6f1e8",
    card: "#fffcf7",
    ink: "#1b1612",
    muted: "#6d6259",
    line: "rgb(27 22 18 / 0.12)",
    radiusCard: "0.25rem",
    radiusControl: "0.125rem",
    button: (b) => `linear-gradient(${b.primary}, ${b.primary})`,
    buttonShadow: () => "none",
    buttonText: { case: "uppercase", tracking: "0.18em", size: "0.72rem" },
    add: () => "#1b1612",
    cardShadow: "0 24px 60px -30px rgb(27 22 18 / 0.35)",
    displayFont: "var(--font-editorial)",
    glows: false,
  },
  // Clean and minimal: white, sans headlines, tighter corners.
  modern: {
    bg: "#ffffff",
    card: "#ffffff",
    ink: "#0a0a0a",
    muted: "#737373",
    line: "rgb(0 0 0 / 0.08)",
    radiusCard: "0.875rem",
    radiusControl: "0.75rem",
    button: (b) => `linear-gradient(${b.primary}, ${b.primary})`,
    buttonShadow: () => "none",
    buttonText: { case: "none", tracking: "0", size: "0.875rem" },
    add: (b) => b.primary,
    cardShadow: "0 1px 2px rgb(0 0 0 / 0.05)",
    displayFont: "var(--font-sans)",
    glows: false,
  },
  // Bright and playful: cream, gradients, colored shadows, big corners.
  vibrant: {
    bg: "#fffaf4",
    card: "#ffffff",
    ink: "#1c1917",
    muted: "#78716c",
    line: "rgb(67 20 7 / 0.1)",
    radiusCard: "1.5rem",
    radiusControl: "9999px",
    button: (b) => `linear-gradient(90deg, ${b.primary}, ${b.accent})`,
    buttonShadow: (b) =>
      `0 6px 16px -4px color-mix(in oklab, ${b.primary} 45%, transparent)`,
    buttonText: { case: "none", tracking: "0.01em", size: "0.875rem" },
    add: (b) => b.primary,
    cardShadow: "0 1px 2px rgb(67 20 7 / 0.05)",
    displayFont: null,
    glows: true,
  },
}

export function presetStyle(brand: Brand): PresetStyle {
  return PRESET_STYLES[brand.preset]
}

// CSS variables for one restaurant's pages. shadcn components use --primary
// and --ring, so they pick up the brand color too.
export function brandStyle(brand: Brand): CSSProperties {
  const p = PRESET_STYLES[brand.preset]
  return {
    "--brand": brand.primary,
    "--brand-accent": brand.accent,
    "--primary": brand.primary,
    "--primary-foreground": "#ffffff",
    "--ring": brand.primary,
    "--sf-bg": p.bg,
    "--sf-card": p.card,
    "--sf-ink": p.ink,
    "--sf-muted": p.muted,
    "--sf-line": p.line,
    "--sf-soft": `color-mix(in oklab, ${brand.primary} 8%, ${p.bg})`,
    "--sf-radius-card": p.radiusCard,
    "--sf-radius-control": p.radiusControl,
    "--sf-btn": p.button(brand),
    "--sf-btn-shadow": p.buttonShadow(brand),
    "--sf-shadow-card": p.cardShadow,
    // Accent darkened toward the text color, readable for small labels.
    "--sf-accent-ink": `color-mix(in oklab, ${brand.accent} 70%, ${p.ink})`,
    "--sf-add": p.add(brand),
    "--sf-btn-case": p.buttonText.case,
    "--sf-btn-tracking": p.buttonText.tracking,
    "--sf-btn-size": p.buttonText.size,
    ...(p.displayFont ? { "--font-display": p.displayFont } : {}),
  } as CSSProperties
}

// Biscotti's own pages (home, sign-in, account): the classic look in ink and
// brass, so they sit comfortably next to any restaurant's storefront.
export const PLATFORM_BRAND: Brand = readBrand({
  preset: "classic",
  primary: "#1b1612",
  accent: "#b08d57",
})
