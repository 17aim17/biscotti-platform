import type { RestaurantSummary } from "@workspace/core"
import Link from "next/link"

const LEGAL = [
  ["about", "About"],
  ["privacy", "Privacy"],
  ["refund", "Refunds"],
  ["terms", "Terms"],
] as const

export function SiteFooter({ restaurant }: { restaurant: RestaurantSummary }) {
  return (
    <footer className="mt-20 bg-stone-950 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-semibold text-white">
            {restaurant.name}
          </p>
          <p className="mt-2 text-sm text-stone-400">
            Order direct from our kitchen.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-white uppercase">
            Outlets
          </p>
          <ul className="space-y-2 text-sm">
            {restaurant.locations.map((l) => (
              <li key={l.id}>
                <span className="text-stone-200">{l.name}</span>
                <span className="block text-stone-500">{l.address}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-white uppercase">
            Information
          </p>
          <ul className="space-y-2 text-sm">
            {LEGAL.map(([page, label]) => (
              <li key={page}>
                <Link
                  href={`/${restaurant.slug}/legal/${page}`}
                  className="transition hover:text-white"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-stone-500">
          <span>
            {restaurant.gstin && <>GSTIN {restaurant.gstin} · </>}
            {restaurant.fssaiLicense && (
              <>FSSAI Lic. {restaurant.fssaiLicense}</>
            )}
          </span>
          <span>Powered by Biscotti</span>
        </div>
      </div>
    </footer>
  )
}
