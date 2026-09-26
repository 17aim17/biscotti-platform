"use client"

import type { MenuCategory, MenuDish } from "@workspace/core"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { Search } from "lucide-react"
import Image from "next/image"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"

import { useCart } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { DietMark } from "@/components/diet-mark"
import { DishCard } from "./dish-card"
import { DishDialog } from "./dish-dialog"
import { SectionHeading } from "@/components/section-heading"
import { eyebrow } from "@/components/styles"

// The restaurant's signature dishes, then the full menu with search and a
// veg-only filter. Categories are a sticky list on wide screens and tabs under
// the search bar on smaller ones; both follow the section in view. Any dish
// opens its details in a dialog. The menu comes from the server; filtering
// happens here on the loaded data.
export function MenuBrowser({
  slug,
  categories,
  themeStyle,
}: {
  slug: string
  categories: MenuCategory[]
  themeStyle: CSSProperties
}) {
  const [vegOnly, setVegOnly] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const { qtyOf, add, decrement } = useCart(slug)
  const tabs = useRef<HTMLElement>(null)

  const { featured, byId, number } = useMemo(() => {
    const byId = new Map<string, { dish: MenuDish; category: string }>()
    for (const c of categories)
      for (const d of c.menuItems) byId.set(d.id, { dish: d, category: c.name })
    return {
      featured: categories.flatMap((c) =>
        c.menuItems.filter((d) => d.isFeatured)
      ),
      byId,
      // "01", "02", ... fixed per category so filtering doesn't renumber.
      number: new Map(
        categories.map((c, i) => [c.id, String(i + 1).padStart(2, "0")])
      ),
    }
  }, [categories])

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

  // Keep the active tab in view in the horizontal tab row (phones).
  useEffect(() => {
    const row = tabs.current
    const tab = row?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!row || !tab) return
    row.scrollTo({
      left: tab.offsetLeft - row.clientWidth / 2 + tab.clientWidth / 2,
      behavior: "smooth",
    })
  }, [current])

  const opened = openId ? byId.get(openId) : undefined

  return (
    <>
      {featured.length > 0 && (
        <section
          id="signatures"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-20 sm:pt-28"
        >
          <SectionHeading eyebrow="From our kitchen" title="Signatures">
            The dishes our regulars order again and again.
          </SectionHeading>
          <div className="-mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {featured.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setOpenId(d.id)}
                className="group flex w-[72%] shrink-0 snap-start flex-col text-left sm:w-auto"
              >
                <span className="relative block aspect-[3/4] overflow-hidden rounded-(--sf-radius-card) bg-(--sf-soft)">
                  {d.imageUrl && (
                    <Image
                      src={`${d.imageUrl}?w=720&h=960&q=80&auto=format&fit=crop`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 72vw"
                      className="object-cover transition duration-[1400ms] ease-out group-hover:scale-105"
                    />
                  )}
                  <span className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-(--sf-radius-control) bg-white/95">
                    <DietMark isVeg={d.isVeg} />
                  </span>
                </span>
                <span className="mt-5 flex items-baseline justify-between gap-3">
                  <span className="font-display text-2xl leading-tight font-medium tracking-tight decoration-(--brand-accent) decoration-1 underline-offset-4 group-hover:underline">
                    {d.title}
                  </span>
                  <span className="font-display text-xl font-medium tabular-nums">
                    {formatRupees(d.pricePaise)}
                  </span>
                </span>
                <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-(--sf-muted)">
                  {d.description}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        id="menu"
        className="mx-auto max-w-6xl scroll-mt-16 px-4 pt-20 sm:scroll-mt-20 sm:pt-28"
      >
        <SectionHeading eyebrow="Delivery & pickup" title="The Menu">
          Cooked to order in our kitchens. Tap any dish for details.
        </SectionHeading>

        <div className="mt-14 grid gap-8 lg:grid-cols-[13rem_1fr] lg:gap-16">
          {/* Wide screens: sticky category list. */}
          <aside className="hidden lg:block">
            <nav
              aria-label="Menu categories"
              className="sticky top-28 flex max-h-[calc(100svh-8rem)] flex-col overflow-y-auto pt-2"
            >
              <p className={`${eyebrow} mb-4 text-(--sf-muted)`}>Categories</p>
              {visible.map((c) => {
                const isActive = current === c.id
                return (
                  <a
                    key={c.id}
                    href={`#category-${c.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group flex items-center gap-3 py-2 transition",
                      isActive
                        ? "text-(--sf-ink)"
                        : "text-(--sf-muted) hover:text-(--sf-ink)"
                    )}
                  >
                    <span
                      className={cn(
                        "h-px bg-(--brand) transition-all duration-300",
                        isActive ? "w-6" : "w-0"
                      )}
                    />
                    <span className="w-5 text-[0.68rem] tracking-wider tabular-nums">
                      {number.get(c.id)}
                    </span>
                    <span
                      className={cn(
                        "flex-1 truncate font-display text-xl",
                        isActive && "italic"
                      )}
                    >
                      {c.name}
                    </span>
                  </a>
                )
              })}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-col">
            {/* Sticky toolbar: search and veg-only everywhere, tabs below lg. */}
            <div className="sticky top-16 z-20 -mx-4 flex flex-col border-b border-(--sf-line) bg-(--sf-bg)/90 px-4 pt-3 backdrop-blur-xl sm:top-20 lg:mx-0 lg:px-0">
              <div className="flex items-center gap-5 pb-3">
                <label className="relative flex-1">
                  <span className="sr-only">Search the menu</span>
                  <Search
                    className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-(--sf-muted)"
                    strokeWidth={1.5}
                  />
                  <input
                    type="search"
                    placeholder="Search the menu"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-10 w-full bg-transparent pr-2 pl-7 font-display text-lg outline-none placeholder:text-(--sf-muted)/80"
                  />
                </label>
                <label className="flex shrink-0 cursor-pointer items-center gap-2.5">
                  <Switch
                    checked={vegOnly}
                    onCheckedChange={setVegOnly}
                    className="data-checked:bg-green-700"
                  />
                  <span className={`${eyebrow} text-(--sf-ink)`}>Veg only</span>
                </label>
              </div>
              <nav
                ref={tabs}
                aria-label="Menu categories"
                className="-mx-4 flex gap-6 overflow-x-auto border-t border-(--sf-line) px-4 [scrollbar-width:none] lg:hidden"
              >
                {visible.map((c) => {
                  const isActive = current === c.id
                  return (
                    <a
                      key={c.id}
                      href={`#category-${c.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        `${eyebrow} relative shrink-0 py-3 transition after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-(--brand) after:transition-transform`,
                        isActive
                          ? "text-(--sf-ink) after:scale-x-100"
                          : "text-(--sf-muted) after:scale-x-0"
                      )}
                    >
                      {c.name}
                    </a>
                  )
                })}
              </nav>
            </div>

            {visible.length === 0 && (
              <p className="py-24 text-center font-display text-2xl text-(--sf-muted) italic">
                Nothing matches &ldquo;{query}&rdquo;.
              </p>
            )}

            {visible.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-44 pt-14 sm:scroll-mt-48 lg:scroll-mt-40"
              >
                <div className="flex items-end justify-between gap-3 border-b border-(--sf-ink)/80 pb-4">
                  <div>
                    <p className="font-display text-lg text-(--sf-accent-ink) italic">
                      No. {number.get(category.id)}
                    </p>
                    <h2 className="font-display text-4xl leading-none font-medium tracking-tight sm:text-5xl">
                      {category.name}
                    </h2>
                  </div>
                  <span className={`${eyebrow} pb-1 text-(--sf-muted)`}>
                    {category.menuItems.length}{" "}
                    {category.menuItems.length === 1 ? "dish" : "dishes"}
                  </span>
                </div>
                <div className="grid divide-y divide-(--sf-line) sm:grid-cols-2 sm:gap-x-12 sm:divide-y-0">
                  {category.menuItems.map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      qty={qtyOf(dish.id)}
                      onAdd={() => add(dish.id)}
                      onRemove={() => decrement(dish.id)}
                      onOpen={() => setOpenId(dish.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <DishDialog
        dish={opened?.dish ?? null}
        category={opened?.category ?? null}
        qty={opened ? qtyOf(opened.dish.id) : 0}
        onAdd={() => opened && add(opened.dish.id)}
        onRemove={() => opened && decrement(opened.dish.id)}
        onClose={() => setOpenId(null)}
        themeStyle={themeStyle}
      />
    </>
  )
}
