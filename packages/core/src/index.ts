// Business logic. Server only: importing this from a Client Component fails the
// build. Scripts outside Next.js run with `--conditions=react-server`.
import "server-only"

export { DomainError, type DomainErrorCode } from "./errors"

export {
  calculateTotals,
  MAX_QTY_PER_LINE,
  priceLines,
  type LineInput,
  type LocationCharges,
  type OrderTotals,
  type PricedLine,
} from "./pricing"

export {
  distanceInMeters,
  isWithinRadius,
  type Coordinates,
} from "./locations/distance"
export {
  isOpenAt,
  openingHoursSchema,
  RESTAURANT_TIME_ZONE,
  type OpeningHours,
} from "./locations/hours"

export {
  can,
  getMembership,
  requirePermission,
  roleCan,
  type Permission,
} from "./auth/permissions"

export {
  ACTIVE_STATUSES,
  canTransition,
  nextStatuses,
  ORDER_TRANSITIONS,
  type Actor,
} from "./orders/status"
export {
  placeOrder,
  placeOrderInput,
  type PlaceOrderInput,
} from "./orders/place-order"
export { updateOrderStatus, type StatusChangeBy } from "./orders/update-status"

// markPaid and the signature helpers stay internal: callers go through these.
export {
  confirmCheckoutPayment,
  handleRazorpayWebhook,
  startOnlinePayment,
  type MarkPaidResult,
} from "./payments/payments"
