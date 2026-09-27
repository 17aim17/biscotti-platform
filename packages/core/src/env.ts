// Every environment variable core reads, in one place. Values are read when
// used (not at import) so pages that never touch payments don't need them.
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be set (see .env.example).`)
  return value
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  razorpayKeyId: () => required("NEXT_PUBLIC_RAZORPAY_KEY_ID"),
  razorpayKeySecret: () => required("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: () => required("RAZORPAY_WEBHOOK_SECRET"),
  // "console" logs messages instead of sending them.
  smsProvider: () => process.env.SMS_PROVIDER ?? "console",
}
