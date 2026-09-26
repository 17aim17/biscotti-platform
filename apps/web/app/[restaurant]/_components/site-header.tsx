import { UserRound } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { CartButton } from "./cart-button"

export function SiteHeader({
  name,
  slug,
  logoUrl,
}: {
  name: string
  slug: string
  logoUrl: string | null
}) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-(--sf-card)/80 py-2 pr-2 pl-3 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) backdrop-blur-xl">
        <Link href={`/${slug}`} className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-(--brand) font-display text-lg font-semibold text-white">
              {name.charAt(0)}
            </span>
          )}
          <span className="font-display text-xl font-semibold tracking-tight">
            {name}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href={`/${slug}#menu`}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-(--sf-muted) transition hover:bg-(--sf-soft) hover:text-(--sf-ink) sm:block"
          >
            Menu
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex size-10 items-center justify-center rounded-full text-(--sf-muted) transition hover:bg-(--sf-soft) hover:text-(--sf-ink)"
          >
            <UserRound className="size-5" />
          </Link>
          <CartButton slug={slug} />
        </nav>
      </div>
    </header>
  )
}
