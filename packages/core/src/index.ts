// Business logic. Server only: importing this from a Client Component fails the
// build. Scripts outside Next.js run with `--conditions=react-server`.
import "server-only"

export { DomainError } from "./errors"

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
  listRestaurants,
  type MenuCategory,
  type MenuDish,
  type RestaurantSummary,
} from "./restaurants/queries"

export { Actor, nextStatuses } from "./orders/status"
export { placeOrder, quoteOrder } from "./orders/place-order"
// Named by the return types of Server Actions in apps/web.
export type { OrderTotals } from "./pricing"
export {
  getCustomerOrder,
  getProfile,
  listCustomerOrders,
  type CustomerOrder,
} from "./orders/queries"
export { updateOrderStatus } from "./orders/update-status"
export { listKitchenOrders, type KitchenOrder } from "./orders/kitchen"

// markPaid and the signature helpers stay internal: callers go through these.
export {
  confirmCheckoutPayment,
  handleRazorpayWebhook,
  startOnlinePayment,
  type MarkPaidResult,
} from "./payments/payments"

// Dashboard. Every function that reads or changes a restaurant checks the
// caller's permission first; staffPhone and findUserIdByPhone only help
// addStaffMember find the person.
export {
  countOrdersNeedingRefund,
  listRestaurantOrders,
  markPaymentRefunded,
  type OrderFilter,
} from "./dashboard/orders"
export {
  archiveCategory,
  archiveDish,
  createCategory,
  createDish,
  getMenuForEditing,
  moveCategory,
  renameCategory,
  setDishAvailable,
  updateDish,
  type EditableCategory,
  type EditableDish,
} from "./dashboard/menu"
export {
  createOutlet,
  getOutletsForEditing,
  updateOutlet,
  type EditableOutlet,
} from "./dashboard/outlets"
export {
  addStaffMember,
  changeStaffRole,
  findUserIdByPhone,
  listStaff,
  removeStaffMember,
  staffPhone,
} from "./dashboard/staff"
export {
  getSettingsForEditing,
  THEME_PRESETS,
  updateSettings,
  type ThemePreset,
} from "./dashboard/settings"
export { parseInput } from "./validation"
