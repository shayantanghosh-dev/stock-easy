-- =============================================================================
-- Stock Easy — shop GST number
-- Adds an optional GSTIN to the shop so generated pharmacy invoices can print a
-- "GST No." line when the owner has supplied one.
-- Safe on a populated DB: the column is nullable with no default.
-- Apply with:  npx prisma migrate deploy
-- =============================================================================

ALTER TABLE "shops"
    ADD COLUMN "gst_number" TEXT;
