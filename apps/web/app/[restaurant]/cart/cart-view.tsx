"use client"

import type { MenuCategory, RestaurantSummary } from "@workspace/core"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { useMemo } from "react"

import { useCart, type Fulfillment } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { DietMark } from "../_components/diet-mark"
import { QtyStepper } from "../_components/qty-stepper"

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
      <section className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link
          href={`/${slug}`}
          className={buttonVariants({ variant: "outline" })}
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

  return (
    <div className="flex flex-col gap-8 pb-10">
      <h1 className="text-2xl font-semibold">Your cart</h1>

      <ul className="divide-y rounded-lg border">
        {lines.map(({ line, dish }) => (
          <li
            key={line.menuItemId}
            className="flex items-center justify-between gap-4 p-4"
          >
            {dish ? (
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <DietMark isVeg={dish.isVeg} />
                  <span className="font-medium">{dish.title}</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {dish.isAvailable
                    ? `${formatRupees(dish.pricePaise)} × ${line.qty} = ${formatRupees(dish.pricePaise * line.qty)}`
                    : "Sold out right now"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                This dish is no longer on the menu.
              </span>
            )}
            {dish?.isAvailable ? (
              <QtyStepper
                label={dish.title}
                qty={line.qty}
                onDecrement={() => decrement(line.menuItemId)}
                onIncrement={() => add(line.menuItemId)}
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQty(line.menuItemId, 0)}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-medium">Order from</legend>
        {locations.map((location) => (
          <label
            key={location.id}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4",
              selected?.id === location.id &&
                "border-primary ring-1 ring-primary"
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="location"
                value={location.id}
                checked={selected?.id === location.id}
                onChange={() => setLocation(location.id)}
                className="accent-primary"
              />
              <span className="flex flex-col">
                <span className="font-medium">{location.name}</span>
                <span className="text-sm text-muted-foreground">
                  {location.address}
                </span>
              </span>
            </span>
            <span
              className={cn(
                "text-sm",
                location.openNow ? "text-green-700" : "text-muted-foreground"
              )}
            >
              {location.openNow ? "Open now" : "Closed"}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-medium">
          How do you want it?
        </legend>
        <div className="flex gap-2">
          {(["delivery", "pickup"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              variant={fulfillment === option ? "default" : "outline"}
              aria-pressed={fulfillment === option}
              disabled={option === "pickup" && !pickupAllowed}
              onClick={() => setFulfillment(option)}
            >
              {option === "delivery" ? "Delivery" : "Pickup"}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t pt-6">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-medium tabular-nums">
            {formatRupees(subtotal)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {fulfillment === "delivery" ? "Delivery fee, packaging" : "Packaging"}{" "}
          and GST are added at checkout.
        </p>
        <Button disabled={!selected?.openNow || orderable.length === 0}>
          Checkout (coming soon)
        </Button>
        {selected && !selected.openNow && (
          <p className="text-sm text-muted-foreground">
            {selected.name} is closed right now.
          </p>
        )}
      </div>
    </div>
  )
}
