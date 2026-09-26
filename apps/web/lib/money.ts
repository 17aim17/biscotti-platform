// Prices are stored in paise. Shows whole rupees without decimals (₹249) and
// keeps paise when there are any (₹31.15), with Indian grouping (₹1,00,000).
// Safe in both server and client code.
const formatter = (fractionDigits: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

const whole = formatter(0)
const withPaise = formatter(2)

export function formatRupees(paise: number): string {
  return paise % 100 === 0
    ? whole.format(paise / 100)
    : withPaise.format(paise / 100)
}
