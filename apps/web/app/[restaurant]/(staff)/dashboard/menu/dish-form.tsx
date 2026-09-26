"use client"

import type { EditableDish } from "@workspace/core"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { type CSSProperties, useState, useTransition } from "react"

import { eyebrow, inputClass, solidButton } from "@/components/styles"
import { callAction } from "@/lib/call-action"

import { ImageField } from "../_image-field"
import { FieldLabel } from "../_ui"
import { archiveDishAction, saveDishAction } from "../actions"

type Props = {
  slug: string
  open: boolean
  dish: EditableDish | null
  categoryId: string | null
  categories: { id: string; name: string }[]
  // The dialog renders in a portal, outside the restaurant's theme wrapper.
  themeStyle: CSSProperties
  onClose: () => void
}

// Add or edit a dish. Prices are typed in rupees and stored in paise.
export function DishForm(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        style={props.themeStyle}
        className="max-h-[92svh] max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-(--sf-radius-card) bg-(--sf-bg) p-6 text-(--sf-ink) sm:max-w-2xl sm:p-8"
      >
        {props.open && (
          // Keyed, so the fields start fresh for each dish.
          <Fields
            key={props.dish?.id ?? `new-${props.categoryId}`}
            {...props}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Fields({ slug, dish, categoryId, categories, onClose }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState(dish?.title ?? "")
  const [description, setDescription] = useState(dish?.description ?? "")
  const [price, setPrice] = useState(dish ? String(dish.pricePaise / 100) : "")
  const [category, setCategory] = useState(dish?.categoryId ?? categoryId ?? "")
  const [isVeg, setIsVeg] = useState(dish?.isVeg ?? true)
  const [isFeatured, setIsFeatured] = useState(dish?.isFeatured ?? false)
  const [imageUrl, setImageUrl] = useState<string | null>(
    dish?.imageUrl ?? null
  )

  function save(e: React.FormEvent) {
    e.preventDefault()
    const rupees = Number(price)
    if (!Number.isFinite(rupees)) {
      setError("Enter the price in rupees, e.g. 249 or 249.50.")
      return
    }
    setError(null)
    start(async () => {
      const result = await callAction(() =>
        saveDishAction(slug, dish?.id ?? null, {
          categoryId: category,
          title,
          description,
          pricePaise: Math.round(rupees * 100),
          isVeg,
          isFeatured,
          imageUrl,
        })
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  function archive() {
    if (!dish) return
    if (!window.confirm(`Remove ${dish.title} from the menu?`)) return
    start(async () => {
      const result = await callAction(() => archiveDishAction(slug, dish.id))
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <DialogTitle className="font-display text-4xl font-medium">
        {dish ? "Edit dish" : "New dish"}
      </DialogTitle>

      <div className="grid gap-6 sm:grid-cols-[1fr_14rem]">
        <div className="flex flex-col gap-4">
          <FieldLabel label="Name">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={400}
              rows={4}
              className={`${inputClass} h-auto py-3`}
            />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-4">
            <FieldLabel label="Price (₹)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                required
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={isVeg}
                onChange={() => setIsVeg(true)}
                className="accent-green-700"
              />
              Vegetarian
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!isVeg}
                onChange={() => setIsVeg(false)}
                className="accent-amber-800"
              />
              Non-vegetarian
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="accent-(--sf-ink)"
              />
              Signature dish
            </label>
          </div>
        </div>
        <ImageField
          slug={slug}
          label="Photo"
          value={imageUrl}
          onChange={setImageUrl}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-(--brand)">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-(--sf-line) pt-5">
        {dish ? (
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            className={`${eyebrow} text-(--sf-muted) hover:text-(--brand)`}
          >
            Remove from menu
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className={`${solidButton} h-12 px-8 disabled:opacity-60`}
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : "Save"}
        </button>
      </div>
    </form>
  )
}
