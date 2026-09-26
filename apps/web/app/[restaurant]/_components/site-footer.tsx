import type { RestaurantSummary } from "@workspace/core"
import Link from "next/link"

import { Ornament } from "./section-heading"
import { eyebrow } from "./styles"

const LEGAL = [
  ["about", "About"],
  ["privacy", "Privacy"],
  ["refund", "Refunds"],
  ["terms", "Terms"],
] as const

export function SiteFooter({ restaurant }: { restaurant: RestaurantSummary }) {
  return (
    <footer id="visit" className="mt-28 bg-(--sf-ink) text-white/60">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <div className="flex flex-col items-center text-center">
          <p className={`${eyebrow} text-(--brand-accent)`}>Visit us</p>
          <p className="mt-4 font-display text-5xl font-medium tracking-tight text-white sm:text-6xl">
            {restaurant.name}
          </p>
          <Ornament className="mt-6 text-(--brand-accent)" />
        </div>

        <ul className="mt-16 grid gap-10 text-center sm:grid-cols-3">
          {restaurant.locations.map((l) => (
            <li key={l.id} className="flex flex-col items-center gap-2">
              <span className="font-display text-2xl text-white">{l.name}</span>
              <span className="text-sm">{l.address}</span>
              <span
                className={`${eyebrow} mt-1 flex items-center gap-2 text-[0.6rem]`}
              >
                <span
                  className={`size-1.5 rounded-full ${l.openNow ? "bg-emerald-400" : "bg-white/30"}`}
                />
                {l.openNow ? "Open now" : "Closed"}
              </span>
            </li>
          ))}
        </ul>

        <nav className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-10">
          {LEGAL.map(([page, label]) => (
            <Link
              key={page}
              href={`/${restaurant.slug}/legal/${page}`}
              className={`${eyebrow} transition hover:text-white`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-col items-center gap-2 text-xs text-white/35">
          {(restaurant.gstin || restaurant.fssaiLicense) && (
            <span>
              {restaurant.gstin && <>GSTIN {restaurant.gstin}</>}
              {restaurant.gstin && restaurant.fssaiLicense && " · "}
              {restaurant.fssaiLicense && (
                <>FSSAI Lic. {restaurant.fssaiLicense}</>
              )}
            </span>
          )}
          <span>Powered by Biscotti</span>
        </div>
      </div>
    </footer>
  )
}
