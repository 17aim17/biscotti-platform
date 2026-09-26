-- Upper bound on a dish price: ₹1,00,000. Mirrors MAX_PRICE_PAISE in
-- packages/core/src/constants.ts. Catches typos (an extra zero or two) before
-- they reach an order, and keeps order totals far from int4 overflow.
alter table menu_items
  add constraint menu_items_price_max check (price_paise <= 10000000);
