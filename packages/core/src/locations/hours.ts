import { z } from "zod"

import { RESTAURANT_TIME_ZONE } from "../constants"

// Weekly opening hours stored on each location, in the restaurant's local time:
//   { "mon": [["10:00", "22:30"]], "sat": [["12:00", "15:00"], ["18:00", "02:00"]] }
// A span that ends at or before it starts runs past midnight into the next day.
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24 hour)")
const day = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])

export const openingHoursSchema = z.partialRecord(
  day,
  z.array(z.tuple([time, time]))
)
export type OpeningHours = z.infer<typeof openingHoursSchema>
type Day = z.infer<typeof day>

const DAYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

// Day of week and minutes since midnight for `date` in `timeZone`.
// Servers run in UTC, so never use date.getHours() here.
function localTime(
  date: Date,
  timeZone: string
): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const day = get("weekday").toLowerCase().slice(0, 3) as Day
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) }
}

export function isOpenAt(
  hours: OpeningHours,
  date: Date,
  timeZone = RESTAURANT_TIME_ZONE
): boolean {
  const { day, minutes } = localTime(date, timeZone)
  const yesterday = DAYS[(DAYS.indexOf(day) + 6) % 7] as Day

  const openToday = (hours[day] ?? []).some(([open, close]) => {
    const o = toMinutes(open)
    const c = toMinutes(close)
    return c > o ? minutes >= o && minutes < c : minutes >= o
  })
  // Overnight spans that started yesterday, e.g. Friday 18:00-02:00 at 01:30 Saturday.
  const openFromYesterday = (hours[yesterday] ?? []).some(([open, close]) => {
    const o = toMinutes(open)
    const c = toMinutes(close)
    return c <= o && minutes < c
  })
  return openToday || openFromYesterday
}
