"use client"

import { ImagePlus, LoaderCircle } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"

import { eyebrow } from "@/components/styles"

import { uploadImageAction } from "./actions"

// Photo picker: uploads right away (through the server, which checks the
// permission and the file) and hands back the public URL.
export function ImageField({
  slug,
  label,
  value,
  onChange,
  aspect = "aspect-[4/3]",
}: {
  slug: string
  label: string
  value: string | null
  onChange: (url: string | null) => void
  aspect?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    const form = new FormData()
    form.set("file", file)
    const result = await uploadImageAction(slug, form)
    setBusy(false)
    if (result.ok) onChange(result.data)
    else setError(result.error)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={`${eyebrow} text-(--sf-muted)`}>{label}</span>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={`relative flex ${aspect} w-full items-center justify-center overflow-hidden rounded-(--sf-radius-card) bg-(--sf-soft) text-(--sf-muted) ring-1 ring-(--sf-line) transition hover:ring-(--sf-ink)`}
      >
        {value && (
          <Image
            src={`${value}?w=720&q=75&auto=format&fit=crop`}
            alt=""
            fill
            sizes="360px"
            className="object-cover"
          />
        )}
        <span
          className={`${eyebrow} relative flex items-center gap-2 rounded-(--sf-radius-control) px-3 py-2 ${value ? "bg-black/55 text-white" : ""}`}
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {busy ? "Uploading" : value ? "Replace" : "Add photo"}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ""
        }}
      />
      <div className="flex items-center justify-between text-xs text-(--sf-muted)">
        <span>JPEG, PNG or WebP, up to 2 MB.</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="underline underline-offset-4 hover:text-(--brand)"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-sm text-(--brand)">{error}</p>}
    </div>
  )
}
