// Order pricing. All amounts are integer paise (₹1 = 100 paise), so there is no
// floating point rounding on money. Inputs come from the database, never from
// the browser: the browser only says which items and how many.
import { DomainError } from "../errors"

export const MAX_QTY_PER_LINE = 50

export type LineInput = {
  menuItemId: string
  title: string
  unitPricePaise: number
  qty: number
}

export type PricedLine = LineInput & { lineTotalPaise: number }

export type LocationCharges = {
  deliveryFeePaise: number
  packagingFeePaise: number
  // Basis points: 500 = 5%.
  taxBps: number
}

export type OrderTotals = {
  subtotalPaise: number
  deliveryFeePaise: number
  packagingFeePaise: number
  taxPaise: number
  totalPaise: number
}

export function priceLines(lines: LineInput[]): PricedLine[] {
  if (lines.length === 0) {
    throw new DomainError("INVALID_INPUT", "The order has no items.")
  }
  return lines.map((line) => {
    if (
      !Number.isInteger(line.qty) ||
      line.qty < 1 ||
      line.qty > MAX_QTY_PER_LINE
    ) {
      throw new DomainError(
        "INVALID_INPUT",
        `Quantity for ${line.title} must be between 1 and ${MAX_QTY_PER_LINE}.`
      )
    }
    return { ...line, lineTotalPaise: line.unitPricePaise * line.qty }
  })
}

// Tax applies to food and fees. Rounded once, on the order, to the nearest paisa.
export function calculateTotals(
  lines: PricedLine[],
  fulfillment: "delivery" | "pickup",
  charges: LocationCharges
): OrderTotals {
  const subtotalPaise = lines.reduce(
    (sum, line) => sum + line.lineTotalPaise,
    0
  )
  const deliveryFeePaise =
    fulfillment === "delivery" ? charges.deliveryFeePaise : 0
  const packagingFeePaise = charges.packagingFeePaise
  const taxable = subtotalPaise + deliveryFeePaise + packagingFeePaise
  const taxPaise = Math.round((taxable * charges.taxBps) / 10_000)

  return {
    subtotalPaise,
    deliveryFeePaise,
    packagingFeePaise,
    taxPaise,
    totalPaise: taxable + taxPaise,
  }
}
