// Sending SMS goes through this one function, so switching providers later
// (MSG91, Twilio) touches only this file. SMS_PROVIDER=console logs instead.
export async function sendSms(to: string, text: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? "console"
  if (provider === "console") {
    console.info(`[sms] to ${to}: ${text}`)
    return
  }
  throw new Error(`SMS provider "${provider}" is not set up yet.`)
}
