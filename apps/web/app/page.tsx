import { listRestaurants } from "@workspace/core"
import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { connection } from "next/server"

import { PlatformShell } from "@/components/platform-shell"
import { SectionHeading } from "@/components/section-heading"
import { eyebrow } from "@/components/styles"
import { readBrand } from "@/lib/brand"

// Platform home: what Biscotti is, and the demo restaurants to try.
export default async function HomePage() {
  // Render per request, not once at build time: the list comes from the
  // database, which the build (CI) does not have.
  await connection()
  const restaurants = await listRestaurants()

  return (
    <PlatformShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-16 sm:py-24">
        <SectionHeading
          eyebrow="Online ordering for restaurants"
          title="Biscotti"
        >
          Each restaurant gets its own storefront, a kitchen screen for live
          orders and a dashboard for its menu, outlets and staff.
        </SectionHeading>

        <section className="flex flex-col gap-6">
          <p className={`${eyebrow} text-center text-(--sf-muted)`}>
            Try a demo restaurant
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {restaurants.map((r) => {
              const brand = readBrand(r.theme)
              return (
                <Link
                  key={r.id}
                  href={`/${r.slug}`}
                  className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-(--sf-radius-card) bg-(--sf-ink) p-6 text-white"
                >
                  {brand.heroImageUrl && (
                    <Image
                      src={`${brand.heroImageUrl}?w=1000&q=75&auto=format&fit=crop`}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 480px, 100vw"
                      className="-z-10 object-cover transition duration-[1400ms] ease-out group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/35 to-transparent" />
                  <span className="flex items-end justify-between gap-4">
                    <span className="flex flex-col gap-2">
                      <span className="font-display text-4xl leading-none font-medium">
                        {r.name}
                      </span>
                      {brand.tagline && (
                        <span className="max-w-xs text-sm text-white/80">
                          {brand.tagline}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight className="size-6 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        <p className="text-center text-sm text-(--sf-muted)">
          Work at one of these restaurants?{" "}
          <Link
            href="/account"
            className="text-(--sf-ink) underline underline-offset-4"
          >
            Staff sign in
          </Link>
        </p>
      </div>
    </PlatformShell>
  )
}
