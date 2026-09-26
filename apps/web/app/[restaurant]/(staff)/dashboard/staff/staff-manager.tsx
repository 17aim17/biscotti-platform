"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { eyebrow, inputClass, solidButton } from "@/components/styles"

import { FieldLabel } from "../_ui"
import { addStaffAction, changeRoleAction, removeStaffAction } from "../actions"

type Role = "owner" | "manager" | "staff"
type Member = {
  id: string
  role: Role
  isYou: boolean
  name: string | null
  phone: string | null
}

const ROLES: { value: Role; label: string; can: string }[] = [
  { value: "staff", label: "Staff", can: "Kitchen screen" },
  {
    value: "manager",
    label: "Manager",
    can: "Kitchen, orders, menu and outlets",
  },
  {
    value: "owner",
    label: "Owner",
    can: "Everything, including staff and settings",
  },
]

export function StaffManager({
  slug,
  members,
}: {
  slug: string
  currentUserId: string
  members: Member[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<Role>("staff")

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    after?: () => void
  ) {
    setError(null)
    start(async () => {
      const result = await action()
      if (!result.ok) setError(result.error ?? "Something went wrong.")
      else after?.()
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-10">
      {error && (
        <p
          role="alert"
          className="rounded-(--sf-radius-control) bg-(--sf-soft) p-3 text-sm text-(--brand)"
        >
          {error}
        </p>
      )}

      <ul className="divide-y divide-(--sf-line)">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div className="flex flex-col">
              <span className="font-display text-xl">
                {m.name ?? "Not signed in yet"}
                {m.isYou && (
                  <span
                    className={`${eyebrow} ml-3 text-[0.6rem] text-(--sf-muted)`}
                  >
                    You
                  </span>
                )}
              </span>
              <span className="text-sm text-(--sf-muted)">
                {m.phone ? `+${m.phone}` : ""}
              </span>
            </div>
            {m.isYou ? (
              // Your own role and membership are changed by another owner.
              <span className={`${eyebrow} text-(--sf-muted)`}>
                {ROLES.find((r) => r.value === m.role)?.label}
              </span>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={m.role}
                  disabled={pending}
                  aria-label="Role"
                  onChange={(e) =>
                    run(() => changeRoleAction(slug, m.id, e.target.value))
                  }
                  className={`${inputClass} h-10 w-36`}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const who = m.name ?? `+${m.phone}`
                    if (window.confirm(`Remove ${who} from the team?`))
                      run(() => removeStaffAction(slug, m.id))
                  }}
                  className={`${eyebrow} text-[0.6rem] text-(--sf-muted) hover:text-(--brand)`}
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(
            () => addStaffAction(slug, phone, role),
            () => setPhone("")
          )
        }}
        className="flex flex-col gap-4 rounded-(--sf-radius-card) bg-(--sf-card) p-6 ring-1 ring-(--sf-line)"
      >
        <h2 className="font-display text-2xl font-medium">Add someone</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <FieldLabel label="Mobile number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="98765 43210"
              required
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </FieldLabel>
          <button
            type="submit"
            disabled={pending || !phone.trim()}
            className={`${solidButton} h-12 px-6 disabled:opacity-50`}
          >
            Add
          </button>
        </div>
        <p className="text-sm text-(--sf-muted)">
          They sign in with this number and a text code.{" "}
          {ROLES.find((r) => r.value === role)?.label}:{" "}
          {ROLES.find((r) => r.value === role)?.can.toLowerCase()}.
        </p>
      </form>
    </div>
  )
}
