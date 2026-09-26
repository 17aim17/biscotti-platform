"use client"

import type { EditableOutlet } from "@workspace/core"
import { Switch } from "@workspace/ui/components/switch"
import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { DeliveryMap } from "@/components/delivery-map"
import { eyebrow, inputClass, solidButton } from "@/components/styles"
import { callAction } from "@/lib/call-action"

import { FieldLabel } from "../_ui"
import { saveOutletAction } from "../actions"

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const
type Day = (typeof DAYS)[number][0]
type Span = [string, string]
type DayHours = { open: boolean; spans: Span[] }

// Stored hours ({ mon: [["12:00", "15:00"], ["18:00", "23:00"]] }) to form
// rows and back. Every span is kept, so lunch and dinner survive a save.
function toRows(hours: unknown): Record<Day, DayHours> {
  const stored = (hours ?? {}) as Partial<Record<Day, Span[]>>
  return Object.fromEntries(
    DAYS.map(([day]) => {
      const spans = stored[day] ?? []
      return [
        day,
        spans.length > 0
          ? { open: true, spans: spans.map(([a, b]) => [a, b] as Span) }
          : { open: false, spans: [["10:00", "22:30"]] as Span[] },
      ]
    })
  ) as Record<Day, DayHours>
}

function toHours(rows: Record<Day, DayHours>) {
  return Object.fromEntries(
    DAYS.filter(([day]) => rows[day].open).map(([day]) => [
      day,
      rows[day].spans,
    ])
  )
}

const rupees = (paise: number) => String(paise / 100)

