-- Rename, not drop + add. Prisma cannot tell a rename from "delete one column,
-- add another", so its generated SQL (DROP COLUMN image_path; ADD COLUMN
-- image_url) would have erased every dish image. RENAME keeps the data.
-- The column now holds a full image URL (a hosted photo or a public Storage URL).
alter table menu_items rename column image_path to image_url;
