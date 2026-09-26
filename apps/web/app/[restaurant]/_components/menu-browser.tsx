"use client"

import type { MenuCategory } from "@workspace/core"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { Search } from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { useCart } from "@/lib/cart/store"

import { DishCard } from "./dish-card"

// Menu with search, veg-only filter and a category bar that follows scrolling.
// The menu comes from the server; filtering happens here on the loaded data.
export function MenuBrowser({
  slug,
  categories,
}: {
  slug: string
  categories: MenuCategory[]
}) {
  const [vegOnly, setVegOnly] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState<string | null>(null)
  const { qtyOf, add, decrement } = useCart(slug)
  const photos = useMemo(
    () =>
      new Map(
        categories.map((c) => [
          c.id,
          c.menuItems.find((d) => d.imageUrl)?.imageUrl ?? null,
        ])
      ),
    [categories]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return categories
      .map((c) => ({
        ...c,
        menuItems: c.menuItems.filter(
          (d) =>
            (!vegOnly || d.isVeg) &&
            (!q ||
              d.title.toLowerCase().includes(q) ||
              d.description.toLowerCase().includes(q))
        ),
      }))
      .filter((c) => c.menuItems.length > 0)
  }, [categories, vegOnly, query])

  // Highlight the category whose section is currently near the top.
  useEffect(() => {
    const sections = visible
      .map((c) => document.getElementById(`category-${c.id}`))
      .filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0]
        if (top) setActive(top.target.id.replace("category-", ""))
      },
      { rootMargin: "-160px 0px -60% 0px" }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [visible])

  return (
    <div id="menu" className="flex scroll-mt-24 flex-col gap-10">
      {/* Floating glass toolbar, same style as the header: search, veg-only and
          the category pills (each with a small photo) that follow scrolling. */}
      <div className="sticky top-[4.75rem] z-20 flex flex-col gap-3 rounded-[1.75rem] bg-white/70 p-3 shadow-lg ring-1 shadow-orange-900/5 ring-white/60 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search the menu</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              placeholder="Search dishes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-full bg-stone-100/80 pr-4 pl-10 text-sm outline-none placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-(--brand)"
            />
          </label>
          <div className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-green-50 px-4">
            <Switch
              id="veg-only"
              checked={vegOnly}
              onCheckedChange={setVegOnly}
              className="data-checked:bg-green-600"
            />
            <Label
              htmlFor="veg-only"
              className="text-sm font-medium text-green-800"
            >
              Veg
            </Label>
          </div>
        </div>
        <nav
          aria-label="Menu categories"
          className="flex scroll-px-1 gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
        >
          {visible.map((c) => {
            const photo = photos.get(c.id)
            const isActive = active === c.id
            return (
              <a
                key={c.id}
                href={`#category-${c.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-medium transition",
                  isActive
                    ? "bg-(--brand) text-white shadow-(--brand)/30 shadow-md"
                    : "bg-white text-stone-700 ring-1 ring-orange-950/10 hover:bg-orange-50"
                )}
              >
                <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-orange-100">
                  {photo && (
                    <Image
                      src={`${photo}?w=96&h=96&q=70&auto=format&fit=crop`}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  )}
                </span>
                {c.name}
              </a>
            )
          })}
        </nav>
      </div>

      {visible.length === 0 && (
        <p className="rounded-3xl bg-white py-16 text-center text-stone-500 shadow-sm">
          Nothing matches &ldquo;{query}&rdquo;. Try another dish.
        </p>
      )}

      {visible.map((category) => (
        <section
          key={category.id}
          id={`category-${category.id}`}
          className="scroll-mt-44"
        >
          <div className="mb-5 flex items-baseline gap-3">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              {category.name}
            </h2>
            <span className="text-sm text-stone-500">
              {category.menuItems.length} dishes
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {category.menuItems.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                qty={qtyOf(dish.id)}
                onAdd={() => add(dish.id)}
                onRemove={() => decrement(dish.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
