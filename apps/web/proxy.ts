import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/keys"

// Runs before every page request. Its one job: refresh the Supabase session
// cookie when the access token is close to expiring, so pages and actions
// always see a valid login. Access checks happen in layouts and actions.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value)
        }
      },
    },
  })

  // Verifies the token and refreshes it if needed (writes cookies via setAll).
  await supabase.auth.getClaims()
  return response
}

export const config = {
  // Skip static files, images and the Razorpay webhook (no user session there).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
