// Restaurants are in India; show times there, whatever the server's timezone.
// Same zone as RESTAURANT_TIME_ZONE in core (not imported: this file also
// runs in the browser, and core is server-only).
const orderTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
})

export function formatOrderTime(date: Date) {
  return orderTime.format(date)
}
