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
      className="relative inline-flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:shadow-md"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--brand) px-1 text-[11px] font-semibold text-white ring-2 ring-white">
          {count}
        </span>
      )}
    </Link>
  )
}
