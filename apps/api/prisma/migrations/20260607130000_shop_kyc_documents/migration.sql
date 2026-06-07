-- =============================================================================
-- Stock Easy — shop KYC fields + verification document storage
-- Adds:
--   • nullable KYC columns on shops (city, state, postal_code, aadhaar_number,
--     pan_number) — gst_number already exists from an earlier migration.
--   • document_kind enum + shop_documents table storing file bytes in Postgres
--     (bytea), so KYC docs need no external object store and are only ever
--     served through authenticated, RBAC-gated, tenant-scoped endpoints.
-- Safe on a populated DB: every added column is nullable; the new table is new.
-- Apply with:  npx prisma migrate deploy
-- =============================================================================

-- ----------------------------------------------------------------------------
-- KYC columns on shops (all nullable, no default)
-- ----------------------------------------------------------------------------
ALTER TABLE "shops"
    ADD COLUMN "city"           TEXT,
    ADD COLUMN "state"          TEXT,
    ADD COLUMN "postal_code"    TEXT,
    ADD COLUMN "aadhaar_number" TEXT,
    ADD COLUMN "pan_number"     TEXT;

-- ----------------------------------------------------------------------------
-- Document kind enum
-- ----------------------------------------------------------------------------
CREATE TYPE "document_kind" AS ENUM ('aadhaar', 'pan', 'license', 'gst', 'other');

-- ----------------------------------------------------------------------------
-- shop_documents table (file bytes live in Postgres as bytea)
-- ----------------------------------------------------------------------------
CREATE TABLE "shop_documents" (
    "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"       UUID            NOT NULL,
    "kind"          "document_kind" NOT NULL,
    "original_name" TEXT            NOT NULL,
    "mime_type"     TEXT            NOT NULL,
    "byte_size"     INTEGER         NOT NULL,
    "data"          BYTEA           NOT NULL,
    "uploaded_by"   UUID,
    "created_at"    TIMESTAMPTZ(6)  NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ(6)  NOT NULL DEFAULT now(),
    CONSTRAINT "shop_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_documents_shop_id_idx"       ON "shop_documents" ("shop_id");
CREATE INDEX "shop_documents_shop_id_kind_idx"  ON "shop_documents" ("shop_id", "kind");

ALTER TABLE "shop_documents" ADD CONSTRAINT "shop_documents_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_documents" ADD CONSTRAINT "shop_documents_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data-integrity guard: file size must be positive (and is also bounded in app code).
ALTER TABLE "shop_documents"
    ADD CONSTRAINT "shop_documents_byte_size_chk" CHECK ("byte_size" > 0);
