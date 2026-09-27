"use server"

import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"

// The one way to sign out: a Server Action, so it is a POST from this site.
// Clears the session cookies, then sends the user to /login.
export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}
