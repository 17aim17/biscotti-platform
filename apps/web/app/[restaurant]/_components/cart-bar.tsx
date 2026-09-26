"use client"

import type { MenuCategory } from "@workspace/core"
import { buttonVariants } from "@workspace/ui/components/button"
import Link from "next/link"
import { useMemo } from "react"

import { useCart } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

// Fixed at the bottom of the storefront once the cart has something in it.
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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="text-sm">
          {count} {count === 1 ? "item" : "items"} ·{" "}
          <span className="font-medium tabular-nums">
            {formatRupees(subtotal)}
          </span>
        </p>
        <Link href={`/${slug}/cart`} className={buttonVariants()}>
          View cart
        </Link>
      </div>
    </div>
  )
}
