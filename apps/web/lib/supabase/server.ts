import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { supabasePublishableKey, supabaseUrl } from "./keys"

// Supabase client for Server Components, Server Actions and Route Handlers.
// The login session lives in cookies, so the server knows who is signed in.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. That's fine: proxy.ts
          // refreshes the session on every navigation.
        }
      },
    },
  })
}
