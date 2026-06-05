-- =============================================================================
-- Stock Easy — OPTIONAL Row-Level Security (defense-in-depth tenant isolation)
-- =============================================================================
-- This is the database-layer guarantee from the architecture: even if app code
-- forgets a `WHERE shop_id = ...`, PostgreSQL refuses to return another tenant's
-- rows. It is intentionally NOT part of the Prisma migration so it can't surprise
-- a first-time setup. Apply it manually once your app is wired to set the tenant
-- context per request:   psql "$DATABASE_URL" -f prisma/rls.sql
--
-- HOW IT WORKS
--   • Each request/transaction sets a session variable:
--         SET app.current_shop_id = '<shop uuid from the JWT>';
--     With Prisma, do this inside an interactive transaction before your queries:
--         await prisma.$executeRaw`SELECT set_config('app.current_shop_id', ${shopId}, true)`;
--   • Policies compare shop_id to current_setting('app.current_shop_id', true).
--
-- IMPORTANT — ROLES
--   • Policies do NOT apply to the table OWNER unless FORCE ROW LEVEL SECURITY is
--     set (done below). Even so, a superuser and any role with BYPASSRLS skip them.
--   • Create a dedicated, non-superuser application role for runtime, and a
--     separate admin/migration role. Example:
--         CREATE ROLE stockeasy_app LOGIN PASSWORD '...';
--         GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO stockeasy_app;
--     Point DATABASE_URL at stockeasy_app for the API. Run migrations/seed as the owner.
--   • central_admin platform-wide queries should use a BYPASSRLS role or dedicated
--     admin endpoints that deliberately query across shops.
-- =============================================================================

-- Helper: current tenant from the session GUC (NULL when unset -> no rows match).
CREATE OR REPLACE FUNCTION current_shop_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_shop_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Enable + force RLS, then add an identical policy on every tenant-scoped table.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'users', 'shops', 'dealers', 'medicines',
    'batches', 'bills', 'bill_items', 'ai_query_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
  END LOOP;
END$$;

-- shops: the tenant key is the row's own id.
CREATE POLICY tenant_isolation ON "shops"
  USING (id = current_shop_id())
  WITH CHECK (id = current_shop_id());

-- users: central_admin rows (shop_id IS NULL) remain visible to no tenant; a tenant
-- only sees its own members. (Admin access goes through a BYPASSRLS role.)
CREATE POLICY tenant_isolation ON "users"
  USING (shop_id = current_shop_id())
  WITH CHECK (shop_id = current_shop_id());

-- All other tenant tables key off their shop_id column.
CREATE POLICY tenant_isolation ON "dealers"
  USING (shop_id = current_shop_id()) WITH CHECK (shop_id = current_shop_id());
CREATE POLICY tenant_isolation ON "medicines"
  USING (shop_id = current_shop_id()) WITH CHECK (shop_id = current_shop_id());
CREATE POLICY tenant_isolation ON "batches"
  USING (shop_id = current_shop_id()) WITH CHECK (shop_id = current_shop_id());
CREATE POLICY tenant_isolation ON "bills"
  USING (shop_id = current_shop_id()) WITH CHECK (shop_id = current_shop_id());
CREATE POLICY tenant_isolation ON "bill_items"
  USING (shop_id = current_shop_id()) WITH CHECK (shop_id = current_shop_id());
CREATE POLICY tenant_isolation ON "ai_query_logs"
  USING (shop_id = current_shop_id()) WITH CHECK (shop_id = current_shop_id());

-- To roll back:  ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;  (per table)
