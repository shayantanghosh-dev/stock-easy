-- =============================================================================
-- Stock Easy — contract hardening migration
-- Adds: billing idempotency, returns/voids audit trail, refresh-token families,
--       and bill GST/status columns.
-- Apply with:  npx prisma migrate deploy   (or psql -f migration.sql)
-- Safe on a populated DB: every added column is nullable or has a default.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE "bill_status"           AS ENUM ('completed', 'voided', 'returned', 'partially_returned');
CREATE TYPE "stock_movement_reason" AS ENUM ('sale', 'void', 'return', 'adjustment');

-- ----------------------------------------------------------------------------
-- Column additions to existing tables
-- ----------------------------------------------------------------------------
ALTER TABLE "bills"
    ADD COLUMN "gst_rate"    DECIMAL(5,2)  NOT NULL DEFAULT 0,
    ADD COLUMN "status"      "bill_status" NOT NULL DEFAULT 'completed',
    ADD COLUMN "voided_at"   TIMESTAMPTZ(6),
    ADD COLUMN "void_reason" TEXT;

ALTER TABLE "bill_items"
    ADD COLUMN "returned_quantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "refresh_tokens"
    ADD COLUMN "family_id"      UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN "replaced_by_id" UUID;

-- ----------------------------------------------------------------------------
-- New tables
-- ----------------------------------------------------------------------------
CREATE TABLE "stock_movements" (
    "id"          UUID                    NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"     UUID                    NOT NULL,
    "batch_id"    UUID                    NOT NULL,
    "medicine_id" UUID                    NOT NULL,
    "bill_id"     UUID,
    "bill_item_id" UUID,
    "change"      INTEGER                 NOT NULL,
    "reason"      "stock_movement_reason" NOT NULL,
    "note"        TEXT,
    "created_by"  UUID,
    "created_at"  TIMESTAMPTZ(6)          NOT NULL DEFAULT now(),
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bill_returns" (
    "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"      UUID          NOT NULL,
    "bill_id"      UUID          NOT NULL,
    "reason"       TEXT,
    "total_refund" DECIMAL(12,2) NOT NULL,
    "created_by"   UUID          NOT NULL,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "bill_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bill_return_items" (
    "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "return_id"    UUID          NOT NULL,
    "bill_item_id" UUID          NOT NULL,
    "batch_id"     UUID          NOT NULL,
    "medicine_id"  UUID          NOT NULL,
    "quantity"     INTEGER       NOT NULL,
    "unit_price"   DECIMAL(12,2) NOT NULL,
    "line_refund"  DECIMAL(12,2) NOT NULL,
    CONSTRAINT "bill_return_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "idempotency_keys" (
    "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"      UUID          NOT NULL,
    "key"          TEXT          NOT NULL,
    "request_hash" TEXT          NOT NULL,
    "bill_id"      UUID,
    "status"       TEXT          NOT NULL DEFAULT 'in_progress',
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "expires_at"   TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX "bills_shop_id_status_idx" ON "bills" ("shop_id", "status");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" ("family_id");

CREATE INDEX "stock_movements_shop_id_created_at_idx" ON "stock_movements" ("shop_id", "created_at");
CREATE INDEX "stock_movements_batch_id_idx" ON "stock_movements" ("batch_id");
CREATE INDEX "stock_movements_bill_id_idx" ON "stock_movements" ("bill_id");

CREATE INDEX "bill_returns_shop_id_created_at_idx" ON "bill_returns" ("shop_id", "created_at");
CREATE INDEX "bill_returns_bill_id_idx" ON "bill_returns" ("bill_id");

CREATE INDEX "bill_return_items_return_id_idx" ON "bill_return_items" ("return_id");
CREATE INDEX "bill_return_items_bill_item_id_idx" ON "bill_return_items" ("bill_item_id");

CREATE INDEX "idempotency_keys_shop_id_idx" ON "idempotency_keys" ("shop_id");
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");
CREATE UNIQUE INDEX "idempotency_keys_shop_id_key_key" ON "idempotency_keys" ("shop_id", "key");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "batches" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicines" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_bill_id_fkey"
    FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_bill_item_id_fkey"
    FOREIGN KEY ("bill_item_id") REFERENCES "bill_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bill_returns" ADD CONSTRAINT "bill_returns_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_returns" ADD CONSTRAINT "bill_returns_bill_id_fkey"
    FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_returns" ADD CONSTRAINT "bill_returns_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "bill_return_items" ADD CONSTRAINT "bill_return_items_return_id_fkey"
    FOREIGN KEY ("return_id") REFERENCES "bill_returns" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_return_items" ADD CONSTRAINT "bill_return_items_bill_item_id_fkey"
    FOREIGN KEY ("bill_item_id") REFERENCES "bill_items" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_bill_id_fkey"
    FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- CHECK constraints (Prisma-unmanaged data-integrity invariants)
-- ----------------------------------------------------------------------------
ALTER TABLE "bills"
    ADD CONSTRAINT "bills_gst_rate_chk" CHECK ("gst_rate" >= 0 AND "gst_rate" <= 100);

ALTER TABLE "bill_items"
    ADD CONSTRAINT "bill_items_returned_qty_chk"
    CHECK ("returned_quantity" >= 0 AND "returned_quantity" <= "quantity");

ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_change_chk" CHECK ("change" <> 0);

ALTER TABLE "bill_returns"
    ADD CONSTRAINT "bill_returns_total_refund_chk" CHECK ("total_refund" >= 0);

ALTER TABLE "bill_return_items"
    ADD CONSTRAINT "bill_return_items_quantity_chk" CHECK ("quantity" > 0),
    ADD CONSTRAINT "bill_return_items_amounts_chk"  CHECK ("unit_price" >= 0 AND "line_refund" >= 0);
