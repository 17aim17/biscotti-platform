import type { CSSProperties } from "react"

// Restaurant branding, stored in restaurants.theme (JSON):
//   { "preset": "classic", "primary": "#8a2c12", "accent": "#b08d57",
//     "tagline": "...", "heroImageUrl": "https://...", "logoUrl": "https://..." }
// A restaurant picks one of a few curated presets and two colors, so every
// combination still looks good. Components never use fixed colors; they read
// the --sf-* variables produced here.

export const PRESETS = ["classic", "modern", "vibrant"] as const
export type Preset = (typeof PRESETS)[number]

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
  cardShadow: string
  // Override for headline font; null keeps the serif (Fraunces).
  displayFont: string | null
  // Soft colored light behind the page (vibrant only).
  glows: boolean
}

const PRESET_STYLES: Record<Preset, PresetStyle> = {
  // Quiet luxury: ivory, serif headlines, solid colors, hairlines, soft depth.
  classic: {
    bg: "#faf6ef",
    card: "#ffffff",
    ink: "#1f1a17",
    muted: "#6f655c",
    line: "rgb(60 40 20 / 0.10)",
    radiusCard: "1.25rem",
    radiusControl: "9999px",
    button: (b) => `linear-gradient(${b.primary}, ${b.primary})`,
    buttonShadow: () => "0 1px 2px rgb(0 0 0 / 0.08)",
    cardShadow:
      "0 1px 2px rgb(28 20 12 / 0.04), 0 12px 28px -16px rgb(28 20 12 / 0.18)",
    displayFont: null,
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
    line: "rgb(67 20 7 / 0.08)",
    radiusCard: "1.5rem",
    radiusControl: "9999px",
    button: (b) => `linear-gradient(90deg, ${b.primary}, ${b.accent})`,
    buttonShadow: (b) =>
      `0 6px 16px -4px color-mix(in oklab, ${b.primary} 45%, transparent)`,
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
    ...(p.displayFont ? { "--font-display": p.displayFont } : {}),
  } as CSSProperties
}
