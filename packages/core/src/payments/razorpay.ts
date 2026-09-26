// Minimal Razorpay REST client. Only what checkout needs: creating an order.
// Docs: https://razorpay.com/docs/api/orders/create/
import { CURRENCY } from "../constants"
import { env } from "../env"

const API = "https://api.razorpay.com/v1"

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
}

export async function createRazorpayOrder(params: {
  amountPaise: number
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrder> {
  const keyId = env.razorpayKeyId()
  const keySecret = env.razorpayKeySecret()
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: CURRENCY,
      receipt: params.receipt,
      notes: params.notes,
    }),
  })
  if (!res.ok) {
    throw new Error(
      `Razorpay order creation failed (${res.status}): ${await res.text()}`
    )
  }
  return (await res.json()) as RazorpayOrder
}
