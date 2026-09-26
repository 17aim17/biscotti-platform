"use client"

import { Button } from "@workspace/ui/components/button"
import { Minus, Plus } from "lucide-react"

import { MAX_QTY_PER_LINE } from "@/lib/cart/store"

export function QtyStepper({
  label,
  qty,
  onDecrement,
  onIncrement,
}: {
  label: string
  qty: number
  onDecrement: () => void
  onIncrement: () => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove one ${label}`}
        onClick={onDecrement}
      >
        <Minus />
      </Button>
      <span
        className="min-w-6 text-center text-sm tabular-nums"
        aria-live="polite"
      >
        {qty}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Add one ${label}`}
        onClick={onIncrement}
        disabled={qty >= MAX_QTY_PER_LINE}
      >
        <Plus />
      </Button>
    </div>
  )
}
