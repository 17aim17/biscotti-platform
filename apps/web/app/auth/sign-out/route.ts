import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { safeNextPath } from "@/lib/redirect"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// Ends a session whose account no longer exists, then sends the visitor to
// sign in again. Pages cannot clear cookies themselves, so they redirect here.
// A GET sign-out can be triggered by another site (a link or image); the worst
// case is being signed out, which is acceptable here.
export async function GET(request: NextRequest) {
  const next = safeNextPath(
    request.nextUrl.searchParams.get("next") ?? undefined,
    "/account"
  )
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect(`/login?next=${encodeURIComponent(next)}`)
}
