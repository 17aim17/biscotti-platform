"use client"

import { cn } from "@workspace/ui/lib/utils"
import { Minus, Plus } from "lucide-react"

import { MAX_QTY_PER_LINE } from "@/lib/cart/store"

// The gradient ADD button, which turns into a - qty + stepper once added.
// Used on dish cards and in the cart.
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
      <div className="flex items-center gap-1 rounded-full bg-linear-to-r from-(--brand) to-amber-500 p-1 text-white shadow-(--brand)/30 shadow-md">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove one ${title}`}
          className="flex size-8 items-center justify-center rounded-full transition hover:bg-white/20"
        >
          <Minus className="size-4" />
        </button>
        <span
          className="min-w-5 text-center text-sm font-semibold tabular-nums"
          aria-live="polite"
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={qty >= MAX_QTY_PER_LINE}
          aria-label={`Add one ${title}`}
          className="flex size-8 items-center justify-center rounded-full transition hover:bg-white/20 disabled:opacity-50"
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
        "inline-flex items-center gap-1 rounded-full bg-linear-to-r from-(--brand) to-amber-500 text-sm font-bold tracking-wide text-white shadow-(--brand)/30 shadow-md transition hover:scale-105 hover:shadow-lg active:scale-95",
        compact ? "px-6 py-2" : "px-5 py-2"
      )}
    >
      <Plus className="size-4" /> ADD
    </button>
  )
}
