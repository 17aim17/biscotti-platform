"use client"

import type { MenuCategory } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeft, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"

import { eyebrow, solidButton } from "@/components/styles"
import { useCart } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { DietMark } from "@/components/diet-mark"
import { QuantityControl } from "../_components/quantity-control"

// The cart: dishes and quantities. Outlet, delivery or pickup, address and
// payment are chosen at checkout, where the server prices the order.
export function CartView({
  slug,
  categories,
}: {
  slug: string
  categories: MenuCategory[]
}) {
  const { cart, count, add, decrement, setQty } = useCart(slug)
  const dishes = useMemo(
    () =>
      new Map(
        categories.flatMap((c) => c.menuItems.map((d) => [d.id, d] as const))
      ),
    [categories]
  )

  if (count === 0) {
    return (
      <section className="flex flex-col items-center gap-6 py-24 text-center">
        <p className={`${eyebrow} text-(--sf-accent-ink)`}>Your cart</p>
        <h1 className="font-display text-5xl font-medium tracking-tight">
          Nothing here yet
        </h1>
        <p className="text-(--sf-muted)">
          Add a few dishes from the menu to get started.
        </p>
        <Link href={`/${slug}#menu`} className={`${solidButton} px-8 py-3.5`}>
          Browse the menu
        </Link>
      </section>
    )
  }

  // A dish can disappear or sell out after it was added (the cart is only in
  // this browser). Show it so the customer knows, but don't count it.
  const lines = cart.lines.map((line) => ({
    line,
    dish: dishes.get(line.menuItemId),
  }))
  const orderable = lines.filter(({ dish }) => dish?.isAvailable)
  const subtotal = orderable.reduce(
    (sum, { line, dish }) => sum + dish!.pricePaise * line.qty,
    0
  )

  return (
    <div className="flex flex-col gap-10 pb-16">
      <div className="flex flex-col gap-4">
        <Link
          href={`/${slug}#menu`}
          className={`${eyebrow} inline-flex w-fit items-center gap-2 text-(--sf-muted) transition hover:text-(--sf-ink)`}
        >
          <ArrowLeft className="size-3.5" /> Back to the menu
        </Link>
        <h1 className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
          Your cart
        </h1>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <section>
          <div className="flex items-baseline justify-between border-b border-(--sf-ink)/80 pb-3">
            <h2 className="font-display text-3xl font-medium">Dishes</h2>
            <span className={`${eyebrow} text-(--sf-muted)`}>
              {count} {count === 1 ? "item" : "items"}
            </span>
          </div>
          <ul className="divide-y divide-(--sf-line)">
            {lines.map(({ line, dish }) => (
              <li
                key={line.menuItemId}
                className="flex items-center gap-4 py-5"
              >
                <span className="relative size-18 shrink-0 overflow-hidden rounded-(--sf-radius-card) bg-(--sf-soft)">
                  {dish?.imageUrl && (
                    <Image
                      src={`${dish.imageUrl}?w=200&h=200&q=70&auto=format&fit=crop`}
                      alt=""
                      fill
                      sizes="72px"
                      className={cn(
                        "object-cover",
                        !dish.isAvailable && "grayscale"
                      )}
                    />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {dish ? (
                    <>
                      <span className="flex items-center gap-2">
                        <DietMark isVeg={dish.isVeg} />
                        <span className="truncate font-display text-xl">
                          {dish.title}
                        </span>
                      </span>
                      <span className="text-sm text-(--sf-muted) tabular-nums">
                        {dish.isAvailable
                          ? `${formatRupees(dish.pricePaise)} each`
                          : "Sold out right now"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-(--sf-muted)">
                      This dish is no longer on the menu.
                    </span>
                  )}
                </div>
                {dish?.isAvailable ? (
                  <div className="flex flex-col items-end gap-2">
                    <QuantityControl
                      soldOut={false}
                      qty={line.qty}
                      title={dish.title}
                      onAdd={() => add(line.menuItemId)}
                      onRemove={() => decrement(line.menuItemId)}
                    />
                    <span className="font-display text-lg tabular-nums">
                      {formatRupees(dish.pricePaise * line.qty)}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQty(line.menuItemId, 0)}
                    aria-label="Remove from cart"
                    className="flex size-9 items-center justify-center rounded-full text-(--sf-muted) transition hover:text-(--brand)"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-5 rounded-(--sf-radius-card) bg-(--sf-card) p-6 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) sm:p-8 lg:sticky lg:top-28">
          <p className={`${eyebrow} text-(--sf-muted)`}>Summary</p>
          <div className="flex items-baseline justify-between border-b border-(--sf-ink)/80 pb-4">
            <span className="text-(--sf-muted)">Subtotal</span>
            <span className="font-display text-3xl font-medium tabular-nums">
              {formatRupees(subtotal)}
            </span>
          </div>
          <p className="text-sm text-(--sf-muted)">
            Delivery, packaging and GST are added at checkout, where you choose
            the outlet and delivery or pickup.
          </p>
          {orderable.length > 0 ? (
            <Link href={`/${slug}/checkout`} className={`${solidButton} h-13`}>
              Checkout
            </Link>
          ) : (
            <span
              aria-disabled
              className={`${solidButton} h-13 cursor-not-allowed opacity-50`}
            >
              Checkout
            </span>
          )}
        </aside>
      </div>
    </div>
  )
}
