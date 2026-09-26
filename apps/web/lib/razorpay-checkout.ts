// Opens Razorpay Checkout (Razorpay's own payment window) in the browser.
// The script is loaded on first use, not on every page.

export type PaymentStart = {
  keyId: string
  razorpayOrderId: string
  amountPaise: number
  orderNumber: number
}

export type CheckoutSuccess = {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}

type RazorpayResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayInstance = { open: () => void }

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js"
let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      reject(new Error("Could not load Razorpay."))
    }
    document.body.appendChild(script)
  })
  return loading
}

// Resolves with the signed response when the customer pays, or null when they
// close the window. Failed attempts stay inside Razorpay's window, which lets
// the customer try another method.
export async function payWithRazorpay(
  start: PaymentStart,
  details: { restaurantName: string; phone: string | null; color: string }
): Promise<CheckoutSuccess | null> {
  await loadScript()
  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({
      key: start.keyId,
      order_id: start.razorpayOrderId,
      amount: start.amountPaise,
      currency: "INR",
      name: details.restaurantName,
      description: `Order #${start.orderNumber}`,
      prefill: details.phone ? { contact: `+${details.phone}` } : undefined,
      theme: { color: details.color },
      handler: (response: RazorpayResponse) =>
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      modal: { ondismiss: () => resolve(null) },
    })
    checkout.open()
  })
}
