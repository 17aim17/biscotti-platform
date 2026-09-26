import "server-only"

import { createClient } from "@supabase/supabase-js"

import { supabaseUrl } from "./keys"

// Supabase with the secret key: bypasses row level security. Server only, and
// only after the caller's permission has been checked (photo uploads, creating
// a login for new staff).
export function createSupabaseAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not set.")
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
