"use client"

import { cn } from "@workspace/ui/lib/utils"
import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { inputClass, solidButton } from "@/components/styles"
import { callAction } from "@/lib/call-action"

import { ImageField } from "../_image-field"
import { FieldLabel } from "../_ui"
import { saveSettingsAction } from "../actions"

type Preset = string
type Theme = {
  preset: Preset
  primary: string
  accent: string
  tagline: string | null
  heroImageUrl: string | null
  logoUrl: string | null
}
type Legal = { about: string; privacy: string; refund: string; terms: string }
type Settings = {
  name: string
  theme: Theme
  legal: Legal
  gstin: string
  fssaiLicense: string
}

const PRESET_INFO: Record<string, { label: string; about: string }> = {
  classic: {
    label: "Classic",
    about: "Ivory paper, an editorial serif, fine lines. Quiet and upscale.",
  },
  modern: {
    label: "Modern",
    about: "White, sans-serif headings, clean corners. Minimal.",
  },
  vibrant: {
    label: "Vibrant",
    about: "Warm cream, colour gradients, round corners. Bright and playful.",
  },
}

const LEGAL_PAGES: { key: keyof Legal; label: string }[] = [
  { key: "about", label: "About" },
  { key: "privacy", label: "Privacy policy" },
  { key: "refund", label: "Refund policy" },
  { key: "terms", label: "Terms of service" },
]

export function SettingsForm({
  slug,
  presets,
  initial,
}: {
  slug: string
  presets: Preset[]
  initial: Settings
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  )
  const [s, setS] = useState(initial)
  const setTheme = (change: Partial<Theme>) =>
    setS((v) => ({ ...v, theme: { ...v.theme, ...change } }))

  function save(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    start(async () => {
      const result = await callAction(() =>
        saveSettingsAction(slug, {
          ...s,
          theme: { ...s.theme, tagline: s.theme.tagline?.trim() || null },
        })
      )
      setMessage(
        result.ok
          ? { ok: true, text: "Saved. The storefront shows the changes now." }
          : { ok: false, text: result.error }
      )
      if (result.ok) router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-12">
      <Section title="Restaurant">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Name">
            <input
              value={s.name}
              onChange={(e) => setS({ ...s, name: e.target.value })}
              maxLength={60}
              required
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel
            label="Tagline"
            hint="One line under the name on the storefront."
          >
            <input
              value={s.theme.tagline ?? ""}
              onChange={(e) => setTheme({ tagline: e.target.value })}
              maxLength={140}
              className={inputClass}
            />
          </FieldLabel>
        </div>
      </Section>

      <Section title="Look">
        <div className="grid gap-3 sm:grid-cols-3">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={s.theme.preset === p}
              onClick={() => setTheme({ preset: p })}
              className={cn(
                "flex flex-col gap-1 rounded-(--sf-radius-card) bg-(--sf-card) p-4 text-left ring-1 transition",
                s.theme.preset === p
                  ? "ring-2 ring-(--sf-ink)"
                  : "ring-(--sf-line) hover:ring-(--sf-muted)"
              )}
            >
              <span className="font-display text-xl">
                {PRESET_INFO[p]?.label ?? p}
              </span>
              <span className="text-xs text-(--sf-muted)">
                {PRESET_INFO[p]?.about}
              </span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColourField
            label="Main colour"
            hint="Buttons and highlights."
            value={s.theme.primary}
            onChange={(primary) => setTheme({ primary })}
          />
          <ColourField
            label="Accent colour"
            hint="Fine lines and small labels."
            value={s.theme.accent}
            onChange={(accent) => setTheme({ accent })}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
          <ImageField
            slug={slug}
            label="Hero photo"
            value={s.theme.heroImageUrl}
            onChange={(heroImageUrl) => setTheme({ heroImageUrl })}
            aspect="aspect-[16/9]"
          />
          <ImageField
            slug={slug}
            label="Logo (optional)"
            value={s.theme.logoUrl}
            onChange={(logoUrl) => setTheme({ logoUrl })}
            aspect="aspect-square"
          />
        </div>
      </Section>

      <Section title="Legal">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="GSTIN" hint="15 characters. Shown in the footer.">
            <input
              value={s.gstin}
              onChange={(e) => setS({ ...s, gstin: e.target.value })}
              maxLength={15}
              className={`${inputClass} uppercase`}
            />
          </FieldLabel>
          <FieldLabel
            label="FSSAI licence"
            hint="14 digits. Shown in the footer."
          >
            <input
              value={s.fssaiLicense}
              onChange={(e) => setS({ ...s, fssaiLicense: e.target.value })}
              maxLength={14}
              inputMode="numeric"
              className={inputClass}
            />
          </FieldLabel>
        </div>
        {LEGAL_PAGES.map(({ key, label }) => (
          <FieldLabel key={key} label={label}>
            <textarea
              value={s.legal[key]}
              onChange={(e) =>
                setS({ ...s, legal: { ...s.legal, [key]: e.target.value } })
              }
              rows={4}
              maxLength={10_000}
              className={`${inputClass} h-auto py-3`}
            />
          </FieldLabel>
        ))}
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-4 border-t border-(--sf-line) bg-(--sf-bg)/95 px-4 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className={`${solidButton} h-12 px-8 disabled:opacity-60`}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            "Save settings"
          )}
        </button>
        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? "text-emerald-700" : "text-(--brand)"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="border-b border-(--sf-line) pb-3 font-display text-3xl font-medium">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ColourField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FieldLabel label={label} hint={hint}>
      <span className="flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
          className="h-12 w-14 cursor-pointer rounded-(--sf-radius-control) bg-(--sf-card) p-1 ring-1 ring-(--sf-line)"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className={`${inputClass} font-mono uppercase`}
        />
      </span>
    </FieldLabel>
  )
}
