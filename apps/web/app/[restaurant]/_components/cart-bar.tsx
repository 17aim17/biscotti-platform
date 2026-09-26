"use client"

import type { MenuCategory } from "@workspace/core"
import { ArrowRight, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { useCart } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

// Floating pill at the bottom of the storefront once the cart has something in it.
export function CartBar({
  slug,
  categories,
}: {
  slug: string
  categories: MenuCategory[]
}) {
  const { cart, count } = useCart(slug)
  const prices = useMemo(
    () =>
      new Map(
        categories.flatMap((c) =>
          c.menuItems.map((d) => [d.id, d.pricePaise] as const)
        )
      ),
    [categories]
  )
  if (count === 0) return null

  const subtotal = cart.lines.reduce(
    (sum, l) => sum + (prices.get(l.menuItemId) ?? 0) * l.qty,
    0
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 animate-in px-3 pb-[max(1rem,env(safe-area-inset-bottom))] duration-300 fade-in slide-in-from-bottom-6">
      <Link
        href={`/${slug}/cart`}
        className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-full bg-linear-to-r from-(--brand) to-amber-500 py-2.5 pr-3 pl-3 text-white shadow-(--brand)/40 shadow-2xl transition hover:scale-[1.02]"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex size-10 items-center justify-center rounded-full bg-white/20">
            <ShoppingBag className="size-5" />
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-(--brand)">
              {count}
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-white/80">
              {count === 1 ? "1 item" : `${count} items`}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatRupees(subtotal)}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-(--brand)">
          View cart <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  )
}
