"use client"

import "leaflet/dist/leaflet.css"

import type { Circle, LeafletMouseEvent, Map, Marker } from "leaflet"
import { useEffect, useRef } from "react"

export type Pin = { lat: number; lng: number }
export type MapOutlet = Pin & { name: string; radiusM: number }

// OpenStreetMap map for the delivery pin: the outlet's delivery area as a
// circle, and a marker the customer drags or places by tapping the map.
// Leaflet uses `window` when it loads, so it is imported inside the effect.
export function DeliveryMap({
  outlet,
  pin,
  onPinChange,
}: {
  outlet: MapOutlet
  pin: Pin | null
  onPinChange: (pin: Pin) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const area = useRef<Circle | null>(null)
  const marker = useRef<Marker | null>(null)
  const outletMarker = useRef<Marker | null>(null)
  // Latest values without re-running the effects that use them.
  const onChange = useRef(onPinChange)
  const start = useRef(pin ?? outlet)
  useEffect(() => {
    onChange.current = onPinChange
  })

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    void import("leaflet").then((L) => {
      if (cancelled || !container.current || map.current) return
      // A map needs a view before anything can be measured on it.
      const m = L.map(container.current, {
        scrollWheelZoom: false,
        // Half steps let the delivery area fill the map more closely.
        zoomSnap: 0.5,
      }).setView([start.current.lat, start.current.lng], 13)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(m)
      m.on("click", (e: LeafletMouseEvent) =>
        onChange.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      )
      map.current = m
      // Draw the outlet and pin now that the map exists.
      container.current.dispatchEvent(new Event("map-ready"))
    })
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      area.current = marker.current = outletMarker.current = null
    }
  }, [])

  // Outlet and delivery area. Fits the view when the outlet changes.
  useEffect(() => {
    const draw = () =>
      void import("leaflet").then((L) => {
        const m = map.current
        if (!m || !container.current) return
        const brand =
          getComputedStyle(container.current).getPropertyValue("--brand") ||
          "#8a2c12"
        area.current?.remove()
        outletMarker.current?.remove()
        area.current = L.circle([outlet.lat, outlet.lng], {
          radius: outlet.radiusM,
          color: brand,
          weight: 1.5,
          fillColor: brand,
          fillOpacity: 0.06,
        }).addTo(m)
        outletMarker.current = L.marker([outlet.lat, outlet.lng], {
          icon: L.divIcon({
            className: "",
            html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${brand};border:3px solid white;box-shadow:0 1px 4px rgb(0 0 0/.4)"></span>`,
            iconSize: [14, 14],
          }),
          interactive: false,
        }).addTo(m)
        m.fitBounds(
          L.latLng(outlet.lat, outlet.lng).toBounds(outlet.radiusM * 2),
          { padding: [16, 16] }
        )
      })
    const el = container.current
    draw()
    el?.addEventListener("map-ready", draw)
    return () => el?.removeEventListener("map-ready", draw)
  }, [outlet.lat, outlet.lng, outlet.radiusM])

  // The customer's pin.
  useEffect(() => {
    const draw = () =>
      void import("leaflet").then((L) => {
        const m = map.current
        if (!m) return
        if (!pin) {
          marker.current?.remove()
          marker.current = null
          return
        }
        if (!marker.current) {
          marker.current = L.marker([pin.lat, pin.lng], {
            draggable: true,
            keyboard: true,
            title: "Delivery location",
            icon: L.divIcon({
              className: "",
              html: `<svg width="30" height="40" viewBox="0 0 30 40" style="filter:drop-shadow(0 2px 3px rgb(0 0 0/.35))"><path d="M15 39C15 39 2 23.5 2 14a13 13 0 0 1 26 0c0 9.5-13 25-13 25Z" fill="#1b1612" stroke="white" stroke-width="2"/><circle cx="15" cy="14" r="4.5" fill="white"/></svg>`,
              iconSize: [30, 40],
              iconAnchor: [15, 39],
            }),
          }).addTo(m)
          marker.current.on("dragend", () => {
            const { lat, lng } = marker.current!.getLatLng()
            onChange.current({ lat, lng })
          })
        } else {
          marker.current.setLatLng([pin.lat, pin.lng])
        }
        if (!m.getBounds().contains([pin.lat, pin.lng])) {
          m.panTo([pin.lat, pin.lng])
        }
      })
    const el = container.current
    draw()
    el?.addEventListener("map-ready", draw)
    return () => el?.removeEventListener("map-ready", draw)
  }, [pin])

  return (
    <div
      ref={container}
      className="isolate h-72 w-full overflow-hidden rounded-(--sf-radius-card) bg-(--sf-soft) ring-1 ring-(--sf-line) sm:h-80"
      aria-label="Map: tap to place your delivery pin"
    />
  )
}
