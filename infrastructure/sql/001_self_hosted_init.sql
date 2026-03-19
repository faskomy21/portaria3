CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  units INTEGER,
  notes TEXT,
  provision_mode TEXT NOT NULL DEFAULT 'schema',
  sql_namespace TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_records (
  entity_name TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  record_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_name, tenant_id, record_id)
);

CREATE INDEX IF NOT EXISTS idx_app_records_entity_tenant_created
  ON app_records (entity_name, tenant_id, created_date DESC);

CREATE INDEX IF NOT EXISTS idx_app_records_entity_tenant_updated
  ON app_records (entity_name, tenant_id, updated_date DESC);

CREATE INDEX IF NOT EXISTS idx_app_records_data_gin
  ON app_records
  USING GIN (data);
