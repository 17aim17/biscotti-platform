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
      className="relative inline-flex size-10 items-center justify-center rounded-full text-(--sf-ink) transition hover:text-(--brand)"
    >
      <ShoppingBag className="size-5" strokeWidth={1.5} />
      {count > 0 && (
        // key={count} replays the pop animation each time the count changes.
        <span
          key={count}
          className="absolute top-0.5 right-0 flex h-4.5 min-w-4.5 animate-in items-center justify-center rounded-full bg-(--brand) px-1 text-[10px] font-semibold text-white tabular-nums duration-300 zoom-in-50"
        >
          {count}
        </span>
      )}
    </Link>
  )
}
