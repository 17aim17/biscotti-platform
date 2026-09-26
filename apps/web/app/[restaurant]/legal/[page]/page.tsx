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
    <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-(--sf-radius-card) bg-(--sf-card) p-8 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) sm:p-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {PAGES[page]}
      </h1>
      <p className="leading-relaxed whitespace-pre-line text-(--sf-muted)">
        {text ?? `${restaurant.name} has not published this page yet.`}
      </p>
      <nav className="flex flex-wrap gap-2 border-t border-(--sf-line) pt-6">
        {(Object.keys(PAGES) as LegalPage[])
          .filter((p) => p !== page)
          .map((p) => (
            <Link
              key={p}
              href={`/${restaurant.slug}/legal/${p}`}
              className="rounded-(--sf-radius-control) bg-(--sf-soft) px-4 py-1.5 text-sm font-medium text-(--sf-ink) transition hover:brightness-95"
            >
              {PAGES[p]}
            </Link>
          ))}
      </nav>
    </article>
  )
}
