import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { createSupabaseServerClient } from "./supabase/server"

export type CurrentUser = { id: string; phone: string | null }

// Who is signed in, or null. cache() makes repeated calls in one request
// (layout, page, action) hit Supabase once.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return {
    id: claims.sub,
    phone: typeof claims.phone === "string" ? claims.phone : null,
  }
})

// For pages and actions that need a login: sends visitors to /login and back.
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  return user
}
