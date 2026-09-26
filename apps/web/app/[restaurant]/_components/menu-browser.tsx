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

// Menu with search and a veg-only filter. Categories are a sticky sidebar on
// wide screens and a row of pills under the search bar on smaller ones; both
// highlight the section currently in view. The menu comes from the server;
// filtering happens here on the loaded data.
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

  // One photo per category, from the full menu so it doesn't change while filtering.
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

  // Highlight the category in view: the last section whose top has passed
  // just below the sticky bars, or the first one near the top of the page.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let current: string | null = visible[0]?.id ?? null
      for (const c of visible) {
        const el = document.getElementById(`category-${c.id}`)
        if (el && el.getBoundingClientRect().top <= 200) current = c.id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [visible])

  const current = active ?? visible[0]?.id ?? null

  return (
    <div
      id="menu"
      className="grid scroll-mt-24 gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10"
    >
      {/* Wide screens: sticky category sidebar. */}
      <aside className="hidden lg:block">
        <nav
          aria-label="Menu categories"
          className="sticky top-24 flex max-h-[calc(100svh-7rem)] flex-col gap-1 overflow-y-auto rounded-(--sf-radius-card) bg-(--sf-card) p-3 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line)"
        >
          <p className="px-3 pt-2 pb-3 font-display text-lg font-semibold">
            Menu
          </p>
          {visible.map((c) => {
            const isActive = current === c.id
            return (
              <a
                key={c.id}
                href={`#category-${c.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-(--sf-radius-control) py-1.5 pr-3 pl-1.5 text-sm transition",
                  isActive
                    ? "bg-(--sf-soft) font-semibold text-(--brand)"
                    : "text-(--sf-muted) hover:bg-(--sf-soft) hover:text-(--sf-ink)"
                )}
              >
                <CategoryPhoto src={photos.get(c.id)} size="size-9" />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs tabular-nums opacity-70">
                  {c.menuItems.length}
                </span>
              </a>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-10">
        {/* Sticky toolbar: search and veg-only everywhere, category pills below lg. */}
        <div className="sticky top-[4.75rem] z-20 flex flex-col gap-3 rounded-(--sf-radius-card) bg-(--sf-card)/80 p-3 shadow-(--sf-shadow-card) ring-1 ring-(--sf-line) backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search the menu</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-(--sf-muted)" />
              <input
                type="search"
                placeholder="Search dishes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 w-full rounded-(--sf-radius-control) bg-(--sf-bg) pr-4 pl-10 text-sm ring-1 ring-(--sf-line) outline-none placeholder:text-(--sf-muted) focus:bg-(--sf-card) focus:ring-2 focus:ring-(--brand)"
              />
            </label>
            <div className="flex h-11 shrink-0 items-center gap-2 rounded-(--sf-radius-control) bg-green-50 px-4">
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
            className="flex scroll-px-1 gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:hidden"
          >
            {visible.map((c) => {
              const isActive = current === c.id
              return (
                <a
                  key={c.id}
                  href={`#category-${c.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-(--sf-radius-control) py-1 pr-4 pl-1 text-sm font-medium transition",
                    isActive
                      ? "bg-(--brand) text-white"
                      : "bg-(--sf-card) text-(--sf-ink) ring-1 ring-(--sf-line) hover:bg-(--sf-soft)"
                  )}
                >
                  <CategoryPhoto src={photos.get(c.id)} size="size-7" />
                  {c.name}
                </a>
              )
            })}
          </nav>
        </div>

        {visible.length === 0 && (
          <p className="rounded-(--sf-radius-card) bg-(--sf-card) py-16 text-center text-(--sf-muted) ring-1 ring-(--sf-line)">
            Nothing matches &ldquo;{query}&rdquo;. Try another dish.
          </p>
        )}

        {visible.map((category) => (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="scroll-mt-44 lg:scroll-mt-28"
          >
            <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-(--sf-line) pb-3">
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                {category.name}
              </h2>
              <span className="text-xs tracking-[0.15em] text-(--sf-muted) uppercase">
                {category.menuItems.length}{" "}
                {category.menuItems.length === 1 ? "dish" : "dishes"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
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
    </div>
  )
}

function CategoryPhoto({
  src,
  size,
}: {
  src: string | null | undefined
  size: string
}) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-(--sf-soft)",
        size
      )}
    >
      {src && (
        <Image
          src={`${src}?w=96&h=96&q=70&auto=format&fit=crop`}
          alt=""
          fill
          sizes="36px"
          className="object-cover"
        />
      )}
    </span>
  )
}
