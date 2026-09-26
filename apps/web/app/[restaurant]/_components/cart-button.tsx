"use client"

import { ShoppingBag } from "lucide-react"
import Link from "next/link"

import { useCart } from "@/lib/cart/store"

export function CartButton({ slug }: { slug: string }) {
  const { count } = useCart(slug)
  return (
    <Link
      href={`/${slug}/cart`}
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
      className="relative inline-flex size-10 items-center justify-center rounded-full bg-(--sf-soft) text-(--sf-ink) transition hover:scale-105"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        // key={count} replays the pop animation each time the count changes.
        <span
          key={count}
          className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-in items-center justify-center rounded-full bg-(--brand) px-1 text-[11px] font-semibold text-white ring-2 ring-(--sf-card) duration-300 zoom-in-50"
        >
          {count}
        </span>
      )}
    </Link>
  )
}
