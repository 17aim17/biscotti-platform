import { eyebrow } from "@/components/styles"

// Centered section title: small label, large serif heading, a thin ornament.
export function SectionHeading({
  eyebrow: label,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className={`${eyebrow} text-(--sf-accent-ink)`}>{label}</p>
      <h2 className="mt-4 font-display text-5xl leading-none font-medium tracking-tight sm:text-6xl">
        {title}
      </h2>
      <Ornament className="mt-6 text-(--brand-accent)" />
      {children && (
        <p className="mt-6 max-w-xl leading-relaxed text-(--sf-muted)">
          {children}
        </p>
      )}
    </div>
  )
}

// Hairline, diamond, hairline.
export function Ornament({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`flex items-center gap-3 ${className ?? ""}`}>
      <span className="h-px w-10 bg-current" />
      <span className="size-1.5 rotate-45 bg-current" />
      <span className="h-px w-10 bg-current" />
    </span>
  )
}
