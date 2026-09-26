"use client"

import { cn } from "@workspace/ui/lib/utils"
import { Minus, Plus } from "lucide-react"

import { MAX_QTY_PER_LINE } from "@/lib/cart/store"

import { buttonText } from "./styles"

// The Add button, which becomes a - qty + stepper once the dish is in the cart.
// Used on dish cards, the dish details dialog and the cart. Colors, corners
// and lettering come from the restaurant's theme (--sf-* variables).
export function QuantityControl({
  soldOut,
  qty,
  title,
  onAdd,
  onRemove,
  compact,
}: {
  soldOut: boolean
  qty: number
  title: string
  onAdd: () => void
  onRemove: () => void
  compact?: boolean
}) {
  if (soldOut) return null
  if (qty > 0) {
    return (
      <div className="flex h-10 items-center gap-1 rounded-(--sf-radius-control) bg-(image:--sf-btn) px-1 text-white shadow-(--sf-btn-shadow)">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove one ${title}`}
          className="flex size-8 items-center justify-center rounded-(--sf-radius-control) transition hover:bg-white/15"
        >
          <Minus className="size-3.5" />
        </button>
        <span
          key={qty}
          aria-live="polite"
          className="min-w-6 animate-in text-center text-sm font-semibold tabular-nums duration-200 zoom-in-75"
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={qty >= MAX_QTY_PER_LINE}
          aria-label={`Add one ${title}`}
          className="flex size-8 items-center justify-center rounded-(--sf-radius-control) transition hover:bg-white/15 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${title}`}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-(--sf-radius-control) bg-(--sf-card) text-(--sf-add) ring-1 ring-(--sf-add) transition ring-inset hover:bg-(--sf-add) hover:text-(--sf-card) active:scale-95",
        buttonText,
        compact ? "w-24 shadow-(--sf-shadow-card)" : "px-6"
      )}
    >
      Add
    </button>
  )
}
