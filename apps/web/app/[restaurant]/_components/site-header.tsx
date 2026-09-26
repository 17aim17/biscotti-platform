import { UserRound } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { CartButton } from "./cart-button"
import { eyebrow } from "./styles"

// Full-width bar with the restaurant's wordmark in the middle.
export function SiteHeader({
  name,
  slug,
  logoUrl,
}: {
  name: string
  slug: string
  logoUrl: string | null
}) {
  const link = `${eyebrow} text-(--sf-muted) transition hover:text-(--sf-ink)`
  return (
    <header className="sticky top-0 z-30 border-b border-(--sf-line) bg-(--sf-bg)/85 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:h-20">
        <nav className="flex items-center gap-7">
          <Link href={`/${slug}#menu`} className={link}>
            Menu
          </Link>
          <Link href={`/${slug}#visit`} className={`${link} hidden sm:inline`}>
            Visit
          </Link>
        </nav>
        <Link href={`/${slug}`} className="flex items-center gap-3">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          )}
          <span className="font-display text-2xl leading-none font-medium tracking-tight sm:text-3xl">
            {name}
          </span>
        </Link>
        <div className="flex items-center justify-end gap-1">
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex size-10 items-center justify-center rounded-full text-(--sf-muted) transition hover:text-(--sf-ink)"
          >
            <UserRound className="size-5" strokeWidth={1.5} />
          </Link>
          <CartButton slug={slug} />
        </div>
      </div>
    </header>
  )
}
