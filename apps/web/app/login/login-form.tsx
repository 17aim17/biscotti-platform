"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

// 10-digit Indian numbers get +91; numbers already starting with + are kept.
function toE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "")
  if (/^\+\d{10,15}$/.test(digits)) return digits
  if (/^\d{10}$/.test(digits)) return `+91${digits}`
  return null
}

export function LoginForm({ returnTo }: { returnTo: string }) {
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {step === "phone"
            ? "We'll text you a one-time code."
            : `Enter the code sent to ${phone}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Checking..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("phone")
                setCode("")
                setError(null)
              }}
            >
              Use a different number
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
