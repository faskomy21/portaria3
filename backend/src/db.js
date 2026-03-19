import fs from 'node:fs/promises';
import { Pool } from 'pg';
import { config } from './config.js';

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;
const tenantPoolCache = new Map();

const adminPool = new Pool({
  connectionString: config.databaseUrl,
});

let initializationPromise = null;

function quoteIdentifier(identifier) {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Identificador SQL invalido: ${identifier}`);
  }

  return `"${identifier}"`;
}

function createTenantResolutionError(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function isIpAddress(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function slugifyTenantValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function normalizeTenantIdentifier(value, fallback = 'tenant') {
  const safeValue = slugifyTenantValue(value);
  const baseValue = safeValue || fallback;
  return /^[a-z]/.test(baseValue) ? baseValue : `${fallback}_${baseValue}`;
}

export function createTenantNamespace(prefix, slug) {
  return `${normalizeTenantIdentifier(prefix || config.tenantDbPrefix, 'tenant')}_${normalizeTenantIdentifier(slug, 'tenant')}`;
}

export function buildDatabaseConnectionString(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function ensureAppRecordsTable(pool, schemaName) {
  const schema = normalizeTenantIdentifier(schemaName || 'public', 'public');
  const qualifiedSchema = quoteIdentifier(schema);
  const qualifiedTable = `${qualifiedSchema}.${quoteIdentifier('app_records')}`;

  if (schema !== 'public') {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${qualifiedSchema}`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${qualifiedTable} (
      entity_name TEXT NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      record_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (entity_name, tenant_id, record_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${schema}_app_records_entity_tenant_created`)}
      ON ${qualifiedTable} (entity_name, tenant_id, created_date DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${schema}_app_records_entity_tenant_updated`)}
      ON ${qualifiedTable} (entity_name, tenant_id, updated_date DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${schema}_app_records_data_gin`)}
      ON ${qualifiedTable}
      USING GIN (data)
  `);
}

async function ensureMainSchema() {
  const sql = await fs.readFile(config.schemaFilePath, 'utf8');
  await adminPool.query(sql);
  await ensureAppRecordsTable(adminPool, 'public');
}

async function ensureDefaultTenantRow() {
  await adminPool.query(
    `
      INSERT INTO public.tenants (
        id,
        slug,
        company_name,
        admin_name,
        email,
        phone,
        city,
        units,
        notes,
        provision_mode,
        sql_namespace,
        status
      )
      VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL, 'schema', 'public', 'active')
      ON CONFLICT (id) DO UPDATE
      SET slug = EXCLUDED.slug,
          company_name = EXCLUDED.company_name,
          admin_name = EXCLUDED.admin_name,
          email = EXCLUDED.email,
          updated_at = NOW()
    `,
    [
      config.defaultTenantId,
      config.defaultTenantSlug,
      'Tenant Padrao',
      config.bootstrapAdminName,
      'admin@localhost',
    ],
  );
}

export async function ensureInitialized() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await ensureMainSchema();
      await ensureDefaultTenantRow();
    })();
  }

  return initializationPromise;
}

export async function queryAdmin(text, params = []) {
  await ensureInitialized();
  return adminPool.query(text, params);
}

export async function findTenantById(tenantId) {
  await ensureInitialized();
  const result = await adminPool.query(
    `SELECT * FROM public.tenants WHERE id = $1 AND status = 'active' LIMIT 1`,
    [tenantId],
  );
  return result.rows[0] || null;
}

export async function findTenantBySlug(slug) {
  await ensureInitialized();
  const normalizedSlug = normalizeTenantIdentifier(slug, config.defaultTenantSlug);
  const result = await adminPool.query(
    `SELECT * FROM public.tenants WHERE slug = $1 AND status = 'active' LIMIT 1`,
    [normalizedSlug],
  );
  return result.rows[0] || null;
}

function inferTenantFromHost(req) {
  const rawHost = String(req.headers.host || '').trim().toLowerCase();
  if (!rawHost) {
    return null;
  }

  const hostname = rawHost.split(':')[0];
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || isIpAddress(hostname)) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length < 3) {
    return null;
  }

  const subdomain = parts[0];
  if (!subdomain || subdomain === 'www') {
    return null;
  }

  return normalizeTenantIdentifier(subdomain, config.defaultTenantSlug);
}

