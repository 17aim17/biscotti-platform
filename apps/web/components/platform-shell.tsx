import Link from "next/link"

import { brandStyle, PLATFORM_BRAND, type Brand } from "@/lib/brand"

import { eyebrow } from "./styles"

// Frame for pages outside a restaurant (home, sign-in, account, not found).
// Pass a restaurant's brand to dress a page in its colours, e.g. sign-in
// reached from that restaurant's checkout.
export function PlatformShell({
  brand = PLATFORM_BRAND,
  title = "Biscotti",
  titleHref = "/",
  children,
}: {
  brand?: Brand
  title?: string
  titleHref?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={brandStyle(brand)}
      className="flex min-h-svh flex-col bg-(--sf-bg) text-(--sf-ink)"
    >
      <header className="border-b border-(--sf-line)">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-4 sm:h-20">
          <Link
            href={titleHref}
            className="font-display text-2xl font-medium tracking-tight sm:text-3xl"
          >
            {title}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-(--sf-line) py-8 text-center">
        <p className={`${eyebrow} text-[0.6rem] text-(--sf-muted)`}>
          Powered by Biscotti
        </p>
      </footer>
    </div>
  )
}
