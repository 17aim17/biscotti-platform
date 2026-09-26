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
    <footer className="mt-24 bg-(--sf-ink) text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
        <div>
          <p className="font-display text-3xl font-semibold text-white">
            {restaurant.name}
          </p>
          <div className="mt-4 h-px w-12 bg-(--brand-accent)" />
          <p className="mt-4 text-sm">Order direct from our kitchen.</p>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-white uppercase">
            Outlets
          </p>
          <ul className="space-y-3 text-sm">
            {restaurant.locations.map((l) => (
              <li key={l.id}>
                <span className="text-white/90">{l.name}</span>
                <span className="block text-white/50">{l.address}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-white uppercase">
            Information
          </p>
          <ul className="space-y-3 text-sm">
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-white/40">
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
