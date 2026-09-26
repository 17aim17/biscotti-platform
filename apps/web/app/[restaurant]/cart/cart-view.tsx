"use client"

import type { MenuCategory, RestaurantSummary } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeft, Bike, MapPin, ShoppingBag, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"

import { useCart, type Fulfillment } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { DietMark } from "../_components/diet-mark"
import { QuantityControl } from "../_components/quantity-control"
import { solidButton } from "@/components/styles"

type Location = RestaurantSummary["locations"][number]

export function CartView({
  slug,
  categories,
  locations,
}: {
  slug: string
  categories: MenuCategory[]
  locations: Location[]
}) {
  const { cart, count, add, decrement, setQty, setLocation, setFulfillment } =
    useCart(slug)
  const dishes = useMemo(
    () =>
      new Map(
        categories.flatMap((c) => c.menuItems.map((d) => [d.id, d] as const))
      ),
    [categories]
  )

  if (count === 0) {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-(--sf-radius-card) bg-(--sf-card) px-6 py-16 text-center shadow-(--sf-shadow-card) ring-1 ring-(--sf-line)">
        <span className="flex size-16 items-center justify-center rounded-full bg-(--sf-soft) text-(--brand)">
          <ShoppingBag className="size-8" />
        </span>
        <h1 className="font-display text-3xl font-semibold">
          Your cart is empty
        </h1>
        <p className="text-(--sf-muted)">
          Add a few dishes from the menu to get started.
        </p>
        <Link
          href={`/${slug}#menu`}
          className="rounded-(--sf-radius-control) bg-(image:--sf-btn) px-6 py-3 font-semibold text-white shadow-(--sf-btn-shadow) transition hover:scale-105"
        >
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

  const selected =
    locations.find((l) => l.id === cart.locationId) ??
    locations.find((l) => l.openNow) ??
    null
  const pickupAllowed = selected?.acceptsPickup ?? false
  const fulfillment: Fulfillment =
    cart.fulfillment === "pickup" && pickupAllowed ? "pickup" : "delivery"
  const canCheckout = Boolean(selected?.openNow) && orderable.length > 0

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-center gap-3">
        <Link
          href={`/${slug}`}
          aria-label="Back to the menu"
          className="flex size-10 items-center justify-center rounded-full bg-(--sf-card) shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) transition hover:scale-105"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Your cart
        </h1>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <Panel title={`${count} ${count === 1 ? "item" : "items"}`}>
            <ul className="divide-y divide-(--sf-line)">
              {lines.map(({ line, dish }) => (
                <li
                  key={line.menuItemId}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-[calc(var(--sf-radius-card)-0.5rem)] bg-(--sf-soft)">
                    {dish?.imageUrl && (
                      <Image
                        src={`${dish.imageUrl}?w=160&h=160&q=70&auto=format&fit=crop`}
                        alt=""
                        fill
                        sizes="64px"
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
                        <span className="flex items-center gap-2 font-semibold">
                          <DietMark isVeg={dish.isVeg} />
                          <span className="truncate">{dish.title}</span>
                        </span>
                        <span className="text-sm text-(--sf-muted) tabular-nums">
                          {dish.isAvailable
                            ? formatRupees(dish.pricePaise * line.qty)
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
                    <QuantityControl
                      soldOut={false}
                      qty={line.qty}
                      title={dish.title}
                      onAdd={() => add(line.menuItemId)}
                      onRemove={() => decrement(line.menuItemId)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setQty(line.menuItemId, 0)}
                      aria-label="Remove from cart"
                      className="flex size-9 items-center justify-center rounded-full text-(--sf-muted) transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="How do you want it?">
            <div className="grid grid-cols-2 gap-1 rounded-(--sf-radius-control) bg-(--sf-soft) p-1">
              {(["delivery", "pickup"] as const).map((option) => {
                const active = fulfillment === option
                const disabled = option === "pickup" && !pickupAllowed
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => setFulfillment(option)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-(--sf-radius-control) py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-(--sf-card) text-(--brand) shadow-sm"
                        : "text-(--sf-muted) hover:text-(--sf-ink)",
                      disabled && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {option === "delivery" ? (
                      <Bike className="size-4" />
                    ) : (
                      <ShoppingBag className="size-4" />
                    )}
                    {option === "delivery" ? "Delivery" : "Pickup"}
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel title="Order from">
            <div className="grid gap-3 sm:grid-cols-2">
              {locations.map((location) => {
                const active = selected?.id === location.id
                return (
                  <label
                    key={location.id}
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-2xl p-4 ring-1 transition",
                      active
                        ? "bg-(--sf-soft) ring-2 ring-(--brand)"
                        : "ring-(--sf-line) hover:bg-(--sf-soft)"
                    )}
                  >
                    <input
                      type="radio"
                      name="location"
                      value={location.id}
                      checked={active}
                      onChange={() => setLocation(location.id)}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold">
                        <MapPin className="size-4 text-(--brand)" />
                        {location.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          location.openNow
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-(--sf-soft) text-(--sf-muted)"
                        )}
                      >
                        {location.openNow ? "Open" : "Closed"}
                      </span>
                    </span>
                    <span className="text-sm text-(--sf-muted)">
                      {location.address}
                    </span>
                  </label>
                )
              })}
            </div>
          </Panel>
        </div>

        <aside className="flex flex-col gap-4 rounded-(--sf-radius-card) bg-(--sf-card) p-6 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-semibold">Order summary</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-(--sf-muted)">Subtotal</span>
            <span className="font-semibold tabular-nums">
              {formatRupees(subtotal)}
            </span>
          </div>
          <p className="text-sm text-(--sf-muted)">
            {fulfillment === "delivery"
              ? "Delivery fee, packaging"
              : "Packaging"}{" "}
            and GST are added at checkout.
          </p>
          {canCheckout ? (
            <Link href={`/${slug}/checkout`} className={`${solidButton} py-4`}>
              Checkout
            </Link>
          ) : (
            <span
              aria-disabled
              className={`${solidButton} cursor-not-allowed py-4 opacity-50`}
            >
              Checkout
            </span>
          )}
          {selected && !selected.openNow && (
            <p className="text-center text-sm text-(--sf-muted)">
              {selected.name} is closed right now.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-(--sf-radius-card) bg-(--sf-card) p-5 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}
