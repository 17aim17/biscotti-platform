import { getStaffRestaurants, roleCan } from "@workspace/core"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import type { Metadata } from "next"
import Link from "next/link"

import { requireUser } from "@/lib/auth"

import { signOut } from "./actions"

export const metadata: Metadata = { title: "Your account" }

export default async function AccountPage() {
  const user = await requireUser("/account")
  const restaurants = await getStaffRestaurants(user.id)

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your account</h1>
          <p className="text-muted-foreground">Signed in as +{user.phone}</p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      {restaurants.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">My restaurants</h2>
          <ul className="flex flex-col gap-3">
            {restaurants.map((r) => (
              <li
                key={r.slug}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {r.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/${r.slug}/kitchen`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Kitchen
                  </Link>
                  {roleCan(r.role, "orders:view") && (
                    <Link
                      href={`/${r.slug}/dashboard`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Dashboard
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
