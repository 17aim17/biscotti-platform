import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getRestaurantOr404 } from "@/lib/restaurant"

const PAGES = {
  about: "About us",
  privacy: "Privacy policy",
  refund: "Refund policy",
  terms: "Terms of service",
} as const

type LegalPage = keyof typeof PAGES
const isLegalPage = (page: string): page is LegalPage => page in PAGES

export async function generateMetadata({
  params,
}: PageProps<"/[restaurant]/legal/[page]">): Promise<Metadata> {
  const { page } = await params
  return { title: isLegalPage(page) ? PAGES[page] : "Not found" }
}

// The restaurant's own legal pages, stored in restaurants.legal.
export default async function LegalPageView({
  params,
}: PageProps<"/[restaurant]/legal/[page]">) {
  const { restaurant: slug, page } = await params
  if (!isLegalPage(page)) notFound()
  const restaurant = await getRestaurantOr404(slug)
  const legal = (restaurant.legal ?? {}) as Record<string, unknown>
  const text = typeof legal[page] === "string" ? legal[page] : null

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-orange-950/5 sm:p-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {PAGES[page]}
      </h1>
      <p className="leading-relaxed whitespace-pre-line text-stone-600">
        {text ?? `${restaurant.name} has not published this page yet.`}
      </p>
      <nav className="flex flex-wrap gap-2 border-t border-orange-950/5 pt-6">
        {(Object.keys(PAGES) as LegalPage[])
          .filter((p) => p !== page)
          .map((p) => (
            <Link
              key={p}
              href={`/${restaurant.slug}/legal/${p}`}
              className="rounded-full bg-orange-50 px-4 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-orange-100"
            >
              {PAGES[p]}
            </Link>
          ))}
      </nav>
    </article>
  )
}
