// Razorpay signs what it sends us with HMAC-SHA256. Verifying the signature
// proves the data came from Razorpay and was not changed on the way.
import { createHmac, timingSafeEqual } from "node:crypto"

function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

// Constant-time comparison, so response timing reveals nothing about the signature.
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

// Sent to the browser by Razorpay Checkout after a successful payment.
// Signature = HMAC(key_secret, "<order_id>|<payment_id>").
export function isValidCheckoutSignature(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
  keySecret: string
}) {
  const expected = hmacHex(
    params.keySecret,
    `${params.razorpayOrderId}|${params.razorpayPaymentId}`
  )
  return safeEqual(expected, params.signature)
}

// Sent by Razorpay's servers to our webhook in the X-Razorpay-Signature header.
// Signature = HMAC(webhook_secret, raw request body). Must use the exact raw
// body: parsing and re-serializing JSON changes the bytes.
export function isValidWebhookSignature(params: {
  rawBody: string
  signature: string
  webhookSecret: string
}) {
  return safeEqual(
    hmacHex(params.webhookSecret, params.rawBody),
    params.signature
  )
}
