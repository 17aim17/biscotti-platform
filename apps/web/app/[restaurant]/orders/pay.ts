import { payWithRazorpay, type PaymentStart } from "@/lib/razorpay-checkout"

import { confirmPaymentAction } from "./actions"

// Opens Razorpay and, if the customer pays, has the server verify and record
// the payment. Used by checkout and by "Pay now" on the order page. Even if
// the confirm call is lost, the webhook records the payment.
export async function payAndConfirm(
  start: PaymentStart,
  details: { restaurantName: string; phone: string | null; color: string }
): Promise<{ ok: true; paid: boolean } | { ok: false; error: string }> {
  let response
  try {
    response = await payWithRazorpay(start, details)
  } catch {
    return { ok: false, error: "Could not open the payment window." }
  }
  if (!response) return { ok: true, paid: false }
  const confirmed = await confirmPaymentAction(response)
  return confirmed.ok ? { ok: true, paid: true } : confirmed
}
