// Manual check of placeOrder against the local database (run `pnpm db:reset` first).
// Places a cash pickup order at Casa Spezia, repeats it with the same
// idempotency key, then tries orders that must be refused. Cleans up after.
import { config } from "dotenv"
config({ path: "../../.env", quiet: true })
const { prisma } = await import("@workspace/db")
const { placeOrder } = await import("../src/orders/place-order")

const casa = await prisma.restaurant.findUniqueOrThrow({
  where: { slug: "casa-spezia" },
  include: { locations: true },
})
const osteria = await prisma.restaurant.findUniqueOrThrow({
  where: { slug: "osteria-sole" },
  include: { menuItems: true },
})
const kharar = casa.locations.find((l) => l.name === "Kharar")!
const customer = await prisma.profile.findFirstOrThrow({
  where: { phone: "919999900001" },
})
const dish = (t: string) =>
  prisma.menuItem.findFirstOrThrow({
    where: { restaurantId: casa.id, title: t },
  })
const [tikka, roti] = await Promise.all([
  dish("Achari Paneer Tikka"),
  dish("Rumali Roti"),
])
const noon = new Date("2026-09-28T12:00:00+05:30")
const base = {
  restaurantId: casa.id,
  locationId: kharar.id,
  fulfillment: "pickup",
  paymentMethod: "cod",
  customerName: "Test Customer",
  items: [
    { menuItemId: tikka.id, qty: 2 },
    { menuItemId: roti.id, qty: 3 },
  ],
  idempotencyKey: "check-" + Date.now(),
}

const o = await placeOrder(customer.id, base, noon)
console.log(
  `placed #${o.number} ${o.status}: subtotal ${o.subtotalPaise}, packaging ${o.packagingFeePaise}, tax ${o.taxPaise}, total ${o.totalPaise}; items: ${o.items.map((i) => `${i.qty}x ${i.title} @ ${i.unitPricePaise}`).join(", ")}`
)
const again = await placeOrder(customer.id, base, noon)
console.log(
  `same key again -> #${again.number} (same order: ${again.id === o.id})`
)

const attempt = async (label: string, input: object, when = noon) => {
  try {
    await placeOrder(
      customer.id,
      { ...base, idempotencyKey: "check-" + Math.random(), ...input },
      when
    )
    console.log(label, "-> accepted")
  } catch (e) {
    const err = e as { code?: string; message: string }
    console.log(label.padEnd(34), "->", err.code, "|", err.message)
  }
}
await attempt("at 03:00 IST", {}, new Date("2026-09-28T03:00:00+05:30"))
await attempt("delivery to Mohali (~7 km)", {
  fulfillment: "delivery",
  address: { line1: "Phase 7, Mohali", lat: 30.7046, lng: 76.7179 },
})
await attempt("delivery without address", { fulfillment: "delivery" })
await attempt("Osteria Sole dish at Casa Spezia", {
  items: [{ menuItemId: osteria.menuItems[0]!.id, qty: 1 }],
})
// Whole category archived: its dishes can no longer be ordered.
await prisma.category.update({
  where: { id: tikka.categoryId },
  data: { archivedAt: new Date() },
})
await attempt("dish in an archived category", {})
await prisma.category.update({
  where: { id: tikka.categoryId },
  data: { archivedAt: null },
})

// Broken hours stored for the outlet: treated as closed, not a crash.
await prisma.location.update({
  where: { id: kharar.id },
  data: { hours: { mon: [["9am", "late"]] } },
})
await attempt("outlet with invalid stored hours", {})
await prisma.location.update({
  where: { id: kharar.id },
  data: { hours: kharar.hours as object },
})

const p = await placeOrder(
  customer.id,
  {
    ...base,
    idempotencyKey: "check-price-" + Date.now(),
    items: [{ menuItemId: tikka.id, qty: 1, pricePaise: 1 }],
  } as object,
  noon
)
console.log(
  `price sent by the browser is ignored: charged ${p.items[0]!.unitPricePaise} paise, not 1`
)
await prisma.order.deleteMany({
  where: { idempotencyKey: { startsWith: "check-" } },
})
await prisma.$disconnect()
