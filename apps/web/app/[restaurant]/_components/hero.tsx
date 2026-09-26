import type { RestaurantSummary } from "@workspace/core"
import Image from "next/image"

import type { Brand } from "@/lib/brand"

export function Hero({
  restaurant,
  brand,
  vegCount,
}: {
  restaurant: RestaurantSummary
  brand: Brand
  vegCount: number
}) {
  const open = restaurant.locations.filter((l) => l.openNow)
  const pickup = restaurant.locations.some((l) => l.acceptsPickup)
  const facts = [
    `${restaurant.locations.length} ${restaurant.locations.length === 1 ? "outlet" : "outlets"}`,
    `${vegCount} vegetarian dishes`,
    pickup ? "Delivery & pickup" : "Delivery",
  ]

  return (
    <section className="relative isolate overflow-hidden rounded-(--sf-radius-card) bg-(--sf-ink) shadow-(--sf-shadow-card)">
      {brand.heroImageUrl && (
        <Image
          src={`${brand.heroImageUrl}?w=1800&q=80&auto=format&fit=crop`}
          alt=""
          fill
          priority
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="-z-10 object-cover"
        />
      )}
      {/* Keeps text readable on any photo, with a hint of the brand color. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/45 to-(--brand)/25" />

      <div className="flex min-h-[26rem] flex-col justify-end gap-6 p-7 sm:min-h-[32rem] sm:p-12">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium tracking-wide text-white ring-1 ring-white/20 backdrop-blur-md sm:text-sm">
          <span className="relative flex size-2">
            {open.length > 0 && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex size-2 rounded-full ${open.length > 0 ? "bg-emerald-400" : "bg-white/50"}`}
            />
          </span>
          {open.length > 0
            ? `Open now · ${open.map((l) => l.name).join(", ")}`
            : "Closed right now"}
        </span>

        <div className="max-w-2xl">
          <h1 className="font-display text-5xl leading-[1.02] font-semibold tracking-tight text-white sm:text-7xl">
            {restaurant.name}
          </h1>
          <div className="mt-5 h-px w-16 bg-(--brand-accent)" />
          {brand.tagline && (
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              {brand.tagline}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <a
            href="#menu"
            className="w-fit rounded-(--sf-radius-control) bg-(image:--sf-btn) px-7 py-3.5 text-sm font-semibold tracking-wide text-white shadow-(--sf-btn-shadow) transition hover:brightness-110"
          >
            Order now
          </a>
          <p className="text-sm text-white/75">{facts.join("  ·  ")}</p>
        </div>
      </div>
    </section>
  )
}
