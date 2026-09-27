// Plays Razorpay's part (no account needed): creates payment rows directly and
// signs callbacks/webhooks with test secrets set only in this process.
import { createHmac } from "node:crypto"

import { config } from "dotenv"
config({ path: "../../.env", quiet: true })
process.env.RAZORPAY_KEY_SECRET = "test_key_secret"
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret"

const { prisma } = await import("@workspace/db")
const { placeOrder } = await import("../src/orders/place-order")
const { updateOrderStatus } = await import("../src/orders/update-status")
const { confirmCheckoutPayment, handleRazorpayWebhook } =
  await import("../src/payments/payments")

const casa = await prisma.restaurant.findUniqueOrThrow({
  where: { slug: "casa-spezia" },
  include: { locations: true },
})
const customer = await prisma.profile.findFirstOrThrow({
  where: { phone: "919999900001" },
})
const staff = await prisma.profile.findFirstOrThrow({
  where: { phone: "919999900002" },
})
const tikka = await prisma.menuItem.findFirstOrThrow({
  where: { restaurantId: casa.id, title: "Achari Paneer Tikka" },
})
let n = 0

// An online order plus the payments row startOnlinePayment would create.
async function unpaidOrder() {
  const order = await placeOrder(
    customer.id,
    {
      restaurantId: casa.id,
      locationId: casa.locations[0]!.id,
      fulfillment: "pickup",
      paymentMethod: "online",
      customerName: "Test Customer",
      items: [{ menuItemId: tikka.id, qty: 1 }],
      idempotencyKey: `check-pay-${Date.now()}-${n++}`,
    },
    new Date("2026-09-28T12:00:00+05:30")
  )
  const rzpOrder = `order_test_${order.number}`
  await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayOrderId: rzpOrder,
      amountPaise: order.totalPaise,
    },
  })
  return { order, rzpOrder, rzpPayment: `pay_test_${order.number}` }
}
const checkoutSig = (o: string, p: string) =>
  createHmac("sha256", "test_key_secret").update(`${o}|${p}`).digest("hex")
const webhook = (o: string, p: string, amount: number) => {
  const body = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: p, order_id: o, amount } } },
  })
  return {
    body,
    sig: createHmac("sha256", "test_webhook_secret").update(body).digest("hex"),
  }
}
const show = async (label: string, fn: () => Promise<unknown>) => {
  try {
    console.log(label.padEnd(46), "->", JSON.stringify(await fn()))
  } catch (e) {
    const err = e as { code?: string; message: string }
    console.log(label.padEnd(46), "->", err.code, "|", err.message)
  }
}
const statusOf = async (id: string) =>
  await prisma.order.findUniqueOrThrow({
    where: { id },
    include: { payments: true },
  })

// 1. Normal: browser callback, then Razorpay's webhook for the same payment.
const a = await unpaidOrder()
await show(`#${a.order.number} checkout callback`, () =>
  confirmCheckoutPayment({
    razorpayOrderId: a.rzpOrder,
    razorpayPaymentId: a.rzpPayment,
    signature: checkoutSig(a.rzpOrder, a.rzpPayment),
  })
)
const wa = webhook(a.rzpOrder, a.rzpPayment, a.order.totalPaise)
await show(`#${a.order.number} webhook for same payment`, () =>
  handleRazorpayWebhook(wa.body, wa.sig)
)
await show(`#${a.order.number} webhook replayed`, () =>
  handleRazorpayWebhook(wa.body, wa.sig)
)
console.log(
  `   order ${(await statusOf(a.order.id)).status}, payment ${(await statusOf(a.order.id)).payments[0]!.status}`
)

// 2. Forged or tampered messages.
const b = await unpaidOrder()
await show(`#${b.order.number} callback with made-up signature`, () =>
  confirmCheckoutPayment({
    razorpayOrderId: b.rzpOrder,
    razorpayPaymentId: b.rzpPayment,
    signature: "f".repeat(64),
  })
)
const wb = webhook(b.rzpOrder, b.rzpPayment, 100)
await show(`#${b.order.number} webhook, amount ₹1 (signed)`, () =>
  handleRazorpayWebhook(wb.body, wb.sig)
)
await show(`#${b.order.number} webhook body edited after signing`, () =>
  handleRazorpayWebhook(
    wb.body.replace('"amount":100', `"amount":${b.order.totalPaise}`),
    wb.sig
  )
)
console.log(`   order ${(await statusOf(b.order.id)).status}`)

