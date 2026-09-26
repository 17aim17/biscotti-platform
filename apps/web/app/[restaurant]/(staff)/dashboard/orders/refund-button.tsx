"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { outlineButton } from "../_ui"
import { markRefundedAction } from "../actions"

// After refunding in the Razorpay dashboard, record it here.
export function RefundButton({
  slug,
  paymentId,
}: {
  slug: string
  paymentId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Mark this payment as refunded in Razorpay?"))
            return
          start(async () => {
            const result = await markRefundedAction(slug, paymentId)
            if (!result.ok) setError(result.error)
            router.refresh()
          })
        }}
        className={outlineButton}
      >
        {pending ? "Saving…" : "Mark refunded"}
      </button>
      {error && <p className="text-xs text-(--brand)">{error}</p>}
    </div>
  )
}
