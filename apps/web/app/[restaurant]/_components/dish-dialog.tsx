"use client"

import type { MenuDish } from "@workspace/core"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { X } from "lucide-react"
import Image from "next/image"
import type { CSSProperties } from "react"

import { formatRupees } from "@/lib/money"

import { DietMark } from "./diet-mark"
import { QuantityControl } from "./quantity-control"
import { Ornament } from "./section-heading"
import { eyebrow, solidButton } from "./styles"

// Dish details: large photo and the full description. The dialog renders
// outside the restaurant's layout (in a portal), so it gets the theme
// variables through `themeStyle`.
export function DishDialog({
  dish,
  category,
  qty,
  onAdd,
  onRemove,
  onClose,
  themeStyle,
}: {
  dish: MenuDish | null
  category: string | null
  qty: number
  onAdd: () => void
  onRemove: () => void
  onClose: () => void
  themeStyle: CSSProperties
}) {
  return (
    <Dialog open={dish !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        style={themeStyle}
        className="max-h-[92svh] max-w-[calc(100%-1.5rem)] gap-0 overflow-y-auto rounded-(--sf-radius-card) bg-(--sf-bg) p-0 text-(--sf-ink) shadow-2xl ring-(--sf-line) sm:max-w-4xl md:grid md:grid-cols-[1.1fr_1fr] md:overflow-hidden"
      >
        {/* Own close button: readable on top of the photo. */}
        <DialogClose
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-(--sf-bg)/90 text-(--sf-ink) shadow-sm backdrop-blur transition hover:bg-(--sf-bg)"
        >
          <X className="size-4" />
        </DialogClose>
        {dish && (
          <>
            <div className="relative aspect-[4/3] bg-(--sf-soft) md:aspect-auto md:min-h-[34rem]">
              {dish.imageUrl && (
                <Image
                  src={`${dish.imageUrl}?w=1200&h=1200&q=80&auto=format&fit=crop`}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 560px, 100vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-col p-7 sm:p-10">
              <p
                className={`${eyebrow} flex items-center gap-2.5 text-(--sf-muted)`}
              >
                <DietMark isVeg={dish.isVeg} />
                {dish.isVeg ? "Vegetarian" : "Non-vegetarian"}
                {category && <> · {category}</>}
              </p>
              <DialogTitle className="mt-5 font-display text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">
                {dish.title}
              </DialogTitle>
              <p className="mt-3 font-display text-2xl font-medium tabular-nums">
                {formatRupees(dish.pricePaise)}
              </p>
              <Ornament className="mt-6 text-(--brand-accent)" />
              <DialogDescription className="mt-6 text-base leading-relaxed text-(--sf-muted)">
                {dish.description || "Cooked fresh when you order."}
              </DialogDescription>
              <div className="mt-auto flex items-center gap-4 pt-10">
                {!dish.isAvailable ? (
                  <p className={`${eyebrow} text-(--sf-muted)`}>
                    Sold out today
                  </p>
                ) : qty === 0 ? (
                  <button
                    type="button"
                    onClick={onAdd}
                    className={`${solidButton} h-12 w-full`}
                  >
                    Add to order · {formatRupees(dish.pricePaise)}
                  </button>
                ) : (
                  <>
                    <QuantityControl
                      soldOut={false}
                      qty={qty}
                      title={dish.title}
                      onAdd={onAdd}
                      onRemove={onRemove}
                    />
                    <p className="text-sm text-(--sf-muted)">
                      In your order ·{" "}
                      <span className="font-semibold text-(--sf-ink) tabular-nums">
                        {formatRupees(dish.pricePaise * qty)}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