// 3. Callback and webhook arrive at the same moment.
const c = await unpaidOrder()
const wc = webhook(c.rzpOrder, c.rzpPayment, c.order.totalPaise)
const race = await Promise.all([
  confirmCheckoutPayment({
    razorpayOrderId: c.rzpOrder,
    razorpayPaymentId: c.rzpPayment,
    signature: checkoutSig(c.rzpOrder, c.rzpPayment),
  }),
  handleRazorpayWebhook(wc.body, wc.sig),
])
console.log(
  `#${c.order.number} callback + webhook at once`.padEnd(46),
  "->",
  JSON.stringify(race)
)

// 4. Customer cancels while unpaid, then the payment lands anyway.
const d = await unpaidOrder()
await updateOrderStatus({
  orderId: d.order.id,
  to: "CANCELLED",
  by: { kind: "customer", userId: customer.id },
})
const wd = webhook(d.rzpOrder, d.rzpPayment, d.order.totalPaise)
await show(`#${d.order.number} payment after customer cancelled`, () =>
  handleRazorpayWebhook(wd.body, wd.sig)
)

// 6. Card declined, then the customer retries in the same Razorpay order and pays.
const e = await unpaidOrder()
const failed = JSON.stringify({
  event: "payment.failed",
  payload: {
    payment: {
      entity: {
        id: `${e.rzpPayment}_declined`,
        order_id: e.rzpOrder,
        amount: e.order.totalPaise,
      },
    },
  },
})
await show(`#${e.order.number} first attempt declined`, () =>
  handleRazorpayWebhook(
    failed,
    createHmac("sha256", "test_webhook_secret").update(failed).digest("hex")
  )
)
const we = webhook(e.rzpOrder, e.rzpPayment, e.order.totalPaise)
await show(`#${e.order.number} retry succeeds (webhook)`, () =>
  handleRazorpayWebhook(we.body, we.sig)
)
console.log(
  `   order ${(await statusOf(e.order.id)).status}, payment ${(await statusOf(e.order.id)).payments[0]!.status}`
)

// 7. Paid order: customer taps Cancel as staff taps Accept. Whoever loses must
//    leave the payment alone (only a cancelled paid order needs a refund).
for (let i = 0; i < 5; i++) {
  const f = await unpaidOrder()
  await confirmCheckoutPayment({
    razorpayOrderId: f.rzpOrder,
    razorpayPaymentId: f.rzpPayment,
    signature: checkoutSig(f.rzpOrder, f.rzpPayment),
  })
  const cancel = () =>
    updateOrderStatus({
      orderId: f.order.id,
      to: "CANCELLED",
      by: { kind: "customer", userId: customer.id },
    })
  const accept = () =>
    updateOrderStatus({
      orderId: f.order.id,
      to: "ACCEPTED",
      by: { kind: "staff", userId: staff.id },
    })
  // Alternate who starts first so both outcomes happen.
  await Promise.allSettled(
    i % 2 === 0 ? [cancel(), accept()] : [accept(), cancel()]
  )
  const after = await statusOf(f.order.id)
  const consistent =
    (after.status === "CANCELLED") ===
    (after.payments[0]!.status === "needs_refund")
  console.log(
    `#${f.order.number} cancel vs accept race`.padEnd(46),
    "->",
    `order ${after.status}, payment ${after.payments[0]!.status}`,
    consistent ? "(consistent)" : "(WRONG)"
  )
}

// 8. Webhooks for payments that are not ours: acknowledged, not errors.
const foreign = webhook("order_from_a_payment_link", "pay_foreign", 50000)
await show("webhook for an unknown Razorpay order", () =>
  handleRazorpayWebhook(foreign.body, foreign.sig)
)
const noOrderBody = JSON.stringify({
  event: "payment.captured",
  payload: {
    payment: { entity: { id: "pay_no_order", order_id: null, amount: 50000 } },
  },
})
await show("webhook for a payment with no order", () =>
  handleRazorpayWebhook(
    noOrderBody,
    createHmac("sha256", "test_webhook_secret")
      .update(noOrderBody)
      .digest("hex")
  )
)

// 5. Paid order rejected by the kitchen.
await show(
  `#${a.order.number} kitchen rejects the paid order`,
  async () =>
    (
      await updateOrderStatus({
        orderId: a.order.id,
        to: "REJECTED",
        by: { kind: "staff", userId: staff.id },
        reason: "Out of paneer",
      })
    ).status
)
console.log(`   payment ${(await statusOf(a.order.id)).payments[0]!.status}`)

const ids = (
  await prisma.order.findMany({
    where: { idempotencyKey: { startsWith: "check-" } },
    select: { id: true },
  })
).map((o) => o.id)
await prisma.payment.deleteMany({ where: { orderId: { in: ids } } })
await prisma.order.deleteMany({ where: { id: { in: ids } } })
await prisma.$disconnect()
