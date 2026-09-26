"use client"

import { useSyncExternalStore } from "react"

// The cart lives in the browser (localStorage), one per restaurant. It holds
// only what the customer chose: dishes, quantities, outlet, delivery or pickup.
// No prices: the page shows them from the menu and the server recomputes
// everything at checkout. A synced server-side cart is backlog item #1.

export type Fulfillment = "delivery" | "pickup"
export type CartLine = { menuItemId: string; qty: number }
export type Cart = {
  lines: CartLine[]
  locationId: string | null
  fulfillment: Fulfillment
}

// Same limit the server enforces; the server's check is the one that counts.
export const MAX_QTY_PER_LINE = 50

const EMPTY_CART: Cart = {
  lines: [],
  locationId: null,
  fulfillment: "delivery",
}
const storageKey = (slug: string) => `biscotti:cart:${slug}`

// Anything unexpected in storage (old format, hand-edited) becomes an empty cart.
function parse(raw: string | null): Cart {
  if (!raw) return EMPTY_CART
  try {
    const data = JSON.parse(raw) as Partial<Cart>
    const lines = Array.isArray(data.lines)
      ? data.lines.filter(
          (l): l is CartLine =>
            typeof l?.menuItemId === "string" &&
            Number.isInteger(l.qty) &&
            l.qty > 0 &&
            l.qty <= MAX_QTY_PER_LINE
        )
      : []
    return {
      lines,
      locationId: typeof data.locationId === "string" ? data.locationId : null,
      fulfillment: data.fulfillment === "pickup" ? "pickup" : "delivery",
    }
  } catch {
    return EMPTY_CART
  }
}

// useSyncExternalStore needs the same object back while nothing changed.
const snapshots = new Map<string, { raw: string | null; cart: Cart }>()

function readCart(slug: string): Cart {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(storageKey(slug))
  } catch {
    // Storage blocked (private mode, disabled site data): behave as empty.
  }
  const cached = snapshots.get(slug)
  if (cached && cached.raw === raw) return cached.cart
  const cart = parse(raw)
  snapshots.set(slug, { raw, cart })
  return cart
}

const listeners = new Set<() => void>()

function writeCart(slug: string, cart: Cart) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(cart))
  } catch {
    // Storage full or blocked: the cart just won't persist.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keeps other tabs of the same site in sync.
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function useCart(slug: string) {
  const cart = useSyncExternalStore(
    subscribe,
    () => readCart(slug),
    () => EMPTY_CART
  )

  const update = (change: (current: Cart) => Cart) =>
    writeCart(slug, change(readCart(slug)))

  const setQty = (menuItemId: string, qty: number) =>
    update((c) => {
      const clamped = Math.max(0, Math.min(MAX_QTY_PER_LINE, qty))
      const others = c.lines.filter((l) => l.menuItemId !== menuItemId)
      const existing = c.lines.find((l) => l.menuItemId === menuItemId)
      if (clamped === 0) return { ...c, lines: others }
      if (!existing)
        return { ...c, lines: [...c.lines, { menuItemId, qty: clamped }] }
      return {
        ...c,
        lines: c.lines.map((l) =>
          l.menuItemId === menuItemId ? { ...l, qty: clamped } : l
        ),
      }
    })

  const qtyOf = (menuItemId: string) =>
    cart.lines.find((l) => l.menuItemId === menuItemId)?.qty ?? 0

  return {
    cart,
    count: cart.lines.reduce((sum, l) => sum + l.qty, 0),
    qtyOf,
    add: (menuItemId: string) => setQty(menuItemId, qtyOf(menuItemId) + 1),
    decrement: (menuItemId: string) =>
      setQty(menuItemId, qtyOf(menuItemId) - 1),
    setQty,
    setLocation: (locationId: string) => update((c) => ({ ...c, locationId })),
    setFulfillment: (fulfillment: Fulfillment) =>
      update((c) => ({ ...c, fulfillment })),
    clear: () => update(() => EMPTY_CART),
  }
}
