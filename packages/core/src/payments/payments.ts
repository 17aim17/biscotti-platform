import { prisma } from "@workspace/db"

import { DomainError } from "../errors"
import { notifyOrderStatus } from "../notifications/order-status"
import { createRazorpayOrder, razorpayKeyId } from "./razorpay"
import { isValidCheckoutSignature, isValidWebhookSignature } from "./signatures"

// Creates a Razorpay order for an unpaid order and records it. Also used for
// "retry payment": each attempt gets its own Razorpay order and payments row.
export async function startOnlinePayment(customerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
  })
  if (!order) throw new DomainError("NOT_FOUND", "Order not found.")
  if (order.paymentMethod !== "online" || order.status !== "PENDING_PAYMENT") {
    throw new DomainError(
      "INVALID_STATUS_CHANGE",
      "This order is not waiting for payment."
    )
  }

  // Called outside any database transaction: never hold a transaction open
  // across a network call.
  const razorpayOrder = await createRazorpayOrder({
    amountPaise: order.totalPaise,
    receipt: `order-${order.number}`,
    notes: { orderId: order.id },
  })
  await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: order.totalPaise,
    },
  })

  // What the browser needs to open Razorpay Checkout.
  return {
    keyId: razorpayKeyId(),
    razorpayOrderId: razorpayOrder.id,
    amountPaise: order.totalPaise,
    orderNumber: order.number,
  }
}

export type MarkPaidResult =
  | "placed" // payment recorded, order moved to PLACED
  | "already_recorded" // callback and webhook both arrived; the second is a no-op
  | "needs_refund" // paid, but the order was already rejected or cancelled

// Records a captured payment. Safe to call more than once for the same payment.
export async function markPaid(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  // Known from the webhook; the checkout callback does not include it.
  amountPaise?: number
}): Promise<MarkPaidResult> {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId: params.razorpayOrderId },
    })
    if (!payment) throw new DomainError("PAYMENT_MISMATCH", "Unknown payment.")
    if (
      params.amountPaise !== undefined &&
      params.amountPaise !== payment.amountPaise
    ) {
      throw new DomainError(
        "PAYMENT_MISMATCH",
        "Paid amount does not match the order."
      )
    }

    // Guarded: only the first caller moves the payment out of "created".
    const recorded = await tx.payment.updateMany({
      where: { id: payment.id, status: "created" },
      data: { status: "captured", razorpayPaymentId: params.razorpayPaymentId },
    })
    if (recorded.count === 0) return "already_recorded" as const

    const placed = await tx.order.updateMany({
      where: { id: payment.orderId, status: "PENDING_PAYMENT" },
      data: { status: "PLACED" },
    })
    if (placed.count === 1) return "placed" as const

    // Money arrived for an order that was cancelled or rejected meanwhile.
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "needs_refund" },
    })
    return "needs_refund" as const
  })

  if (result === "placed") {
    const order = await prisma.order.findFirstOrThrow({
      where: {
        payments: { some: { razorpayOrderId: params.razorpayOrderId } },
      },
      include: { restaurant: { select: { name: true } } },
    })
    await notifyOrderStatus(order, order.restaurant.name)
  }
  return result
}

// The browser's success callback from Razorpay Checkout. The signature proves
// Razorpay issued it; without it anyone could claim to have paid.
export async function confirmCheckoutPayment(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET must be set.")
  if (!isValidCheckoutSignature({ ...params, keySecret })) {
    throw new DomainError("INVALID_SIGNATURE", "Payment could not be verified.")
  }
  return markPaid(params)
}

type WebhookEvent = {
  event: string
  payload?: {
    payment?: { entity?: { id: string; order_id: string; amount: number } }
  }
}

// Razorpay's server-to-server notification: the source of truth for payments,
// since the browser callback can be lost (tab closed, network drop).
export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string | null
) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error("RAZORPAY_WEBHOOK_SECRET must be set.")
  if (
    !signature ||
    !isValidWebhookSignature({ rawBody, signature, webhookSecret })
  ) {
    throw new DomainError("INVALID_SIGNATURE", "Invalid webhook signature.")
  }

  const event = JSON.parse(rawBody) as WebhookEvent
  const payment = event.payload?.payment?.entity
  if (!payment) return { handled: false }

  if (event.event === "payment.captured") {
    const result = await markPaid({
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amountPaise: payment.amount,
    })
    return { handled: true, result }
  }
  if (event.event === "payment.failed") {
    await prisma.payment.updateMany({
      where: { razorpayOrderId: payment.order_id, status: "created" },
      data: { status: "failed" },
    })
    return { handled: true, result: "failed" }
  }
  return { handled: false }
}
