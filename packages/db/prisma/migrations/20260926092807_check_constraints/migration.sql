-- Guard rails Prisma's schema language cannot express. The app validates the
-- same things; these make invalid data impossible even from a buggy code path.

alter table menu_items
  add constraint menu_items_price_non_negative check (price_paise >= 0);

alter table locations
  add constraint locations_fees_non_negative
    check (delivery_fee_paise >= 0 and packaging_fee_paise >= 0),
  add constraint locations_tax_bps_range check (tax_bps between 0 and 10000),
  add constraint locations_radius_positive check (delivery_radius_m > 0);

alter table order_items
  add constraint order_items_qty_positive check (qty > 0),
  add constraint order_items_amounts_non_negative
    check (unit_price_paise >= 0 and line_total_paise = unit_price_paise * qty);

alter table orders
  add constraint orders_amounts_non_negative
    check (subtotal_paise >= 0 and delivery_fee_paise >= 0 and packaging_fee_paise >= 0
           and tax_paise >= 0 and total_paise >= 0),
  add constraint orders_total_matches
    check (total_paise = subtotal_paise + delivery_fee_paise + packaging_fee_paise + tax_paise),
  add constraint orders_delivery_needs_address
    check (fulfillment = 'pickup' or delivery_address is not null);

alter table payments
  add constraint payments_amount_positive check (amount_paise > 0);

alter table restaurants
  add constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
