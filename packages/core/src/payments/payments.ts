import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  prisma,
} from "@workspace/db"

import { DomainError } from "../errors"
import { notifyOrderStatus } from "../notifications/order-status"
import { env } from "../env"
import { createRazorpayOrder } from "./razorpay"
import { isValidCheckoutSignature, isValidWebhookSignature } from "./signatures"

// Creates a Razorpay order for an unpaid order and records it. Also used for
// "retry payment": each attempt gets its own Razorpay order and payments row.
export async function startOnlinePayment(customerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
  })
  if (!order) throw new DomainError("NOT_FOUND", "Order not found.")
  if (
    order.paymentMethod !== PaymentMethod.online ||
    order.status !== OrderStatus.PENDING_PAYMENT
  ) {
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
    keyId: env.razorpayKeyId(),
    razorpayOrderId: razorpayOrder.id,
    amountPaise: order.totalPaise,
    orderNumber: order.number,
  }
}

export const MarkPaidResult = {
  // Payment recorded, order moved to PLACED.
  placed: "placed",
  // Callback and webhook both arrived; the second is a no-op.
  alreadyRecorded: "already_recorded",
  // Paid, but the order was already rejected or cancelled.
  needsRefund: "needs_refund",
} as const
export type MarkPaidResult =
  (typeof MarkPaidResult)[keyof typeof MarkPaidResult]

// Razorpay webhook events we act on.
const RazorpayEvent = {
  paymentCaptured: "payment.captured",
  paymentFailed: "payment.failed",
} as const

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

    // Guarded: only the first caller records the payment. "failed" is included
    // because Razorpay Checkout lets the customer retry inside the same
    // Razorpay order (card declined, then UPI succeeds): payment.failed arrives
    // first, then the successful payment.
    const recorded = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: [PaymentStatus.created, PaymentStatus.failed] },
      },
      data: {
        status: PaymentStatus.captured,
        razorpayPaymentId: params.razorpayPaymentId,
      },
    })
    if (recorded.count === 0) {
      if (
        payment.razorpayPaymentId &&
        payment.razorpayPaymentId !== params.razorpayPaymentId
      ) {
        // A second, different successful payment for an order already paid.
        // The row keeps the first payment; this one must be refunded by hand.
        console.warn(
          `[payments] second payment ${params.razorpayPaymentId} for Razorpay order ` +
            `${params.razorpayOrderId} (already paid by ${payment.razorpayPaymentId}): refund it in Razorpay`
        )
      }
      return MarkPaidResult.alreadyRecorded
    }

    const placed = await tx.order.updateMany({
      where: { id: payment.orderId, status: OrderStatus.PENDING_PAYMENT },
      data: { status: OrderStatus.PLACED },
    })
    if (placed.count === 1) return MarkPaidResult.placed

    // Money arrived for an order that was cancelled or rejected meanwhile.
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.needs_refund },
    })
    return MarkPaidResult.needsRefund
  })

  if (result === MarkPaidResult.placed) {
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
  const keySecret = env.razorpayKeySecret()
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
  const webhookSecret = env.razorpayWebhookSecret()
  if (
    !signature ||
    !isValidWebhookSignature({ rawBody, signature, webhookSecret })
  ) {
    throw new DomainError("INVALID_SIGNATURE", "Invalid webhook signature.")
  }

  const event = JSON.parse(rawBody) as WebhookEvent
  const payment = event.payload?.payment?.entity
  if (!payment) return { handled: false }

  if (event.event === RazorpayEvent.paymentCaptured) {
    const result = await markPaid({
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amountPaise: payment.amount,
    })
    return { handled: true, result }
  }
  if (event.event === RazorpayEvent.paymentFailed) {
    await prisma.payment.updateMany({
      where: {
        razorpayOrderId: payment.order_id,
        status: PaymentStatus.created,
      },
      data: { status: PaymentStatus.failed },
    })
    return { handled: true, result: PaymentStatus.failed }
  }
  return { handled: false }
}
