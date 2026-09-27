import { getRestaurantBySlug } from "@workspace/core"
import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"

import { PlatformShell } from "@/components/platform-shell"
import { getCurrentUser } from "@/lib/auth"
import { readBrand } from "@/lib/brand"
import { safeNextPath } from "@/lib/redirect"

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, expired } = await searchParams
  const returnTo = safeNextPath(
    typeof next === "string" ? next : undefined,
    "/account"
  )

  // Already signed in: go straight on. Not when the login was found stale
  // (?expired=1, its account no longer exists): bouncing back would loop, and
  // signing in again simply replaces the old session.
  const isExpired = expired === "1"
  if (!isExpired && (await getCurrentUser())) redirect(returnTo)

  // Coming from a restaurant (e.g. its checkout)? Sign in in its colours.
  const slug = returnTo.split("/")[1] ?? ""
  const restaurant = slug ? await getRestaurantBySlug(slug) : null
  const brand = restaurant ? readBrand(restaurant.theme) : undefined
  const forStaff = ["kitchen", "dashboard"].includes(
    returnTo.split("/")[2] ?? ""
  )

  return (
    <PlatformShell
      brand={brand}
      title={restaurant?.name}
      titleHref={restaurant ? `/${restaurant.slug}` : "/"}
    >
      <div className="grid flex-1 lg:grid-cols-2">
        {brand?.heroImageUrl && (
          <div className="relative hidden lg:block">
            <Image
              src={`${brand.heroImageUrl}?w=1400&q=75&auto=format&fit=crop`}
              alt=""
              fill
              sizes="50vw"
              className="object-cover"
            />
          </div>
        )}
        <div
          className={`flex items-center justify-center px-4 py-16 ${brand?.heroImageUrl ? "" : "lg:col-span-2"}`}
        >
          <LoginForm
            returnTo={returnTo}
            notice={
              isExpired
                ? "Your session has expired. Please sign in again."
                : null
            }
            context={
              restaurant
                ? forStaff
                  ? `${restaurant.name} staff`
                  : `Order from ${restaurant.name}`
                : "Welcome"
            }
          />
        </div>
      </div>
    </PlatformShell>
  )
}
