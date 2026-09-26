// Order pricing. All amounts are integer paise (₹1 = 100 paise), so there is no
// floating point rounding on money. Inputs come from the database, never from
// the browser: the browser only says which items and how many.
import { Fulfillment } from "@workspace/db/enums"

import {
  BASIS_POINTS_PER_UNIT,
  MAX_ORDER_TOTAL_PAISE,
  MAX_QTY_PER_LINE,
} from "../constants"
import { DomainError } from "../errors"

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
  fulfillment: Fulfillment,
  charges: LocationCharges
): OrderTotals {
  const subtotalPaise = lines.reduce(
    (sum, line) => sum + line.lineTotalPaise,
    0
  )
  const deliveryFeePaise =
    fulfillment === Fulfillment.delivery ? charges.deliveryFeePaise : 0
  const packagingFeePaise = charges.packagingFeePaise
  const taxable = subtotalPaise + deliveryFeePaise + packagingFeePaise
  const taxPaise = Math.round(
    (taxable * charges.taxBps) / BASIS_POINTS_PER_UNIT
  )

  const totalPaise = taxable + taxPaise
  // Keeps totals far below Postgres int4 (about ₹2.1 crore) and inside
  // Razorpay's per-order limit.
  if (totalPaise > MAX_ORDER_TOTAL_PAISE) {
    throw new DomainError(
      "INVALID_INPUT",
      `Orders above ₹${(MAX_ORDER_TOTAL_PAISE / 100).toLocaleString("en-IN")} cannot be placed online. Please contact the restaurant.`
    )
  }
  return {
    subtotalPaise,
    deliveryFeePaise,
    packagingFeePaise,
    taxPaise,
    totalPaise,
  }
}
