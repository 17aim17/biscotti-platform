import { DomainError, handleRazorpayWebhook } from "@workspace/core"

// Razorpay calls this for payment events. The body must be read as raw text:
// the signature is computed over the exact bytes, and re-serialised JSON
// would not match.
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-razorpay-signature")
  try {
    const result = await handleRazorpayWebhook(rawBody, signature)
    return Response.json(result)
  } catch (error) {
    // Bad signature or an amount that does not match: retrying will not
    // help, so answer 400 (a 5xx makes Razorpay retry, then disable the hook).
    if (error instanceof DomainError) {
      console.warn(`[webhook] razorpay rejected: ${error.code}`)
      return Response.json({ error: error.code }, { status: 400 })
    }
    // Anything else (database down): a 500 makes Razorpay retry later.
    console.error("[webhook] razorpay", error)
    return Response.json({ error: "failed" }, { status: 500 })
  }
}
