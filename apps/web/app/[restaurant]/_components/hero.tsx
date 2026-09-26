import type { RestaurantSummary } from "@workspace/core"
import { Bike, Leaf, MapPin, ShoppingBag } from "lucide-react"
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

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-stone-900 shadow-2xl shadow-orange-900/20">
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
      {/* Warm overlay so text stays readable on any photo. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-stone-950/90 via-stone-900/55 to-(--brand)/35" />

      <div className="flex min-h-[26rem] flex-col justify-end gap-5 p-6 sm:min-h-[30rem] sm:p-10">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur-md">
          <span className="relative flex size-2.5">
            {open.length > 0 && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex size-2.5 rounded-full ${open.length > 0 ? "bg-emerald-400" : "bg-stone-400"}`}
            />
          </span>
          {open.length > 0
            ? `Open now · ${open.map((l) => l.name).join(", ")}`
            : "Closed right now"}
        </span>

        <div className="max-w-2xl">
          <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight text-white sm:text-7xl">
            {restaurant.name}
          </h1>
          {brand.tagline && (
            <p className="mt-4 max-w-xl text-lg text-white/85 sm:text-xl">
              {brand.tagline}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#menu"
            className="rounded-full bg-linear-to-r from-(--brand) to-amber-500 px-6 py-3 text-base font-semibold text-white shadow-(--brand)/40 shadow-lg transition hover:scale-[1.03] hover:shadow-xl"
          >
            Order now
          </a>
          <Chip icon={<MapPin className="size-4" />}>
            {restaurant.locations.length}{" "}
            {restaurant.locations.length === 1 ? "outlet" : "outlets"}
          </Chip>
          <Chip icon={<Leaf className="size-4" />}>{vegCount} veg dishes</Chip>
          <Chip
            icon={
              pickup ? (
                <ShoppingBag className="size-4" />
              ) : (
                <Bike className="size-4" />
              )
            }
          >
            {pickup ? "Delivery & pickup" : "Delivery"}
          </Chip>
        </div>
      </div>
    </section>
  )
}

function Chip({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md sm:text-sm">
      {icon}
      {children}
    </span>
  )
}
