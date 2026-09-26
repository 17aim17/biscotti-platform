"use client"

import { cn } from "@workspace/ui/lib/utils"
import { Minus, Plus } from "lucide-react"

import { MAX_QTY_PER_LINE } from "@/lib/cart/store"

// The Add button, which becomes a - qty + stepper once the dish is in the cart.
// Used on dish cards and in the cart. Colors and corners come from the
// restaurant's theme (--sf-* variables).
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
      <div className="flex items-center gap-1 rounded-(--sf-radius-control) bg-(image:--sf-btn) p-1 text-white shadow-(--sf-btn-shadow)">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove one ${title}`}
          className="flex size-8 items-center justify-center rounded-(--sf-radius-control) transition hover:bg-white/20"
        >
          <Minus className="size-4" />
        </button>
        <span
          key={qty}
          aria-live="polite"
          className="min-w-5 animate-in text-center text-sm font-semibold tabular-nums duration-200 zoom-in-75"
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={qty >= MAX_QTY_PER_LINE}
          aria-label={`Add one ${title}`}
          className="flex size-8 items-center justify-center rounded-(--sf-radius-control) transition hover:bg-white/20 disabled:opacity-50"
        >
          <Plus className="size-4" />
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
        "inline-flex items-center gap-1.5 rounded-(--sf-radius-control) bg-(--sf-card) text-sm font-semibold text-(--brand) shadow-(--sf-shadow-card) ring-1 ring-(--brand)/30 transition hover:bg-(--brand) hover:text-white active:scale-95",
        compact ? "px-6 py-2" : "px-5 py-2"
      )}
    >
      <Plus className="size-4" /> Add
    </button>
  )
}
