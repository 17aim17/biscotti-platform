"use client"

import { LoaderCircle, MapPin, Search } from "lucide-react"
import { useEffect, useId, useState } from "react"

import type { Pin } from "@/components/delivery-map"
import { searchPlaces, type Place } from "./geocode"

// The search box above the map. It always shows the address of the pin
// (`label`, owned by the checkout form) unless the customer is typing a new
// search. Only typing searches: picking a suggestion or moving the pin
// changes the label without opening the list again.
export function LocationSearch({
  label,
  near,
  onPick,
}: {
  label: string
  near: Pin
  onPick: (place: Place) => void
}) {
  const listId = useId()
  // What the customer typed; null when they are not editing.
  const [typed, setTyped] = useState<string | null>(null)
  const [results, setResults] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)

  const query = typed?.trim() ?? ""
  const { lat, lng } = near

  // Search shortly after typing stops; a newer query cancels the older request.
  useEffect(() => {
    if (query.length < 3) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setBusy(true)
      try {
        setResults(await searchPlaces(query, { lat, lng }, controller.signal))
        setActive(0)
        setError(null)
      } catch (e) {
        if (controller.signal.aborted) return
        console.warn("[search]", e)
        setError("Search isn't available right now. Tap the map instead.")
        setResults(null)
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, lat, lng])

  // Leave editing: the box goes back to showing the pin's address.
  function stopEditing() {
    setTyped(null)
    setResults(null)
    setBusy(false)
  }

  function pick(place: Place) {
    onPick(place)
    stopEditing()
  }

  const open = typed !== null && query.length >= 3 && results !== null

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      stopEditing()
      return
    }
    if (!open) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault()
      pick(results[active])
    }
  }

  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">Search for your area or street</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-(--sf-muted)"
          strokeWidth={1.5}
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          value={typed ?? label}
          onChange={(e) => setTyped(e.target.value)}
          // Select the current address so typing replaces it.
          onFocus={(e) => e.target.select()}
          onBlur={stopEditing}
          onKeyDown={onKeyDown}
          placeholder="Search for your area, street or landmark"
          autoComplete="off"
          className="h-12 w-full truncate rounded-(--sf-radius-control) bg-(--sf-card) pr-11 pl-11 text-base ring-1 ring-(--sf-line) transition outline-none focus:ring-2 focus:ring-(--sf-ink)"
        />
        {busy && (
          <LoaderCircle className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-(--sf-muted)" />
        )}
      </label>
      {error && <p className="mt-2 text-sm text-(--brand)">{error}</p>}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-[1000] mt-2 overflow-hidden rounded-(--sf-radius-card) bg-(--sf-card) shadow-(--sf-shadow-card) ring-1 ring-(--sf-line)"
        >
          {results.length === 0 ? (
            <li className="p-4 text-sm text-(--sf-muted)">
              No places found. Try a nearby landmark, or tap the map.
            </li>
          ) : (
            results.map((place, i) => (
              <li
                key={`${place.pin.lat},${place.pin.lng},${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: runs before the input loses focus.
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(place)
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 border-b border-(--sf-line) p-4 text-sm last:border-0 ${i === active ? "bg-(--sf-soft)" : ""}`}
              >
                <MapPin className="size-4 shrink-0 text-(--sf-muted)" />
                {place.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
