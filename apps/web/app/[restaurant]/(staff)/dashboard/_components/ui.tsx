import { eyebrow } from "@/components/styles"

// Shared pieces for dashboard pages.

export function PageTitle({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-(--sf-ink)/80 pb-4">
      <h1 className="font-display text-4xl leading-none font-medium tracking-tight sm:text-5xl">
        {title}
      </h1>
      {children}
    </div>
  )
}

export function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={`${eyebrow} text-(--sf-muted)`}>{label}</span>
      {children}
      {hint && <span className="text-xs text-(--sf-muted)">{hint}</span>}
    </label>
  )
}

export const outlineButton = `${eyebrow} inline-flex h-10 items-center justify-center gap-2 rounded-(--sf-radius-control) px-4 text-(--sf-ink) ring-1 ring-(--sf-ink) transition hover:bg-(--sf-ink) hover:text-(--sf-bg) disabled:opacity-50`
