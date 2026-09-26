"use client"

import type { MenuCategory } from "@workspace/core"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { useMemo, useState } from "react"

import { useCart } from "@/lib/cart/store"
import { formatRupees } from "@/lib/money"

import { DietMark } from "./diet-mark"
import { QtyStepper } from "./qty-stepper"

// Menu with veg-only filter and search. The menu comes from the server; the
// filtering happens in the browser since the whole menu is already on the page.
export function MenuBrowser({
  slug,
  categories,
}: {
  slug: string
  categories: MenuCategory[]
}) {
  const [vegOnly, setVegOnly] = useState(false)
  const [query, setQuery] = useState("")
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

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Search the menu"
            aria-label="Search the menu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex shrink-0 items-center gap-2">
            <Switch
              id="veg-only"
              checked={vegOnly}
              onCheckedChange={setVegOnly}
            />
            <Label htmlFor="veg-only">Veg only</Label>
          </div>
        </div>
        <nav
          aria-label="Menu categories"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {visible.map((c) => (
            <a
              key={c.id}
              href={`#category-${c.id}`}
              className="shrink-0 rounded-full border px-3 py-1 text-sm hover:bg-muted"
            >
              {c.name}
            </a>
          ))}
        </nav>
      </div>

      {visible.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          No dishes match your search.
        </p>
      )}

      {visible.map((category) => (
        <section
          key={category.id}
          id={`category-${category.id}`}
          className="scroll-mt-32"
        >
          <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
          <ul className="divide-y rounded-lg border">
            {category.menuItems.map((dish) => {
              const qty = qtyOf(dish.id)
              return (
                <li
                  key={dish.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <DietMark isVeg={dish.isVeg} />
                      <h3 className="font-medium">{dish.title}</h3>
                    </div>
                    <p className="text-sm tabular-nums">
                      {formatRupees(dish.pricePaise)}
                    </p>
                    {dish.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {dish.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {!dish.isAvailable ? (
                      <Badge variant="secondary">Sold out</Badge>
                    ) : qty > 0 ? (
                      <QtyStepper
                        label={dish.title}
                        qty={qty}
                        onDecrement={() => decrement(dish.id)}
                        onIncrement={() => add(dish.id)}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => add(dish.id)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
