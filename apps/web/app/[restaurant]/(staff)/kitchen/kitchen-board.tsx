"use client"

import type { KitchenOrder } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import { BellOff, BellRing, LoaderCircle, Phone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

import { eyebrow, solidButton } from "@/components/styles"
import { formatRupees } from "@/lib/money"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { callAction } from "@/lib/call-action"

import { moveOrderAction } from "./actions"

type Status = KitchenOrder["status"]
type Order = KitchenOrder & { next: Status[] }
type Outlet = { id: string; name: string }

const COLUMNS: { title: string; statuses: Status[] }[] = [
  { title: "New", statuses: ["PLACED"] },
  { title: "Cooking", statuses: ["ACCEPTED", "PREPARING"] },
  { title: "Ready / out", statuses: ["READY", "OUT_FOR_DELIVERY"] },
  {
    title: "Done, last hour",
    statuses: ["DELIVERED", "PICKED_UP", "REJECTED", "CANCELLED"],
  },
]

// Button text for each status an order can move to.
const ACTION_LABEL: Partial<Record<Status, string>> = {
  ACCEPTED: "Accept",
  PREPARING: "Start cooking",
  READY: "Mark ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  PICKED_UP: "Picked up",
  REJECTED: "Reject",
  CANCELLED: "Cancel",
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "New",
  ACCEPTED: "Accepted",
  PREPARING: "Cooking",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  PICKED_UP: "Picked up",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

// Moves that end an order ask for a reason (shown to the customer).
const NEEDS_REASON: Status[] = ["REJECTED", "CANCELLED"]

export function KitchenBoard({
  restaurantId,
  slug,
  outlets,
  outletId,
  orders,
}: {
  restaurantId: string
  slug: string
  outlets: Outlet[]
  outletId: string | null
  orders: Order[]
}) {
  const router = useRouter()
  const [soundOn, setSoundOn] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  useLiveOrders(restaurantId)

  // Chime when a new order arrives (not for the ones already on screen when
  // the page loaded).
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const placed = orders.filter((o) => o.status === "PLACED").map((o) => o.id)
    if (seen.current) {
      const fresh = placed.filter((id) => !seen.current!.has(id))
      if (fresh.length > 0 && soundOn && audio.current) chime(audio.current)
    }
    seen.current = new Set([...(seen.current ?? []), ...placed])
  }, [orders, soundOn])

  // Waiting orders in the tab title, visible from other tabs.
  const waiting = orders.filter((o) => o.status === "PLACED").length
  const inProgress = orders.filter((o) =>
    ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status)
  ).length
  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting}) New orders` : "Kitchen"
  }, [waiting])

  // Browsers only allow sound after a tap, so sound is a button. It also keeps
  // the screen awake, since a kitchen tablet should not go to sleep.
  async function toggleSound() {
    if (soundOn) {
      setSoundOn(false)
      await wakeLock.current?.release()
      wakeLock.current = null
      return
    }
    audio.current ??= new AudioContext()
    await audio.current.resume()
    chime(audio.current)
    setSoundOn(true)
    try {
      wakeLock.current = await navigator.wakeLock?.request("screen")
    } catch {
      // Not supported or denied: the board still works.
    }
  }

  function chooseOutlet(id: string) {
    router.replace(id ? `/${slug}/kitchen?outlet=${id}` : `/${slug}/kitchen`)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-4xl font-medium tracking-tight">
            Kitchen
          </h1>
          <span className={`${eyebrow} text-(--sf-muted)`}>
            {waiting} new · {inProgress} in progress
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={outletId ?? ""}
            onChange={(e) => chooseOutlet(e.target.value)}
            aria-label="Outlet"
            className="h-10 rounded-(--sf-radius-control) bg-(--sf-card) px-3 text-sm ring-1 ring-(--sf-line) outline-none"
          >
            <option value="">All outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className={cn(
              `${eyebrow} inline-flex h-10 items-center gap-2 rounded-(--sf-radius-control) px-4 ring-1 transition`,
              soundOn
                ? "bg-(--sf-ink) text-(--sf-bg) ring-(--sf-ink)"
                : "bg-(--sf-card) text-(--sf-ink) ring-(--sf-line)"
            )}
          >
            {soundOn ? (
              <BellRing className="size-4" />
            ) : (
              <BellOff className="size-4" />
            )}
            {soundOn ? "Sound on" : "Turn on sound"}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const list = orders.filter((o) => column.statuses.includes(o.status))
          const done = column.statuses.includes("DELIVERED")
          return (
            <section
              key={column.title}
              className={cn(
                "flex flex-col gap-3 rounded-(--sf-radius-card) p-3",
                done ? "bg-transparent" : "bg-(--sf-soft)"
              )}
            >
              <h2
                className={`${eyebrow} flex items-center justify-between px-1 pt-1 text-(--sf-muted)`}
              >
                {column.title}
                <span className="tabular-nums">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <p className="px-1 pb-2 text-sm text-(--sf-muted)">
                  {done ? "Nothing yet." : "No orders."}
                </p>
              ) : (
                list.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showOutlet={!outletId && outlets.length > 1}
                    compact={done}
                  />
                ))
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  showOutlet,
  compact,
}: {
  order: Order
  showOutlet: boolean
  compact: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isNew = order.status === "PLACED"
  const address = order.deliveryAddress as {
    line1?: string
    landmark?: string
  } | null

  // Main action first (Accept, Mark ready...); ending moves (Reject, Cancel)
  // as a small link.
  const main = order.next.filter((s) => !NEEDS_REASON.includes(s))
  const ending = order.next.filter((s) => NEEDS_REASON.includes(s))

  function move(to: Status) {
    let reason: string | undefined
    if (NEEDS_REASON.includes(to)) {
      const answer = window.prompt(
        `${ACTION_LABEL[to]} order #${order.number}? Reason for the customer:`,
        to === "REJECTED" ? "The kitchen is too busy right now" : ""
      )
      if (answer === null) return
      reason = answer
    }
    setError(null)
    startTransition(async () => {
      const result = await callAction(() =>
        moveOrderAction({ orderId: order.id, to, reason })
      )
      if (!result.ok) setError(result.error)
      router.refresh()
    })
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-(--sf-radius-card) bg-(--sf-card) p-4 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line)",
        isNew && "animate-in ring-2 ring-(--brand) duration-500 fade-in",
        compact && "gap-1 py-3 opacity-70 shadow-none"
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-display text-3xl leading-none font-medium lining-nums">
            #{order.number}
          </span>
          <span className={`${eyebrow} mt-1.5 text-[0.6rem] text-(--sf-muted)`}>
            {order.fulfillment === "delivery" ? "Delivery" : "Pickup"}
            {showOutlet && ` · ${order.location.name}`}
          </span>
        </div>
        {compact ? (
          <span className={`${eyebrow} text-[0.6rem] text-(--sf-muted)`}>
            {STATUS_LABEL[order.status]}
          </span>
        ) : (
          <Elapsed since={order.createdAt} urgent={isNew} />
        )}
      </header>

      {!compact && (
        <>
          <ul className="flex flex-col gap-1 border-y border-(--sf-line) py-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-2 text-base">
                <span className="w-7 font-semibold tabular-nums">
                  {item.qty}×
                </span>
                <span className="flex-1">{item.title}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{order.customerName}</span>
              <a
                href={`tel:+${order.customerPhone.replace(/^\+/, "")}`}
                className="inline-flex items-center gap-1 text-(--sf-muted) hover:text-(--sf-ink)"
              >
                <Phone className="size-3.5" /> Call
              </a>
            </div>
            {order.fulfillment === "delivery" && address?.line1 && (
              <p className="text-(--sf-muted)">
                {address.line1}
                {address.landmark && `, near ${address.landmark}`}
              </p>
            )}
            <p
              className={cn(
                "font-medium",
                order.paymentMethod === "cod"
                  ? "text-(--brand)"
                  : "text-emerald-700"
              )}
            >
              {order.paymentMethod === "cod"
                ? `Collect ${formatRupees(order.totalPaise)} cash`
                : `Paid online · ${formatRupees(order.totalPaise)}`}
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-(--brand)">
              {error}
            </p>
          )}

          {main.length > 0 && (
            <div className="flex flex-col gap-2">
              {main.map((to) => (
                <button
                  key={to}
                  type="button"
                  disabled={pending}
                  onClick={() => move(to)}
                  className={`${solidButton} h-12 w-full disabled:opacity-60`}
                >
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    ACTION_LABEL[to]
                  )}
                </button>
              ))}
            </div>
          )}
          {ending.map((to) => (
            <button
              key={to}
              type="button"
              disabled={pending}
              onClick={() => move(to)}
              className={`${eyebrow} self-center text-[0.62rem] text-(--sf-muted) underline-offset-4 hover:text-(--brand) hover:underline`}
            >
              {ACTION_LABEL[to]}
            </button>
          ))}
        </>
      )}
      {compact && order.cancelReason && (
        <p className="text-xs text-(--sf-muted)">{order.cancelReason}</p>
      )}
    </article>
  )
}

