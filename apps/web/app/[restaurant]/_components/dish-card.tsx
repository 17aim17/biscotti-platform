"use client"

import type { MenuDish } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import Image from "next/image"

import { formatRupees } from "@/lib/money"

import { DietMark } from "./diet-mark"
import { QuantityControl } from "./quantity-control"
import { eyebrow } from "./styles"

// One dish, laid out like a printed menu entry.
// Phones: text on the left, a square photo on the right with Add over it.
// Wider screens: photo on top, then "Title ....... price" with a dotted leader.
// The photo and title open the dish details.
export function DishCard({
  dish,
  qty,
  onAdd,
  onRemove,
  onOpen,
}: {
  dish: MenuDish
  qty: number
  onAdd: () => void
  onRemove: () => void
  onOpen: () => void
}) {
  const soldOut = !dish.isAvailable
  const control = (compact?: boolean) => (
    <QuantityControl
      soldOut={soldOut}
      qty={qty}
      title={dish.title}
      onAdd={onAdd}
      onRemove={onRemove}
      compact={compact}
    />
  )
  const price = formatRupees(dish.pricePaise)

  return (
    <article
      className={cn(
        "group flex gap-5 py-7 sm:flex-col-reverse sm:gap-6 sm:py-8",
        soldOut && "opacity-60"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-baseline gap-2.5 text-left"
        >
          <DietMark isVeg={dish.isVeg} />
          <h3 className="font-display text-[1.4rem] leading-tight font-medium tracking-tight decoration-(--brand-accent) decoration-1 underline-offset-4 group-hover:underline sm:text-[1.6rem]">
            {dish.title}
          </h3>
          <span
            aria-hidden
            className="hidden min-w-6 flex-1 border-b border-dotted border-(--sf-muted)/50 sm:block"
          />
          <span className="hidden font-display text-[1.35rem] font-medium tabular-nums sm:block">
            {price}
          </span>
        </button>
        <span className="mt-1 font-display text-lg font-medium tabular-nums sm:hidden">
          {price}
        </span>
        {dish.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-(--sf-muted)">
            {dish.description}
          </p>
        )}
        <div className="mt-5 hidden items-center gap-5 sm:flex">
          {control()}
          {soldOut && (
            <span className={`${eyebrow} text-(--sf-muted)`}>Sold out</span>
          )}
          <button
            type="button"
            onClick={onOpen}
            className={`${eyebrow} ml-auto text-(--sf-muted) underline-offset-4 transition hover:text-(--sf-ink) hover:underline`}
          >
            Details
          </button>
        </div>
      </div>

      <div className="relative w-28 shrink-0 self-start pb-5 sm:w-full sm:pb-0">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${dish.title}, details`}
          className="relative block aspect-square w-full overflow-hidden rounded-(--sf-radius-card) bg-(--sf-soft) sm:aspect-[3/2]"
        >
          {dish.imageUrl && (
            <Image
              src={`${dish.imageUrl}?w=720&h=480&q=75&auto=format&fit=crop`}
              alt=""
              fill
              sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 112px"
              className={cn(
                "object-cover transition duration-[1200ms] ease-out group-hover:scale-105",
                soldOut && "grayscale"
              )}
            />
          )}
          {soldOut && (
            <span
              className={`${eyebrow} absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-center text-[0.6rem] text-white sm:hidden`}
            >
              Sold out
            </span>
          )}
        </button>
        <div className="absolute inset-x-0 bottom-0 flex justify-center sm:hidden">
          {control(true)}
        </div>
      </div>
    </article>
  )
}
