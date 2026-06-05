-- =============================================================================
-- Stock Easy — initial schema migration
-- Target: PostgreSQL 14+  (uses gen_random_uuid(); tested against PG 16)
-- Apply with:  npx prisma migrate deploy   (or psql -f migration.sql)
--
-- This migration mirrors schema.prisma and ADDS production hardening that
-- Prisma cannot express in the schema: CHECK constraints, an updated_at
-- trigger, and an optional partial FEFO index. Prisma does not manage these
-- objects and will not drop them on subsequent migrations.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE "user_role"           AS ENUM ('central_admin', 'shop_owner', 'shop_staff');
CREATE TYPE "shop_status"         AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE "ai_log_status"       AS ENUM ('success', 'blocked', 'error');

-- ----------------------------------------------------------------------------
-- Tables  (created without FKs first to break the users <-> shops cycle)
--
-- updated_at has NO column default on purpose: the set_updated_at() trigger
-- (BEFORE INSERT OR UPDATE) populates it. This matches what Prisma expects for
-- an @updatedAt field, so `prisma migrate` sees no drift.
-- ----------------------------------------------------------------------------

CREATE TABLE "subscription_plans" (
    "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
    "name"             TEXT          NOT NULL,
    "price"            DECIMAL(12,2) NOT NULL DEFAULT 0,
    "billing_interval" TEXT          NOT NULL DEFAULT 'month',
    "max_users"        INTEGER,
    "max_medicines"    INTEGER,
    "features"         JSONB         NOT NULL DEFAULT '{}',
    "is_active"        BOOLEAN       NOT NULL DEFAULT true,
    "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"       UUID,
    "email"         TEXT          NOT NULL, -- normalize to lowercase in the app layer
    "password_hash" TEXT          NOT NULL,
    "full_name"     TEXT          NOT NULL,
    "role"          "user_role"   NOT NULL,
    "is_active"     BOOLEAN       NOT NULL DEFAULT true,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shops" (
    "id"                  UUID                  NOT NULL DEFAULT gen_random_uuid(),
    "name"                TEXT                  NOT NULL,
    "owner_user_id"       UUID                  NOT NULL,
    "address"             TEXT,
    "phone"               TEXT,
    "license_number"      TEXT                  NOT NULL,
    "license_doc_url"     TEXT,
    "status"              "shop_status"         NOT NULL DEFAULT 'pending',
    "verified_by"         UUID,
    "verified_at"         TIMESTAMPTZ(6),
    "rejection_reason"    TEXT,
    "plan_id"             UUID,
    "subscription_status" "subscription_status" NOT NULL DEFAULT 'trialing',
    "trial_ends_at"       TIMESTAMPTZ(6),
    "created_at"          TIMESTAMPTZ(6)        NOT NULL DEFAULT now(),
    "updated_at"          TIMESTAMPTZ(6)        NOT NULL,
    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dealers" (
    "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"      UUID          NOT NULL,
    "name"         TEXT          NOT NULL,
    "contact_name" TEXT,
    "phone"        TEXT,
    "email"        TEXT,
    "address"      TEXT,
    "tax_id"       TEXT,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medicines" (
    "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"       UUID          NOT NULL,
    "name"          TEXT          NOT NULL,
    "generic_name"  TEXT,
    "manufacturer"  TEXT,
    "category"      TEXT,
    "form"          TEXT,
    "strength"      TEXT,
    "unit"          TEXT          NOT NULL DEFAULT 'unit',
    "hsn_code"      TEXT,
    "reorder_level" INTEGER       NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "batches" (
    "id"                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"            UUID          NOT NULL,
    "medicine_id"        UUID          NOT NULL,
    "dealer_id"          UUID,
    "batch_number"       TEXT          NOT NULL,
    "expiry_date"        DATE          NOT NULL,
    "quantity_received"  INTEGER       NOT NULL,
    "quantity_remaining" INTEGER       NOT NULL,
    "cost_price"         DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mrp"                DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"         TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bills" (
    "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"        UUID          NOT NULL,
    "bill_number"    INTEGER       NOT NULL,
    "customer_name"  TEXT,
    "customer_phone" TEXT,
    "sold_by"        UUID          NOT NULL,
    "subtotal"       DECIMAL(12,2) NOT NULL,
    "discount"       DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax"            DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total"          DECIMAL(12,2) NOT NULL,
    "payment_method" TEXT          NOT NULL DEFAULT 'cash',
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bill_items" (
    "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
    "bill_id"     UUID          NOT NULL,
    "shop_id"     UUID          NOT NULL,
    "batch_id"    UUID          NOT NULL,
    "medicine_id" UUID          NOT NULL,
    "quantity"    INTEGER       NOT NULL,
    "unit_price"  DECIMAL(12,2) NOT NULL,
    "line_total"  DECIMAL(12,2) NOT NULL,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_query_logs" (
    "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"       UUID            NOT NULL,
    "user_id"       UUID            NOT NULL,
    "question"      TEXT            NOT NULL,
    "generated_sql" TEXT,
    "status"        "ai_log_status" NOT NULL,
    "row_count"     INTEGER,
    "error_message" TEXT,
    "model"         TEXT,
    "latency_ms"    INTEGER,
    "created_at"    TIMESTAMPTZ(6)  NOT NULL DEFAULT now(),
    CONSTRAINT "ai_query_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID          NOT NULL,
    "token_hash" TEXT          NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Unique constraints & indexes
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans" ("name");

CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE INDEX "users_shop_id_idx" ON "users" ("shop_id");
CREATE INDEX "users_role_idx" ON "users" ("role");

CREATE UNIQUE INDEX "shops_owner_user_id_key"  ON "shops" ("owner_user_id");
CREATE UNIQUE INDEX "shops_license_number_key" ON "shops" ("license_number");
CREATE INDEX "shops_status_idx"              ON "shops" ("status");
CREATE INDEX "shops_subscription_status_idx" ON "shops" ("subscription_status");
CREATE INDEX "shops_plan_id_idx"             ON "shops" ("plan_id");
CREATE INDEX "shops_verified_by_idx"         ON "shops" ("verified_by");

CREATE INDEX "dealers_shop_id_idx" ON "dealers" ("shop_id");
CREATE UNIQUE INDEX "dealers_shop_id_name_key" ON "dealers" ("shop_id", "name");

CREATE INDEX "medicines_shop_id_idx" ON "medicines" ("shop_id");
CREATE UNIQUE INDEX "medicines_shop_id_name_strength_form_key"
    ON "medicines" ("shop_id", "name", "strength", "form");

CREATE INDEX "batches_shop_id_idx"     ON "batches" ("shop_id");
CREATE INDEX "batches_medicine_id_idx" ON "batches" ("medicine_id");
CREATE INDEX "batches_dealer_id_idx"   ON "batches" ("dealer_id");
CREATE INDEX "batches_shop_id_medicine_id_expiry_date_idx"
    ON "batches" ("shop_id", "medicine_id", "expiry_date");
CREATE UNIQUE INDEX "batches_shop_id_medicine_id_batch_number_key"
    ON "batches" ("shop_id", "medicine_id", "batch_number");

CREATE INDEX "bills_shop_id_created_at_idx" ON "bills" ("shop_id", "created_at");
CREATE INDEX "bills_sold_by_idx"            ON "bills" ("sold_by");
CREATE UNIQUE INDEX "bills_shop_id_bill_number_key" ON "bills" ("shop_id", "bill_number");

CREATE INDEX "bill_items_bill_id_idx"     ON "bill_items" ("bill_id");
CREATE INDEX "bill_items_batch_id_idx"    ON "bill_items" ("batch_id");
CREATE INDEX "bill_items_medicine_id_idx" ON "bill_items" ("medicine_id");
CREATE INDEX "bill_items_shop_id_idx"     ON "bill_items" ("shop_id");

CREATE INDEX "ai_query_logs_shop_id_created_at_idx" ON "ai_query_logs" ("shop_id", "created_at");
CREATE INDEX "ai_query_logs_user_id_idx"            ON "ai_query_logs" ("user_id");
CREATE INDEX "ai_query_logs_status_idx"             ON "ai_query_logs" ("status");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens" ("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx"    ON "refresh_tokens" ("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" ("expires_at");

-- ----------------------------------------------------------------------------
-- Foreign keys
--   CASCADE   : child belongs to parent (delete parent -> delete child)
--   NO ACTION : protect referenced row in normal ops, but is checked at end of
--               statement so a tenant-wide shop delete still cascades cleanly
--   SET NULL  : optional link (dealer/plan/verifier)
-- ----------------------------------------------------------------------------
ALTER TABLE "users" ADD CONSTRAINT "users_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "shops" ADD CONSTRAINT "shops_verified_by_fkey"
    FOREIGN KEY ("verified_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shops" ADD CONSTRAINT "shops_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dealers" ADD CONSTRAINT "dealers_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medicines" ADD CONSTRAINT "medicines_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "batches" ADD CONSTRAINT "batches_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicines" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_dealer_id_fkey"
    FOREIGN KEY ("dealer_id") REFERENCES "dealers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bills" ADD CONSTRAINT "bills_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_sold_by_fkey"
    FOREIGN KEY ("sold_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey"
    FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "batches" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicines" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- CHECK constraints  (data-integrity invariants; Prisma-unmanaged)
-- ----------------------------------------------------------------------------
ALTER TABLE "batches"
    ADD CONSTRAINT "batches_quantity_received_chk"  CHECK ("quantity_received" > 0),
    ADD CONSTRAINT "batches_quantity_remaining_chk" CHECK ("quantity_remaining" >= 0),
    ADD CONSTRAINT "batches_quantity_bounds_chk"    CHECK ("quantity_remaining" <= "quantity_received"),
    ADD CONSTRAINT "batches_cost_price_chk"         CHECK ("cost_price" >= 0),
    ADD CONSTRAINT "batches_mrp_chk"                CHECK ("mrp" >= 0);

ALTER TABLE "bill_items"
    ADD CONSTRAINT "bill_items_quantity_chk"   CHECK ("quantity" > 0),
    ADD CONSTRAINT "bill_items_unit_price_chk" CHECK ("unit_price" >= 0),
    ADD CONSTRAINT "bill_items_line_total_chk" CHECK ("line_total" >= 0);

ALTER TABLE "bills"
    ADD CONSTRAINT "bills_amounts_chk"
    CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "total" >= 0);

ALTER TABLE "subscription_plans"
    ADD CONSTRAINT "subscription_plans_price_chk" CHECK ("price" >= 0);

-- ----------------------------------------------------------------------------
-- updated_at trigger  (sets updated_at on INSERT and every UPDATE, incl. raw SQL)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscription_plans_updated_at BEFORE INSERT OR UPDATE ON "subscription_plans"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE INSERT OR UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shops_updated_at BEFORE INSERT OR UPDATE ON "shops"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_dealers_updated_at BEFORE INSERT OR UPDATE ON "dealers"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_medicines_updated_at BEFORE INSERT OR UPDATE ON "medicines"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_batches_updated_at BEFORE INSERT OR UPDATE ON "batches"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- OPTIONAL: partial FEFO index.
-- Smaller/faster than the full composite index for the FEFO hot path because it
-- only contains in-stock rows. Prisma cannot represent partial indexes, so it
-- is left commented out to avoid migration drift. To adopt it, uncomment and
-- (optionally) drop "batches_shop_id_medicine_id_expiry_date_idx" above.
--
-- CREATE INDEX "batches_fefo_idx" ON "batches" ("shop_id", "medicine_id", "expiry_date")
--     WHERE "quantity_remaining" > 0;
