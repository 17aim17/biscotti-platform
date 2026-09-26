import { createBrowserClient } from "@supabase/ssr"

import { supabasePublishableKey, supabaseUrl } from "./keys"

// Supabase client for Client Components (login form, Realtime subscriptions).
// Writes the session to cookies so the server sees the same login.
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey)
}
