import { UserRound } from "lucide-react"
import Link from "next/link"

import { CartButton } from "./cart-button"

export function SiteHeader({ name, slug }: { name: string; slug: string }) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/60 bg-white/75 py-2 pr-2 pl-3 shadow-lg shadow-orange-900/5 backdrop-blur-xl">
        <Link href={`/${slug}`} className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-(--brand) to-amber-400 font-display text-lg font-bold text-white shadow-inner">
            {name.charAt(0)}
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            {name}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href={`/${slug}#menu`}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 sm:block"
          >
            Menu
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex size-10 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <UserRound className="size-5" />
          </Link>
          <CartButton slug={slug} />
        </nav>
      </div>
    </header>
  )
}