export function OutletForm({
  slug,
  outlet,
  start,
}: {
  slug: string
  outlet: EditableOutlet | null
  start?: EditableOutlet | null
}) {
  const router = useRouter()
  const [pending, begin] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  )
  const base = outlet ?? start
  const [name, setName] = useState(outlet?.name ?? "")
  const [address, setAddress] = useState(outlet?.address ?? "")
  const [pin, setPin] = useState({
    lat: base?.lat ?? 30.7333,
    lng: base?.lng ?? 76.7794,
  })
  const [radiusKm, setRadiusKm] = useState(
    String((outlet?.deliveryRadiusM ?? 5000) / 1000)
  )
  const [rows, setRows] = useState(() => toRows(outlet?.hours ?? null))
  const [isOpen, setIsOpen] = useState(outlet?.isOpen ?? true)
  const [deliveryFee, setDeliveryFee] = useState(
    rupees(outlet?.deliveryFeePaise ?? 3000)
  )
  const [packagingFee, setPackagingFee] = useState(
    rupees(outlet?.packagingFeePaise ?? 2000)
  )
  const [taxPercent, setTaxPercent] = useState(
    String((outlet?.taxBps ?? 500) / 100)
  )
  const [acceptsCod, setAcceptsCod] = useState(outlet?.acceptsCod ?? true)
  const [acceptsPickup, setAcceptsPickup] = useState(
    outlet?.acceptsPickup ?? true
  )

  function save(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    begin(async () => {
      const result = await callAction(() =>
        saveOutletAction(slug, outlet?.id ?? null, {
          name,
          address,
          lat: pin.lat,
          lng: pin.lng,
          deliveryRadiusM: Math.round(Number(radiusKm) * 1000),
          hours: toHours(rows),
          isOpen,
          deliveryFeePaise: Math.round(Number(deliveryFee) * 100),
          packagingFeePaise: Math.round(Number(packagingFee) * 100),
          taxBps: Math.round(Number(taxPercent) * 100),
          acceptsCod,
          acceptsPickup,
        })
      )
      setMessage(
        result.ok
          ? { ok: true, text: outlet ? "Saved." : "Outlet added." }
          : { ok: false, text: result.error }
      )
      if (result.ok) {
        // The new outlet appears above; clear this form for the next one.
        if (!outlet) {
          setName("")
          setAddress("")
        }
        router.refresh()
      }
    })
  }

  const setDay = (day: Day, change: Partial<DayHours>) =>
    setRows((r) => ({ ...r, [day]: { ...r[day], ...change } }))
  const setSpan = (day: Day, index: number, span: Span) =>
    setDay(day, {
      spans: rows[day].spans.map((s, i) => (i === index ? span : s)),
    })

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--sf-line) pb-3">
        <h2 className="font-display text-3xl font-medium">
          {outlet ? outlet.name : "Add an outlet"}
        </h2>
        {outlet && (
          <label className="flex items-center gap-3">
            <Switch
              checked={isOpen}
              onCheckedChange={setIsOpen}
              className="data-checked:bg-emerald-700"
            />
            <span
              className={`${eyebrow} ${isOpen ? "text-emerald-700" : "text-(--brand)"}`}
            >
              {isOpen ? "Taking orders" : "Paused"}
            </span>
          </label>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <FieldLabel label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={200}
              required
              className={inputClass}
            />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-4">
            <FieldLabel label="Delivery area (km)">
              <input
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="GST (%)">
              <input
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Delivery fee (₹)">
              <input
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Packaging fee (₹)">
              <input
                value={packagingFee}
                onChange={(e) => setPackagingFee(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </FieldLabel>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptsCod}
                onChange={(e) => setAcceptsCod(e.target.checked)}
                className="accent-(--sf-ink)"
              />
              Accepts cash
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptsPickup}
                onChange={(e) => setAcceptsPickup(e.target.checked)}
                className="accent-(--sf-ink)"
              />
              Offers pickup
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`${eyebrow} text-(--sf-muted)`}>
            Position and delivery area
          </span>
          <DeliveryMap
            outlet={{
              name,
              lat: pin.lat,
              lng: pin.lng,
              radiusM: Math.max(100, Number(radiusKm) * 1000 || 100),
            }}
            pin={pin}
            onPinChange={setPin}
          />
          <span className="text-xs text-(--sf-muted)">
            Tap the map or drag the pin to the outlet&apos;s door.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className={`${eyebrow} text-(--sf-muted)`}>
          Opening hours (a close time before the open time runs past midnight;
          add a second period for lunch and dinner)
        </span>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {DAYS.map(([day, label]) => (
            // Fixed columns so every day's times line up.
            <div
              key={day}
              className="grid grid-cols-[7.5rem_1fr] items-start gap-3 text-sm"
            >
              <label className="flex h-10 items-center gap-2">
                <input
                  type="checkbox"
                  checked={rows[day].open}
                  onChange={(e) => setDay(day, { open: e.target.checked })}
                  className="accent-(--sf-ink)"
                />
                {label}
              </label>
              {rows[day].open ? (
                <div className="flex flex-col gap-2">
                  {rows[day].spans.map(([from, to], index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_auto_1fr_1.5rem] items-center gap-3"
                    >
                      <input
                        type="time"
                        value={from}
                        onChange={(e) =>
                          setSpan(day, index, [e.target.value, to])
                        }
                        className={`${inputClass} h-10 px-3`}
                      />
                      <span className="text-(--sf-muted)">to</span>
                      <input
                        type="time"
                        value={to}
                        onChange={(e) =>
                          setSpan(day, index, [from, e.target.value])
                        }
                        className={`${inputClass} h-10 px-3`}
                      />
                      {index > 0 ? (
                        <button
                          type="button"
                          aria-label="Remove these hours"
                          onClick={() =>
                            setDay(day, {
                              spans: rows[day].spans.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                          className="text-(--sf-muted) hover:text-(--brand)"
                        >
                          ×
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDay(day, {
                        spans: [...rows[day].spans, ["18:00", "23:00"]],
                      })
                    }
                    className={`${eyebrow} self-start text-[0.6rem] text-(--sf-muted) hover:text-(--sf-ink)`}
                  >
                    + add hours
                  </button>
                </div>
              ) : (
                <span className="flex h-10 items-center text-(--sf-muted)">
                  Closed
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className={`${solidButton} h-12 px-8 disabled:opacity-60`}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : outlet ? (
            "Save outlet"
          ) : (
            "Add outlet"
          )}
        </button>
        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? "text-emerald-700" : "text-(--brand)"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}