// Minutes since the order came in; new orders turn urgent after 5 minutes.
function Elapsed({ since, urgent }: { since: Date; urgent: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(since).getTime()) / 60_000)
  )
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap tabular-nums",
        urgent && minutes >= 5
          ? "bg-(--brand) text-white"
          : "bg-(--sf-soft) text-(--sf-muted)"
      )}
    >
      {minutes < 1 ? "just now" : `${minutes} min`}
    </span>
  )
}

// Refresh the board whenever an order of this restaurant changes. Realtime
// only delivers rows this staff member may read (RLS: members of the
// restaurant). Polling every 20s covers a dropped connection.
function useLiveOrders(restaurantId: string) {
  const router = useRouter()
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase.channel(`kitchen-${restaurantId}`)
    let cancelled = false
    let pending: ReturnType<typeof setTimeout> | undefined
    // Several changes in a burst cause one refresh.
    const refresh = () => {
      clearTimeout(pending)
      pending = setTimeout(() => router.refresh(), 150)
    }
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          refresh
        )
        .subscribe()
    })
    const poll = setInterval(() => router.refresh(), 20_000)
    return () => {
      cancelled = true
      clearTimeout(pending)
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [restaurantId, router])
}

// Two short notes, loud enough for a busy kitchen.
function chime(ctx: AudioContext) {
  const start = ctx.currentTime
  for (const [offset, freq] of [
    [0, 880],
    [0.18, 1320],
  ] as const) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    osc.type = "sine"
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.4, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start + offset)
    osc.stop(start + offset + 0.4)
  }
}
