import type { RestaurantSummary } from "@workspace/core"
import Image from "next/image"

import type { Brand } from "@/lib/brand"

import { eyebrow, solidButton } from "@/components/styles"

// Full-width photo with the restaurant's name set large, then a row of facts.
export function Hero({
  restaurant,
  brand,
  hasSignatures,
}: {
  restaurant: RestaurantSummary
  brand: Brand
  hasSignatures: boolean
}) {
  return (
    <section className="relative isolate flex min-h-[36rem] items-end overflow-hidden bg-(--sf-ink) text-white sm:min-h-[min(46rem,86svh)]">
      {brand.heroImageUrl && (
        <Image
          src={`${brand.heroImageUrl}?w=2400&q=80&auto=format&fit=crop`}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 animate-in object-cover duration-[2000ms] ease-out fade-in zoom-in-110"
        />
      )}
      {/* Darkens the bottom for the text and the edges for depth. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/55 to-black/25" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_70%,rgb(0_0_0/0.35),transparent_60%)]" />

      <div className="mx-auto flex w-full max-w-4xl animate-in flex-col items-center px-6 pb-16 text-center duration-1000 fade-in slide-in-from-bottom-4 sm:pb-24">
        <p className={`${eyebrow} flex items-center gap-4 text-white/80`}>
          <span className="hidden h-px w-10 bg-(--brand-accent) sm:block" />
          {restaurant.locations.map((l) => l.name).join("  ·  ")}
          <span className="hidden h-px w-10 bg-(--brand-accent) sm:block" />
        </p>
        <h1 className="mt-6 font-display text-6xl leading-[0.9] font-medium tracking-tight sm:text-8xl lg:text-[9rem]">
          {restaurant.name}
        </h1>
        {brand.tagline && (
          <p className="mt-7 max-w-xl font-display text-xl leading-snug text-white/85 italic sm:text-2xl">
            {brand.tagline}
          </p>
        )}
        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <a href="#menu" className={`${solidButton} px-9 py-4`}>
            Order online
          </a>
          {hasSignatures && (
            <a
              href="#signatures"
              className={`${eyebrow} border-b border-white/40 pb-1 text-white/85 transition hover:border-white hover:text-white`}
            >
              Our signatures
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

// Four short facts under the hero, separated by hairlines.
export function Facts({
  restaurant,
  dishCount,
  vegCount,
}: {
  restaurant: RestaurantSummary
  dishCount: number
  vegCount: number
}) {
  const open = restaurant.locations.filter((l) => l.openNow)
  const pickup = restaurant.locations.some((l) => l.acceptsPickup)
  const facts: [string, React.ReactNode][] = [
    [
      "Today",
      <span key="open" className="inline-flex items-center gap-2">
        <span
          className={`size-1.5 rounded-full ${open.length > 0 ? "bg-emerald-600" : "bg-(--sf-muted)"}`}
        />
        {open.length > 0 ? "Open now" : "Closed"}
      </span>,
    ],
    [
      "Kitchens",
      `${restaurant.locations.length} ${restaurant.locations.length === 1 ? "outlet" : "outlets"}`,
    ],
    ["Service", pickup ? "Delivery & pickup" : "Delivery"],
    ["The menu", `${dishCount} dishes, ${vegCount} veg`],
  ]
  return (
    <section className="border-b border-(--sf-line)">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">
        {facts.map(([label, value], i) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-2 px-3 py-7 text-center sm:py-9 ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""} border-(--sf-line)`}
          >
            <dt className={`${eyebrow} text-(--sf-muted)`}>{label}</dt>
            <dd className="font-display text-xl leading-tight sm:text-2xl">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
