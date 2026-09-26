// Business limits and settings in one place. Values that the database also
// enforces (check constraints) say so, so both are changed together.

// Orders
export const MAX_QTY_PER_LINE = 50
export const MAX_LINES_PER_ORDER = 50
// ₹1,00,000 per item. Also enforced by menu_items_price_max in the database.
export const MAX_PRICE_PAISE = 1_00_000_00
// ₹5,00,000 per order: well inside Postgres int4 and Razorpay's order limit.
export const MAX_ORDER_TOTAL_PAISE = 5_00_000_00
// Razorpay's minimum payment is ₹1.
export const MIN_ONLINE_PAYMENT_PAISE = 1_00

// Money
export const CURRENCY = "INR"
// Tax rates are stored in basis points: 500 = 5%.
export const BASIS_POINTS_PER_UNIT = 10_000

// Time: restaurants keep local hours; servers run in UTC.
export const RESTAURANT_TIME_ZONE = "Asia/Kolkata"

// Text fields sent by the browser at checkout.
export const TEXT_LIMITS = {
  customerName: 80,
  addressLine: 200,
  landmark: 120,
  cancelReason: 200,
  idempotencyKey: 100,
} as const

// URL segments used by the app itself. A restaurant slug cannot be one of these,
// since /<slug> is the restaurant's storefront.
export const RESERVED_SLUGS = [
  "account",
  "admin",
  "api",
  "auth",
  "dashboard",
  "kitchen",
  "login",
  "logout",
  "_next",
] as const
