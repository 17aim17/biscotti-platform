"use client"

import type { MenuDish } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import Image from "next/image"

import { formatRupees } from "@/lib/money"

import { DietMark } from "./diet-mark"
import { QuantityControl } from "./quantity-control"

// Phones: compact row (text left, square photo right with the button over it),
// the layout food apps use so several dishes fit on one screen.
// Wider screens: photo card in a grid.
export function DishCard({
  dish,
  qty,
  onAdd,
  onRemove,
}: {
  dish: MenuDish
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  const soldOut = !dish.isAvailable
  return (
    <article
      className={cn(
        "group flex gap-4 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-orange-950/5 transition duration-300",
        "sm:flex-col-reverse sm:gap-0 sm:overflow-hidden sm:p-0 sm:hover:-translate-y-1 sm:hover:shadow-xl sm:hover:shadow-orange-900/10",
        soldOut && "opacity-70"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1 sm:p-4">
        <DietMark isVeg={dish.isVeg} className="sm:hidden" />
        <h3 className="text-base leading-snug font-semibold">{dish.title}</h3>
        <span className="text-base font-bold tabular-nums sm:hidden">
          {formatRupees(dish.pricePaise)}
        </span>
        {dish.description && (
          <p className="line-clamp-2 text-sm text-stone-500">
            {dish.description}
          </p>
        )}
        <div className="mt-auto hidden items-center justify-between pt-2 sm:flex">
          <span className="text-lg font-bold tabular-nums">
            {formatRupees(dish.pricePaise)}
          </span>
          <QuantityControl
            soldOut={soldOut}
            qty={qty}
            title={dish.title}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        </div>
      </div>

      <div className="relative w-32 shrink-0 self-start pb-4 sm:w-full sm:pb-0">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-orange-50 sm:aspect-[4/3] sm:rounded-none">
          {dish.imageUrl && (
            <Image
              src={`${dish.imageUrl}?w=640&h=480&q=75&auto=format&fit=crop`}
              alt={dish.title}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 128px"
              className={cn(
                "object-cover transition duration-500 group-hover:scale-110",
                soldOut && "grayscale"
              )}
            />
          )}
          <span className="absolute top-3 left-3 hidden rounded-lg bg-white/95 p-1 shadow-sm sm:block">
            <DietMark isVeg={dish.isVeg} />
          </span>
          {soldOut && (
            <span className="absolute inset-x-2 top-2 rounded-full bg-stone-900/80 px-2 py-1 text-center text-xs font-semibold text-white backdrop-blur sm:inset-x-auto sm:right-3 sm:left-auto sm:px-3">
              Sold out
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center sm:hidden">
          <QuantityControl
            soldOut={soldOut}
            qty={qty}
            title={dish.title}
            onAdd={onAdd}
            onRemove={onRemove}
            compact
          />
        </div>
      </div>
    </article>
  )
}