export async function resolveTenantFromRequest(req, payload = {}) {
  await ensureInitialized();

  const sessionTenantId = req.employeeSession?.tenantId || req.employeeSession?.tenant_id;
  const sessionTenantSlug = req.employeeSession?.tenantSlug || req.employeeSession?.tenant_slug;
  const headerTenantId = req.get('x-tenant-id');
  const headerTenantSlug = req.get('x-tenant-slug');
  const queryTenantSlug = req.query?.tenant;
  const payloadTenantId = payload?.tenantId;
  const payloadTenantSlug = payload?.tenantSlug;
  const hostTenantSlug = inferTenantFromHost(req);

  if (sessionTenantId) {
    const tenant = await findTenantById(sessionTenantId);
    if (tenant) {
      return tenant;
    }

    throw createTenantResolutionError('Tenant da sessao nao encontrado.');
  }

  const explicitSlugs = [sessionTenantSlug, headerTenantSlug, payloadTenantSlug, queryTenantSlug, hostTenantSlug].filter(Boolean);

  for (const slug of explicitSlugs) {
    if (!slug) {
      continue;
    }

    const tenant = await findTenantBySlug(slug);
    if (tenant) {
      return tenant;
    }
  }

  if (payloadTenantId || headerTenantId) {
    const tenant = await findTenantById(payloadTenantId || headerTenantId);
    if (tenant) {
      return tenant;
    }

    throw createTenantResolutionError('Tenant informado nao encontrado.');
  }

  if (explicitSlugs.length > 0) {
    throw createTenantResolutionError('Tenant informado nao encontrado.');
  }

  const defaultTenant = await findTenantById(config.defaultTenantId);
  if (!defaultTenant) {
    throw new Error('Tenant padrao nao encontrado.');
  }

  return defaultTenant;
}

async function getOrCreateTenantPool(databaseName) {
  if (!tenantPoolCache.has(databaseName)) {
    const pool = new Pool({
      connectionString: buildDatabaseConnectionString(config.databaseUrl, databaseName),
    });
    tenantPoolCache.set(databaseName, pool);
  }

  return tenantPoolCache.get(databaseName);
}

export async function ensureTenantStorageProvisioned({ provisionMode, sqlNamespace }) {
  await ensureInitialized();

  const normalizedMode = String(provisionMode || 'schema').toLowerCase();
  const namespace = normalizeTenantIdentifier(sqlNamespace, 'tenant');

  if (normalizedMode === 'database') {
    const existing = await adminPool.query(
      'SELECT datname FROM pg_database WHERE datname = $1 LIMIT 1',
      [namespace],
    );

    if (existing.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(namespace)}`);
    }

    const pool = await getOrCreateTenantPool(namespace);
    await ensureAppRecordsTable(pool, 'public');
    return;
  }

  await ensureAppRecordsTable(adminPool, namespace);
}

export async function getTenantStorage(tenant) {
  await ensureInitialized();

  if (!tenant) {
    throw new Error('Tenant nao informado.');
  }

  const provisionMode = String(tenant.provision_mode || 'schema').toLowerCase();
  if (provisionMode === 'database') {
    const databaseName = normalizeTenantIdentifier(tenant.sql_namespace, 'tenant');
    const pool = await getOrCreateTenantPool(databaseName);
    await ensureAppRecordsTable(pool, 'public');
    return {
      pool,
      tenantId: tenant.id,
      schemaName: 'public',
      tableName: `${quoteIdentifier('public')}.${quoteIdentifier('app_records')}`,
    };
  }

  const schemaName =
    tenant.id === config.defaultTenantId || tenant.sql_namespace === 'public'
      ? 'public'
      : normalizeTenantIdentifier(tenant.sql_namespace, 'tenant');

  await ensureAppRecordsTable(adminPool, schemaName);

  return {
    pool: adminPool,
    tenantId: tenant.id,
    schemaName,
    tableName: `${quoteIdentifier(schemaName)}.${quoteIdentifier('app_records')}`,
  };
}

export async function closeAllPools() {
  const closers = [adminPool.end(), ...Array.from(tenantPoolCache.values()).map((pool) => pool.end())];
  await Promise.allSettled(closers);
}
