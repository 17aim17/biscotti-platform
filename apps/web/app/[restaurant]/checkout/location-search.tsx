"use client"

import { LoaderCircle, MapPin, Search } from "lucide-react"
import { useEffect, useId, useState } from "react"

import type { Pin } from "./delivery-map"

export type Place = { label: string; pin: Pin }

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    district?: string
    locality?: string
    city?: string
    state?: string
    countrycode?: string
  }
}

// Suggestions while typing, from Photon (komoot's free OpenStreetMap search,
// built for search-as-you-type), weighted toward the outlet. The public
// server asks for fair use; a production app would use a paid or self-hosted
// geocoder (backlog).
const PHOTON_URL = "https://photon.komoot.io/api/"

function toPlace(f: PhotonFeature): Place {
  const p = f.properties
  const street = [p.housenumber, p.street].filter(Boolean).join(" ")
  const parts = [p.name, street, p.district ?? p.locality, p.city ?? p.state]
  const label = [...new Set(parts.filter(Boolean))].join(", ")
  const [lng, lat] = f.geometry.coordinates
  return { label, pin: { lat, lng } }
}

export function LocationSearch({
  near,
  onPick,
}: {
  near: Pin
  onPick: (place: Place) => void
}) {
  const listId = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  // The list only shows while the search box has focus, so it never stays
  // on top of the map.
  const [focused, setFocused] = useState(false)

  // Search shortly after typing stops; a newer query cancels the older request.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setBusy(true)
      // About 50 km around the outlet.
      const d = 0.5
      const params = new URLSearchParams({
        q,
        lang: "en",
        limit: "6",
        lat: String(near.lat),
        lon: String(near.lng),
        bbox: [near.lng - d, near.lat - d, near.lng + d, near.lat + d].join(),
      })
      try {
        const response = await fetch(`${PHOTON_URL}?${params}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(String(response.status))
        const data = (await response.json()) as { features: PhotonFeature[] }
        const places = data.features
          .filter((f) => f.properties.countrycode === "IN")
          .map(toPlace)
        setResults(places)
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
  }, [query, near.lat, near.lng])

  function pick(place: Place) {
    onPick(place)
    setQuery(place.label)
    setResults(null)
  }

  const open = focused && results !== null && query.trim().length >= 3

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !results) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === "Escape") {
      setFocused(false)
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
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim().length < 3) setResults(null)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search for your area, street or landmark"
          autoComplete="off"
          className="h-12 w-full rounded-(--sf-radius-control) bg-(--sf-card) pr-11 pl-11 text-base ring-1 ring-(--sf-line) transition outline-none focus:ring-2 focus:ring-(--sf-ink)"
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
                // mousedown, not click: fires before the input loses focus.
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
