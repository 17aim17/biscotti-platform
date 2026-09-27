"use client"

import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

export type Section = { href: string; label: string; badge?: number }

// Dashboard sections: a column on wide screens, a scrolling row on phones.
export function DashboardNav({ sections }: { sections: Section[] }) {
  const pathname = usePathname()
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0">
      {sections.map((s) => {
        const active = pathname.startsWith(s.href)
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 rounded-(--sf-radius-control) px-3 py-2 font-display text-lg transition",
              active
                ? "bg-(--sf-ink) text-(--sf-bg)"
                : "text-(--sf-muted) hover:bg-(--sf-soft) hover:text-(--sf-ink)"
            )}
          >
            {s.label}
            {s.badge ? (
              <span className="rounded-full bg-(--brand) px-2 py-0.5 font-sans text-xs font-semibold text-white tabular-nums">
                {s.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
