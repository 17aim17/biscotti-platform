"use client"

import type { MenuCategory } from "@workspace/core"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { Search } from "lucide-react"
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
      <div className="sticky top-[4.75rem] z-20 -mx-4 flex flex-col gap-3 bg-[#fffaf4]/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Search the menu</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              placeholder="Search biryani, paneer, momos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-full bg-white pr-4 pl-10 text-sm shadow-sm ring-1 ring-orange-950/10 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-(--brand)"
            />
          </label>
          <div className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 shadow-sm ring-1 ring-orange-950/10">
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
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          {visible.map((c) => (
            <a
              key={c.id}
              href={`#category-${c.id}`}
              aria-current={active === c.id ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
                active === c.id
                  ? "bg-(--brand) text-white shadow-(--brand)/30 shadow-md"
                  : "bg-white text-stone-700 ring-1 ring-orange-950/10 hover:bg-orange-50"
              )}
            >
              {c.name}
            </a>
          ))}
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
