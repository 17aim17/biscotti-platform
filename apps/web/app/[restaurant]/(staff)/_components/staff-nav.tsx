"use client"

import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { eyebrow } from "@/components/styles"

// Kitchen / Dashboard tabs; the current one is underlined.
export function StaffNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const tabs = [
    { href: `/${slug}/kitchen`, label: "Kitchen" },
    { href: `/${slug}/dashboard`, label: "Dashboard" },
  ]
  return (
    <nav className="flex gap-6">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              `${eyebrow} relative py-2 transition after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--brand-accent) after:transition-transform`,
              active
                ? "text-white after:scale-x-100"
                : "text-white/55 after:scale-x-0 hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
