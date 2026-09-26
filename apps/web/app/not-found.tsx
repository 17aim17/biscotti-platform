import Link from "next/link"

import { PlatformShell } from "@/components/platform-shell"
import { Ornament } from "@/components/section-heading"
import { eyebrow, solidButton } from "@/components/styles"

export default function NotFound() {
  return (
    <PlatformShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <p className={`${eyebrow} text-(--sf-accent-ink)`}>Not found</p>
        <h1 className="font-display text-6xl font-medium tracking-tight italic sm:text-7xl">
          Nothing here
        </h1>
        <Ornament className="text-(--brand-accent)" />
        <p className="max-w-sm text-(--sf-muted)">
          There is no restaurant or page at this address.
        </p>
        <Link href="/" className={`${solidButton} px-8 py-3.5`}>
          Go to the home page
        </Link>
      </div>
    </PlatformShell>
  )
}
