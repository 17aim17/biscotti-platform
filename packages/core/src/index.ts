// Business logic. Server only: importing this from a Client Component fails the
// build. Scripts outside Next.js run with `--conditions=react-server`.
import "server-only"

export * from "./constants"
export { DomainError, type DomainErrorCode } from "./errors"

export {
  calculateTotals,
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
  getMenu,
  getRestaurantBySlug,
  getStaffRestaurants,
  isReservedSlug,
  type MenuCategory,
  type MenuDish,
  type RestaurantSummary,
} from "./restaurants/queries"

export {
  ACTIVE_STATUSES,
  Actor,
  canTransition,
  nextStatuses,
  NOT_FULFILLED_STATUSES,
  ORDER_TRANSITIONS,
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
  MarkPaidResult,
  startOnlinePayment,
} from "./payments/payments"
