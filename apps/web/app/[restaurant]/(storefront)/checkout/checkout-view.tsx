"use client"

import type { MenuCategory, RestaurantSummary } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeft, Crosshair, LoaderCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { useCart, type Fulfillment } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { eyebrow, inputClass, solidButton } from "@/components/styles"
import { payAndConfirm } from "../_components/pay"
import { placeOrderAction, quoteAction } from "./actions"
import { DeliveryMap, type Pin } from "@/components/delivery-map"
import { addressAt } from "./geocode"
import { LocationSearch } from "./location-search"

type Location = RestaurantSummary["locations"][number]
type Quote = Extract<
  Awaited<ReturnType<typeof quoteAction>>,
  { ok: true }
>["data"]
type PaymentMethod = "online" | "cod"

export function CheckoutView({
  slug,
  restaurantId,
  restaurantName,
  brandColor,
  locations,
  categories,
  defaultName,
  phone,
}: {
  slug: string
  restaurantId: string
  restaurantName: string
  brandColor: string
  locations: Location[]
  categories: MenuCategory[]
  defaultName: string
  phone: string | null
}) {
  const router = useRouter()
  const { cart, setLocation, setFulfillment, clear } = useCart(slug)

  const [name, setName] = useState(defaultName)
  const [pin, setPin] = useState<Pin | null>(null)
  // The address of the pin, shown in the search box. `pin` records which pin
  // it describes, so a moved pin is known to need a new lookup.
  const [pinAddress, setPinAddress] = useState<{
    pin: Pin
    text: string
  } | null>(null)
  const [house, setHouse] = useState("")
  const [landmark, setLandmark] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online")
  // The server's latest answer, tagged with the inputs it was priced for.
  const [quoted, setQuoted] = useState<{
    key: string
    quote: Quote | null
    error: string | null
  } | null>(null)
  // Set once the order exists, so a cleared cart does not read as "empty"
  // while the page moves on to the order.
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  // One key per checkout attempt: a double click or a retried request cannot
  // create a second order.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  // Only dishes still on the menu and available; the server checks again.
  const available = useMemo(
    () =>
      new Set(
        categories.flatMap((c) =>
          c.menuItems.filter((d) => d.isAvailable).map((d) => d.id)
        )
      ),
    [categories]
  )
  const items = useMemo(
    () =>
      cart.lines
        .filter((l) => available.has(l.menuItemId))
        .map(({ menuItemId, qty }) => ({ menuItemId, qty })),
    [cart.lines, available]
  )

  const outlet =
    locations.find((l) => l.id === cart.locationId) ??
    locations.find((l) => l.openNow) ??
    locations[0]
  const fulfillment: Fulfillment =
    cart.fulfillment === "pickup" && outlet?.acceptsPickup
      ? "pickup"
      : "delivery"
  const cashAllowed = outlet?.acceptsCod ?? false
  const method: PaymentMethod = cashAllowed ? paymentMethod : "online"

  // What the current total depends on. A quote for other inputs (say, the
  // delivery total just after switching to pickup) is not shown or used.
  const quoteKey = JSON.stringify([outlet?.id, fulfillment, pin, items])
  const current = quoted?.key === quoteKey ? quoted : null
  const quote = current?.quote ?? null
  const quoteError = current?.error ?? null

  // Ask the server for totals whenever the order changes. The request is
  // debounced so dragging the pin does not send one request per frame.
  useEffect(() => {
    if (!outlet || items.length === 0) return
    let stale = false
    const timer = setTimeout(async () => {
      let next: { quote: Quote | null; error: string | null }
      try {
        const result = await quoteAction({
          restaurantId,
          locationId: outlet.id,
          fulfillment,
          pin: fulfillment === "delivery" && pin ? pin : undefined,
          items,
        })
        next = result.ok
          ? { quote: result.data, error: null }
          : { quote: null, error: result.error }
      } catch {
        next = {
          quote: null,
          error: "Couldn't reach the restaurant. Check the connection.",
        }
      }
      if (!stale) setQuoted({ key: quoteKey, ...next })
    }, 300)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [restaurantId, outlet, fulfillment, pin, items, quoteKey])

  // Pin moved on the map (tap, drag, my location): look up its address once
  // it stops moving. Search picks arrive with their address already.
  useEffect(() => {
    if (!pin || pinAddress?.pin === pin) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      let text
      try {
        text = await addressAt(pin, controller.signal)
      } catch {
        if (controller.signal.aborted) return
        text = `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
      }
      setPinAddress({ pin, text })
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [pin, pinAddress])

  if (placedOrderId) {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <p className="font-display text-4xl font-medium">Order placed</p>
        <Link
          href={`/${slug}/orders/${placedOrderId}`}
          className={`${solidButton} px-8 py-3.5`}
        >
          See your order
        </Link>
      </div>
    )
  }

  if (!outlet || items.length === 0) {
    // Tell apart an empty cart, a cart of sold-out dishes, and a restaurant
    // with no outlets.
    const [title, text, href, label] = !outlet
      ? [
          "Not taking orders",
          "This restaurant isn't taking online orders yet.",
          `/${slug}`,
          "Back to the menu",
        ]
      : cart.lines.length > 0
        ? [
            "Nothing to order right now",
            "The dishes in your cart are sold out or no longer on the menu.",
            `/${slug}/cart`,
            "Review your cart",
          ]
        : [
            "Your cart is empty",
            "Add a few dishes from the menu first.",
            `/${slug}#menu`,
            "Browse the menu",
          ]
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <p className="font-display text-4xl font-medium">{title}</p>
        <p className="text-(--sf-muted)">{text}</p>
        <Link href={href} className={`${solidButton} px-8 py-3.5`}>
          {label}
        </Link>
      </div>
    )
  }

  const needsAddress = fulfillment === "delivery"
  const area = pin && pinAddress?.pin === pin ? pinAddress.text : null
  const missing = [
    !name.trim() && "your name",
    needsAddress && !pin && "a pin on the map",
    needsAddress && !house.trim() && "your house or flat number",
  ].filter(Boolean) as string[]
  const canPlace =
    !placing &&
    quote !== null &&
    missing.length === 0 &&
    // Wait for the pin's address before placing a delivery order.
    (!needsAddress || area !== null)

  function locateMe() {
    const unavailable =
      "Couldn't get your location. Search for it or tap the map instead."
    if (!navigator.geolocation) {
      setLocateError(unavailable)
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocating(false)
      },
      // Permission denied, no signal, or timed out.
      () => {
        setLocating(false)
        setLocateError(unavailable)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function submit() {
    if (!canPlace || !outlet) return
    setPlacing(true)
    setPlaceError(null)
    let placed
    try {
      placed = await placeOrderAction({
        restaurantId,
        locationId: outlet.id,
        fulfillment,
        paymentMethod: method,
        customerName: name,
        address:
          needsAddress && pin && area
            ? {
                line1: `${house.trim()}, ${area}`.slice(0, 200),
                landmark: landmark || undefined,
                ...pin,
              }
            : undefined,
        items,
        idempotencyKey,
      })
    } catch {
      // No answer: the order may or may not exist. Trying again is safe,
      // because the same idempotency key cannot create a second order.
      setPlaceError("Couldn't reach the restaurant. Please try again.")
      setPlacing(false)
      return
    }
    if (!placed.ok) {
      setPlaceError(placed.error)
      setPlacing(false)
      return
    }
    // The order exists now: the cart has done its job, and whatever happens
    // with the payment, the order page is where the customer goes next.
    const { orderId, payment } = placed.data
    setPlacedOrderId(orderId)
    clear()
    try {
      if (payment) {
        // Paid or not, the order page shows where things stand (and offers
        // "Pay now" if the window was closed).
        await payAndConfirm(payment, {
          restaurantName,
          phone,
          color: brandColor,
        })
      }
    } finally {
      router.push(`/${slug}/orders/${orderId}`)
    }
  }

  const payLabel =
    method === "online"
      ? `Pay ${quote ? formatRupees(quote.totals.totalPaise) : ""}`
      : "Place order"

  return (
    <div className="flex flex-col gap-10 pb-32 lg:pb-16">
      <div className="flex flex-col gap-4">
        <Link
          href={`/${slug}/cart`}
          className={`${eyebrow} inline-flex w-fit items-center gap-2 text-(--sf-muted) transition hover:text-(--sf-ink)`}
        >
          <ArrowLeft className="size-3.5" /> Back to cart
        </Link>
        <h1 className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
          Checkout
        </h1>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        <div className="flex flex-col gap-12">
          <Step number="01" title="How and where">
            <Choice
              label="Fulfillment"
              options={[
                { value: "delivery", label: "Delivery" },
                {
                  value: "pickup",
                  label: "Pickup",
                  disabled: !outlet.acceptsPickup,
                },
              ]}
              value={fulfillment}
              onChange={(v) => setFulfillment(v as Fulfillment)}
            />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {locations.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocation(l.id)}
                  aria-pressed={l.id === outlet.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-(--sf-radius-card) bg-(--sf-card) p-3 text-left ring-1 transition sm:p-4",
                    l.id === outlet.id
                      ? "ring-2 ring-(--sf-ink)"
                      : "ring-(--sf-line) hover:ring-(--sf-muted)"
                  )}
                >
                  <span className="truncate font-display text-lg sm:text-xl">
                    {l.name}
                  </span>
                  <span className="hidden text-xs text-(--sf-muted) sm:block">
                    {l.address}
                  </span>
                  <span
                    className={`${eyebrow} mt-1 text-[0.6rem] ${l.openNow ? "text-emerald-700" : "text-(--sf-muted)"}`}
                  >
                    {l.openNow ? "Open now" : "Closed"}
                  </span>
                </button>
              ))}
            </div>
          </Step>

          <Step number="02" title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  className={inputClass}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={phone ? `+${phone}` : ""}
                  readOnly
                  className={cn(inputClass, "text-(--sf-muted)")}
                />
              </Field>
            </div>
          </Step>

          {needsAddress && (
            <Step number="03" title="Delivery address">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-(--sf-muted)">
                  Search, tap the map or drag the pin to your door. We deliver
                  inside the circle.
                </p>
                <button
                  type="button"
                  onClick={locateMe}
                  disabled={locating}
                  className={`${eyebrow} inline-flex items-center gap-2 text-(--sf-ink) underline-offset-4 hover:underline disabled:opacity-60`}
                >
                  {locating ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Crosshair className="size-3.5" />
                  )}
                  Use my location
                </button>
              </div>
              <LocationSearch
                label={pin ? (area ?? "Finding the address…") : ""}
                near={{ lat: outlet.lat, lng: outlet.lng }}
                onPick={(place) => {
                  setPin(place.pin)
                  setPinAddress({ pin: place.pin, text: place.label })
                }}
              />
              {locateError && (
                <p role="alert" className="-mt-2 text-sm text-(--brand)">
                  {locateError}
                </p>
              )}
              <DeliveryMap
                outlet={{
                  name: outlet.name,
                  lat: outlet.lat,
                  lng: outlet.lng,
                  radiusM: outlet.deliveryRadiusM,
                }}
                pin={pin}
                onPinChange={setPin}
              />
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field label="House, flat, floor">
                  <input
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    autoComplete="address-line1"
                    maxLength={60}
                    className={inputClass}
                  />
                </Field>
                <Field label="Landmark (optional)">
                  <input
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    maxLength={120}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Step>
          )}

          <Step number={needsAddress ? "04" : "03"} title="Payment">
            <Choice
              label="Payment method"
              options={[
                { value: "online", label: "Pay online" },
                {
                  value: "cod",
                  label:
                    fulfillment === "pickup"
                      ? "Pay at pickup"
                      : "Cash on delivery",
                  disabled: !cashAllowed,
                },
              ]}
              value={method}
              onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            />
            {method === "online" && (
              <p className="text-sm text-(--sf-muted)">
                UPI, cards and netbanking through Razorpay. This demo uses
                Razorpay test mode, so no real money is charged.
              </p>
            )}
          </Step>
        </div>

        <aside className="flex flex-col gap-5 rounded-(--sf-radius-card) bg-(--sf-card) p-6 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) sm:p-8 lg:sticky lg:top-28">
          <p className={`${eyebrow} text-(--sf-muted)`}>Your order</p>
          <p className="-mt-3 font-display text-3xl font-medium">
            {outlet.name} · {fulfillment === "delivery" ? "Delivery" : "Pickup"}
          </p>

          {quote ? (
            <>
              <ul className="flex flex-col gap-3 border-y border-(--sf-line) py-5 text-sm">
                {quote.lines.map((l) => (
                  <li key={l.menuItemId} className="flex gap-3">
                    <span className="w-6 text-(--sf-muted) tabular-nums">
                      {l.qty}×
                    </span>
                    <span className="flex-1">{l.title}</span>
                    <span className="tabular-nums">
                      {formatRupees(l.lineTotalPaise)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="flex flex-col gap-2 text-sm">
                <Row label="Subtotal" paise={quote.totals.subtotalPaise} />
                {fulfillment === "delivery" && (
                  <Row label="Delivery" paise={quote.totals.deliveryFeePaise} />
                )}
                <Row label="Packaging" paise={quote.totals.packagingFeePaise} />
                <Row label="GST" paise={quote.totals.taxPaise} />
                <div className="mt-3 flex items-baseline justify-between border-t border-(--sf-ink)/80 pt-4">
                  <dt className={`${eyebrow} text-(--sf-ink)`}>Total</dt>
                  <dd className="font-display text-3xl font-medium tabular-nums">
                    {formatRupees(quote.totals.totalPaise)}
                  </dd>
                </div>
              </dl>
            </>
          ) : quoteError ? null : (
            <p className="flex items-center gap-2 py-6 text-sm text-(--sf-muted)">
              <LoaderCircle className="size-4 animate-spin" /> Pricing your
              order
            </p>
          )}

          {(placeError ?? quoteError) && (
            <p
              role="alert"
              className="rounded-(--sf-radius-control) bg-(--sf-soft) p-3 text-sm text-(--brand)"
            >
              {placeError ?? quoteError}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canPlace}
            className={`${solidButton} h-13 w-full disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {placing ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              payLabel
            )}
          </button>
          {missing.length > 0 && !quoteError && (
            <p className="text-center text-xs text-(--sf-muted)">
              Add {missing.join(", ")} to continue.
            </p>
          )}
          <p className="text-center text-xs text-(--sf-muted)">
            Prices are checked by the restaurant when you order.
          </p>
        </aside>
      </div>

      {/* Phones: total and the button stay in reach while filling the form. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-(--sf-line) bg-(--sf-bg)/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="flex flex-1 flex-col">
          <span className={`${eyebrow} text-[0.6rem] text-(--sf-muted)`}>
            Total
          </span>
          <span className="font-display text-2xl leading-tight font-medium tabular-nums">
            {quote ? formatRupees(quote.totals.totalPaise) : "…"}
          </span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!canPlace}
          className={`${solidButton} h-12 px-6 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {placing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : method === "online" ? (
            "Pay now"
          ) : (
            "Place order"
          )}
        </button>
      </div>
    </div>
  )
}

function Step({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline gap-4 border-b border-(--sf-ink)/80 pb-3">
        <span className="font-display text-lg text-(--sf-accent-ink) italic">
          {number}
        </span>
        <h2 className="font-display text-3xl font-medium tracking-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={`${eyebrow} text-(--sf-muted)`}>{label}</span>
      {children}
    </label>
  )
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string; disabled?: boolean }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-2 gap-3 sm:max-w-md"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-12 rounded-(--sf-radius-control) bg-(--sf-card) text-sm font-medium ring-1 transition disabled:cursor-not-allowed disabled:opacity-40",
            value === o.value
              ? "ring-2 ring-(--sf-ink)"
              : "ring-(--sf-line) hover:ring-(--sf-muted)"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Row({ label, paise }: { label: string; paise: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-(--sf-muted)">{label}</dt>
      <dd className="tabular-nums">{formatRupees(paise)}</dd>
    </div>
  )
}
