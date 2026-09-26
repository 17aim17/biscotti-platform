import Link from "next/link"

import { eyebrow, solidButton } from "./styles"

export function NoAccess({ restaurantName }: { restaurantName: string }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
      <p className={`${eyebrow} text-(--sf-accent-ink)`}>Staff only</p>
      <h1 className="font-display text-5xl leading-none font-medium tracking-tight">
        You don&apos;t have access
      </h1>
      <p className="text-(--sf-muted)">
        This page needs a role at {restaurantName} that your account does not
        have. If you work here, ask an owner for access.
      </p>
      <Link href="/account" className={`${solidButton} px-8 py-3.5`}>
        Go to your account
      </Link>
    </section>
  )
}
