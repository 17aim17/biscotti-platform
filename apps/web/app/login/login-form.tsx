"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { eyebrow, inputClass, solidButton } from "@/components/styles"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

// 10-digit Indian numbers get +91; numbers already starting with + are kept.
function toE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "")
  if (/^\+\d{10,15}$/.test(digits)) return digits
  if (/^\d{10}$/.test(digits)) return `+91${digits}`
  return null
}

export function LoginForm({
  returnTo,
  context,
  notice,
}: {
  returnTo: string
  // Line above the heading, e.g. "Order from Casa Spezia".
  context: string
  // Why they are here, e.g. an expired session.
  notice: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function sendCode(event: React.FormEvent) {
    event.preventDefault()
    const e164 = toE164(phone)
    if (!e164) return setError("Enter a 10-digit mobile number.")
    setPending(true)
    setError(null)
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      phone: e164,
    })
    setPending(false)
    if (error) return setError(error.message)
    setPhone(e164)
    setStep("code")
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const { error } = await createSupabaseBrowserClient().auth.verifyOtp({
      phone,
      token: code.trim(),
      type: "sms",
    })
    if (error) {
      setPending(false)
      return setError("That code didn't work. Check it and try again.")
    }
    // The session cookie is set; reload server data for the destination.
    router.replace(returnTo)
    router.refresh()
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className={`${eyebrow} text-(--sf-accent-ink)`}>{context}</p>
        <h1 className="font-display text-5xl leading-none font-medium tracking-tight">
          Sign in
        </h1>
        <p className="text-(--sf-muted)">
          {step === "phone"
            ? "We'll text you a one-time code. No password needed."
            : `Enter the code sent to ${phone}.`}
        </p>
      </div>

      {notice && step === "phone" && (
        <p
          role="status"
          className="rounded-(--sf-radius-control) bg-(--sf-soft) p-3 text-sm text-(--sf-ink)"
        >
          {notice}
        </p>
      )}

      {step === "phone" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className={`${eyebrow} text-(--sf-muted)`}>
              Mobile number
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-(--brand)">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={`${solidButton} h-12 disabled:opacity-60`}
          >
            {pending ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className={`${eyebrow} text-(--sf-muted)`}>Code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-(--brand)">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={`${solidButton} h-12 disabled:opacity-60`}
          >
            {pending ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone")
              setCode("")
              setError(null)
            }}
            className={`${eyebrow} text-(--sf-muted) underline-offset-4 hover:text-(--sf-ink) hover:underline`}
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  )
}
