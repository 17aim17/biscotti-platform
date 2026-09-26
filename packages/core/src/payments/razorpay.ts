// Minimal Razorpay REST client. Only what checkout needs: creating an order.
// Docs: https://razorpay.com/docs/api/orders/create/
const API = "https://api.razorpay.com/v1"

function credentials() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error(
      "NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set."
    )
  }
  return { keyId, keySecret }
}

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
  const { keyId, keySecret } = credentials()
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
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

export function razorpayKeyId() {
  return credentials().keyId
}
