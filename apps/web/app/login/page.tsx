import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { safeNextPath } from "@/lib/redirect"

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams
  const returnTo = safeNextPath(
    typeof next === "string" ? next : undefined,
    "/account"
  )

  // Already signed in: go straight on.
  if (await getCurrentUser()) redirect(returnTo)

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <LoginForm returnTo={returnTo} />
    </main>
  )
}
