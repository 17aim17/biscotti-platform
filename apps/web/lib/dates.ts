// Restaurants are in India; show times there, whatever the server's timezone.
const orderTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
})

export function formatOrderTime(date: Date) {
  return orderTime.format(date)
}
