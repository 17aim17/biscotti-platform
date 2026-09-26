"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

// Keeps the order page current. Supabase Realtime pushes changes to this
// order (the RLS policy only lets a customer receive their own orders); the
// page then re-renders on the server with fresh data. Polling every 15s is a
// fallback in case the socket drops.
export function OrderLive({ orderId }: { orderId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let cancelled = false
    const channel = supabase.channel(`order-${orderId}`)
    // Join as the signed-in customer, not anonymously, so RLS lets the
    // updates through.
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return
      channel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${orderId}`,
          },
          () => router.refresh()
        )
        .subscribe()
    })
    const poll = setInterval(() => router.refresh(), 15_000)
    return () => {
      cancelled = true
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [orderId, router])

  return null
}
