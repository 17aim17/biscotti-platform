"use client"

import type { MenuCategory } from "@workspace/core"
import { ArrowRight, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo } from "react"

import { useCart } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { solidButton } from "@/components/styles"

// Floating bar at the bottom of the storefront once the cart has something in it.
export function CartBar({
  slug,
  categories,
}: {
  slug: string
  categories: MenuCategory[]
}) {
  const { cart, count, prune } = useCart(slug)
  // Prices of dishes that can be ordered now. Sold-out dishes stay in the
  // cart (the cart page shows them) but do not count toward the total.
  const prices = useMemo(
    () =>
      new Map(
        categories.flatMap((c) =>
          c.menuItems
            .filter((d) => d.isAvailable)
            .map((d) => [d.id, d.pricePaise] as const)
        )
      ),
    [categories]
  )
  // Every dish still on the menu, sold out or not.
  const onMenu = useMemo(
    () => new Set(categories.flatMap((c) => c.menuItems.map((d) => d.id))),
    [categories]
  )
  // Remove dishes that left the menu since they were added (this browser's cart
  // can be days old).
  useEffect(() => {
    prune(onMenu)
    // prune is recreated each render; running when the menu changes is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMenu])

  if (count === 0) return null

  const subtotal = cart.lines.reduce(
    (sum, l) => sum + (prices.get(l.menuItemId) ?? 0) * l.qty,
    0
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 animate-in px-3 pb-[max(1rem,env(safe-area-inset-bottom))] duration-300 fade-in slide-in-from-bottom-6">
      <Link
        href={`/${slug}/cart`}
        className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-(--sf-radius-control) bg-(--sf-ink) py-2.5 pr-3 pl-3 text-white shadow-2xl transition hover:scale-[1.01]"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex size-10 items-center justify-center rounded-full bg-white/10">
            <ShoppingBag className="size-5" />
            <span
              key={count}
              className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-in items-center justify-center rounded-full bg-(--brand-accent) px-1 text-[11px] font-bold text-(--sf-ink) duration-300 zoom-in-50"
            >
              {count}
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.68rem] tracking-[0.2em] text-white/60 uppercase">
              {count === 1 ? "1 item" : `${count} items`}
            </span>
            <span
              key={subtotal}
              className="animate-in font-display text-xl font-medium tabular-nums duration-300 fade-in"
            >
              {formatRupees(subtotal)}
            </span>
          </span>
        </span>
        <span className={`${solidButton} px-5 py-3`}>
          View cart <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  )
}
