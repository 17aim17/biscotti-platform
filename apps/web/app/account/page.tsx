import { getStaffRestaurants, roleCan } from "@workspace/core"
import type { Metadata } from "next"
import Link from "next/link"

import { PlatformShell } from "@/components/platform-shell"
import { SectionHeading } from "@/components/section-heading"
import { eyebrow } from "@/components/styles"
import { requireUser } from "@/lib/auth"

import { signOut } from "./actions"

export const metadata: Metadata = { title: "Your account" }

const outlineButton = `${eyebrow} inline-flex h-10 items-center rounded-(--sf-radius-control) px-4 text-(--sf-ink) ring-1 ring-(--sf-ink) transition hover:bg-(--sf-ink) hover:text-(--sf-bg)`

export default async function AccountPage() {
  const user = await requireUser("/account")
  const restaurants = await getStaffRestaurants(user.id)

  return (
    <PlatformShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-14 px-4 py-16">
        <SectionHeading eyebrow="Your account" title="Welcome back">
          Signed in as +{user.phone}
        </SectionHeading>

        {restaurants.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="border-b border-(--sf-ink)/80 pb-3 font-display text-3xl font-medium">
              Your restaurants
            </h2>
            <ul className="divide-y divide-(--sf-line)">
              {restaurants.map((r) => (
                <li
                  key={r.slug}
                  className="flex flex-wrap items-center justify-between gap-4 py-5"
                >
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/${r.slug}`}
                      className="font-display text-2xl hover:underline hover:underline-offset-4"
                    >
                      {r.name}
                    </Link>
                    <span className={`${eyebrow} text-(--sf-muted)`}>
                      {r.role}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/${r.slug}/kitchen`} className={outlineButton}>
                      Kitchen
                    </Link>
                    {roleCan(r.role, "orders:view") && (
                      <Link
                        href={`/${r.slug}/dashboard`}
                        className={outlineButton}
                      >
                        Dashboard
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-center text-(--sf-muted)">
            Your orders are listed on each restaurant&apos;s page, under Orders.{" "}
            <Link
              href="/"
              className="text-(--sf-ink) underline underline-offset-4"
            >
              Browse restaurants
            </Link>
          </p>
        )}

        <form action={signOut} className="flex justify-center">
          <button
            type="submit"
            className={`${eyebrow} text-(--sf-muted) underline-offset-4 hover:text-(--brand) hover:underline`}
          >
            Sign out
          </button>
        </form>
      </div>
    </PlatformShell>
  )
}
