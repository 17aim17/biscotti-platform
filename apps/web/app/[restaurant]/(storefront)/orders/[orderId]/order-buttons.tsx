"use client"

import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { eyebrow, solidButton } from "@/components/styles"
import { callAction } from "@/lib/call-action"
import { cancelOrderAction, startPaymentAction } from "../actions"
import { payAndConfirm } from "../pay"

// "Pay now" for an order still waiting for payment: a new Razorpay attempt.
export function PayNowButton({
  orderId,
  label,
  restaurantName,
  phone,
  brandColor,
}: {
  orderId: string
  label: string
  restaurantName: string
  phone: string | null
  brandColor: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setBusy(true)
    setError(null)
    const start = await callAction(() => startPaymentAction(orderId))
    if (!start.ok) {
      setError(start.error)
      setBusy(false)
      return
    }
    const result = await payAndConfirm(start.data, {
      restaurantName,
      phone,
      color: brandColor,
    })
    if (!result.ok) setError(result.error)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className={`${solidButton} h-12 px-8 disabled:opacity-60`}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-(--brand)">
          {error}
        </p>
      )}
    </div>
  )
}

// Customers can cancel until the kitchen accepts.
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancel() {
    if (!window.confirm("Cancel this order?")) return
    setBusy(true)
    setError(null)
    const result = await callAction(() => cancelOrderAction(orderId))
    if (!result.ok) setError(result.error)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className={`${eyebrow} w-fit text-(--sf-muted) underline-offset-4 transition hover:text-(--brand) hover:underline disabled:opacity-60`}
      >
        {busy ? "Cancelling…" : "Cancel order"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-(--brand)">
          {error}
        </p>
      )}
    </div>
  )
}
