# ADR 0004: Money in integer paise

Status: accepted

## Context

The original app stored prices as strings and mixed strings and numbers in the cart. Floating point rupees round badly (0.1 + 0.2), and GST has to come out the same every time an order is priced.

## Decision

All money is an integer number of paise (₹1 = 100 paise) in the database and in code: `price_paise`, `total_paise` and so on. Tax rates are basis points (500 = 5%). Tax is computed once per order on food plus fees and rounded to the nearest paisa. Rupees only appear when formatting for display (`formatRupees`) and when a person types a price in the dashboard (converted with `Math.round(rupees * 100)`).

## Consequences

- No rounding drift; totals are exact sums, and a check constraint in the database verifies `total = subtotal + fees + tax`.
- Razorpay also works in paise, so amounts pass through unchanged.
- Limits are explicit (`MAX_PRICE_PAISE`, `MAX_ORDER_TOTAL_PAISE`), which also keeps totals far inside Postgres `int4`.
