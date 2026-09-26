"use client"

import type { EditableCategory, EditableDish } from "@workspace/core"
import { Switch } from "@workspace/ui/components/switch"
import { ArrowDown, ArrowUp, Plus } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type CSSProperties, useState, useTransition } from "react"

import { DietMark } from "@/components/diet-mark"
import { eyebrow, inputClass, solidButton } from "@/components/styles"
import { formatRupees } from "@/lib/money"
import type { ActionResult } from "@/lib/action-result"
import { callAction } from "@/lib/call-action"

import { outlineButton, PageTitle } from "../_ui"
import {
  archiveCategoryAction,
  createCategoryAction,
  moveCategoryAction,
  renameCategoryAction,
  setDishAvailableAction,
} from "../actions"
import { DishForm } from "./dish-form"

type Editing = { dish: EditableDish | null; categoryId: string } | null

export function MenuEditor({
  slug,
  categories,
  themeStyle,
}: {
  slug: string
  categories: EditableCategory[]
  themeStyle: CSSProperties
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState("")
  const [editing, setEditing] = useState<Editing>(null)

  // Runs an action, shows its error if any, and reloads the page's data.
  function run(action: () => Promise<ActionResult<unknown>>) {
    setError(null)
    start(async () => {
      const result = await callAction(action)
      if (!result.ok) setError(result.error ?? "Something went wrong.")
      router.refresh()
    })
  }

  const dishCount = categories.reduce((n, c) => n + c.menuItems.length, 0)

  return (
    <>
      <PageTitle title="Menu">
        <span className={`${eyebrow} text-(--sf-muted)`}>
          {categories.length} categories · {dishCount} dishes
        </span>
      </PageTitle>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-(--sf-radius-control) bg-(--sf-soft) p-3 text-sm text-(--brand)"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-12">
        {categories.map((category, index) => (
          <section key={category.id} className="flex flex-col gap-3">
            <CategoryHeader
              category={category}
              first={index === 0}
              last={index === categories.length - 1}
              disabled={pending}
              onRename={(name) =>
                run(() => renameCategoryAction(slug, category.id, name))
              }
              onMove={(direction) =>
                run(() => moveCategoryAction(slug, category.id, direction))
              }
              onArchive={() =>
                run(() => archiveCategoryAction(slug, category.id))
              }
              onAddDish={() =>
                setEditing({ dish: null, categoryId: category.id })
              }
            />
            {category.menuItems.length === 0 ? (
              <p className="py-4 text-sm text-(--sf-muted)">No dishes yet.</p>
            ) : (
              <ul className="divide-y divide-(--sf-line)">
                {category.menuItems.map((dish) => (
                  <li key={dish.id} className="flex items-center gap-4 py-3">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-(--sf-radius-card) bg-(--sf-soft)">
                      {dish.imageUrl && (
                        <Image
                          // Unsplash crops to size; Storage ignores it.
                          src={`${dish.imageUrl}?w=160&h=160&q=70&auto=format&fit=crop`}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({ dish, categoryId: category.id })
                      }
                      className="flex min-w-0 flex-1 flex-col items-start text-left"
                    >
                      <span className="flex items-center gap-2">
                        <DietMark isVeg={dish.isVeg} />
                        <span className="truncate font-display text-xl hover:underline hover:underline-offset-4">
                          {dish.title}
                        </span>
                        {dish.isFeatured && (
                          <span
                            className={`${eyebrow} text-[0.55rem] text-(--sf-accent-ink)`}
                          >
                            Signature
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-(--sf-muted) tabular-nums">
                        {formatRupees(dish.pricePaise)}
                      </span>
                    </button>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={dish.isAvailable}
                        disabled={pending}
                        onCheckedChange={(available) =>
                          run(() =>
                            setDishAvailableAction(slug, dish.id, available)
                          )
                        }
                        className="data-checked:bg-emerald-700"
                      />
                      <span
                        className={`${eyebrow} hidden w-20 text-[0.6rem] sm:inline ${dish.isAvailable ? "text-emerald-700" : "text-(--brand)"}`}
                      >
                        {dish.isAvailable ? "Available" : "Sold out"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!newCategory.trim()) return
          run(async () => {
            const result = await createCategoryAction(slug, newCategory)
            if (result.ok) setNewCategory("")
            return result
          })
        }}
        className="mt-12 flex flex-wrap gap-3 border-t border-(--sf-line) pt-8"
      >
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category, e.g. Breakfast"
          maxLength={60}
          className={`${inputClass} max-w-sm flex-1`}
        />
        <button
          type="submit"
          disabled={pending || !newCategory.trim()}
          className={`${solidButton} h-12 px-6 disabled:opacity-50`}
        >
          <Plus className="size-4" /> Add category
        </button>
      </form>

      <DishForm
        slug={slug}
        open={editing !== null}
        dish={editing?.dish ?? null}
        categoryId={editing?.categoryId ?? null}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        themeStyle={themeStyle}
        onClose={() => setEditing(null)}
      />
    </>
  )
}

function CategoryHeader({
  category,
  first,
  last,
  disabled,
  onRename,
  onMove,
  onArchive,
  onAddDish,
}: {
  category: EditableCategory
  first: boolean
  last: boolean
  disabled: boolean
  onRename: (name: string) => void
  onMove: (direction: "up" | "down") => void
  onArchive: () => void
  onAddDish: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(category.name)
  const iconButton =
    "flex size-9 items-center justify-center rounded-full text-(--sf-muted) transition hover:bg-(--sf-soft) hover:text-(--sf-ink) disabled:opacity-30"

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--sf-ink)/80 pb-3">
      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onRename(name)
            setRenaming(false)
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={60}
            className={`${inputClass} h-10`}
          />
          <button type="submit" className={outlineButton}>
            Save
          </button>
        </form>
      ) : (
        <h2 className="font-display text-3xl font-medium">{category.name}</h2>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Move up"
          disabled={disabled || first}
          onClick={() => onMove("up")}
          className={iconButton}
        >
          <ArrowUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={disabled || last}
          onClick={() => onMove("down")}
          className={iconButton}
        >
          <ArrowDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setRenaming((r) => !r)}
          className={`${eyebrow} px-2 text-[0.6rem] text-(--sf-muted) hover:text-(--sf-ink)`}
        >
          Rename
        </button>
        {category.menuItems.length === 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (window.confirm(`Remove the ${category.name} category?`))
                onArchive()
            }}
            className={`${eyebrow} px-2 text-[0.6rem] text-(--sf-muted) hover:text-(--brand)`}
          >
            Remove
          </button>
        )}
        <button type="button" onClick={onAddDish} className={outlineButton}>
          <Plus className="size-4" /> Dish
        </button>
      </div>
    </div>
  )
}
