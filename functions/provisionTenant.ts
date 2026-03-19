import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';

type TenantPayload = {
  companyName?: string;
  adminName?: string;
  email?: string;
  phone?: string;
  city?: string;
  units?: number;
  desiredSlug?: string;
  notes?: string;
};

const DEFAULT_MODE = 'schema';
const DEFAULT_PREFIX = 'tenant';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeIdentifier(value: string, fallback = 'workspace') {
  const safe = slugify(value);
  const base = safe || fallback;
  return /^[a-z]/.test(base) ? base : `${fallback}_${base}`;
}

function createNamespace(prefix: string, slug: string) {
  return `${normalizeIdentifier(prefix, DEFAULT_PREFIX)}_${normalizeIdentifier(slug, 'tenant')}`;
}

function buildConnectionString(connectionString: string, databaseName: string) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function parsePayload(payload: TenantPayload) {
  const companyName = payload.companyName?.trim() || '';
  const adminName = payload.adminName?.trim() || '';
  const email = payload.email?.trim().toLowerCase() || '';
  const phone = payload.phone?.trim() || null;
  const city = payload.city?.trim() || null;
  const notes = payload.notes?.trim() || null;
  const units = Number.isFinite(payload.units) ? Number(payload.units) : null;
  const requestedSlug = normalizeIdentifier(payload.desiredSlug || companyName, 'tenant');

  if (!companyName || !adminName || !email) {
    throw new Error('companyName, adminName e email sao obrigatorios.');
  }

  return {
    companyName,
    adminName,
    email,
    phone,
    city,
    notes,
    units,
    requestedSlug,
  };
}

async function ensureMetadataTable(client: Client) {
  await client.queryArray(`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      units INTEGER,
      notes TEXT,
      provision_mode TEXT NOT NULL,
      sql_namespace TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function findAvailableSlug(client: Client, requestedSlug: string) {
  let candidate = requestedSlug;
  let suffix = 2;

  while (true) {
    const result = await client.queryObject<{ slug: string }>({
      text: 'SELECT slug FROM public.tenants WHERE slug = $1 LIMIT 1',
      args: [candidate],
    });

    if (result.rows.length === 0) {
      return candidate;
    }

    candidate = `${requestedSlug}_${suffix}`;
    suffix += 1;
  }
}

async function createTenantTables(client: Client, schemaName: string, tenantId: string, payload: ReturnType<typeof parsePayload>) {
  const companyTable = `${schemaName}.company_profile`;
  const usersTable = `${schemaName}.app_user`;
  const auditTable = `${schemaName}.audit_event`;

  await client.queryArray(`
    CREATE TABLE IF NOT EXISTS ${companyTable} (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      units INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.queryArray(`
    CREATE TABLE IF NOT EXISTS ${usersTable} (
      id TEXT PRIMARY KEY,
      company_profile_id TEXT NOT NULL REFERENCES ${companyTable}(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.queryArray(`
    CREATE TABLE IF NOT EXISTS ${auditTable} (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.queryObject({
    text: `
      INSERT INTO ${companyTable} (id, company_name, admin_name, email, phone, city, units)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE
      SET company_name = EXCLUDED.company_name,
          admin_name = EXCLUDED.admin_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          city = EXCLUDED.city,
          units = EXCLUDED.units
    `,
    args: [tenantId, payload.companyName, payload.adminName, payload.email, payload.phone, payload.city, payload.units],
  });

  await client.queryObject({
    text: `
      INSERT INTO ${usersTable} (id, company_profile_id, name, email, role)
      VALUES ($1, $2, $3, $4, 'owner')
      ON CONFLICT (id) DO NOTHING
    `,
    args: [crypto.randomUUID(), tenantId, payload.adminName, payload.email],
  });

  await client.queryObject({
    text: `
      INSERT INTO ${auditTable} (event_type, details)
      VALUES ($1, $2)
    `,
    args: ['tenant_provisioned', `Tenant ${payload.companyName} provisionado em ${schemaName}`],
  });
}

async function provisionSchemaMode(client: Client, schemaName: string, tenantId: string, payload: ReturnType<typeof parsePayload>) {
  await client.queryArray(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
  await createTenantTables(client, schemaName, tenantId, payload);
}

async function provisionDatabaseMode(
  adminClient: Client,
  connectionString: string,
  databaseName: string,
  tenantId: string,
  payload: ReturnType<typeof parsePayload>,
) {
  await adminClient.queryArray(`CREATE DATABASE ${databaseName}`);

  const tenantClient = new Client(buildConnectionString(connectionString, databaseName));

  try {
    await tenantClient.connect();
    await createTenantTables(tenantClient, 'public', tenantId, payload);
  } finally {
    await tenantClient.end();
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido' }, { status: 405 });
  }

  const connectionString = Deno.env.get('TENANT_SQL_CONNECTION_STRING');
  const provisionMode = (Deno.env.get('TENANT_PROVISION_MODE') || DEFAULT_MODE).toLowerCase();
  const tenantPrefix = Deno.env.get('TENANT_DB_PREFIX') || DEFAULT_PREFIX;

  if (!connectionString) {
    return Response.json(
      { error: 'Configure TENANT_SQL_CONNECTION_STRING para habilitar o provisionamento SQL.' },
      { status: 500 },
    );
  }

  if (!['schema', 'database'].includes(provisionMode)) {
    return Response.json(
      { error: 'TENANT_PROVISION_MODE deve ser "schema" ou "database".' },
      { status: 500 },
    );
  }

  let adminClient: Client | null = null;

  try {
    const payload = parsePayload(await req.json());
    adminClient = new Client(connectionString);
    await adminClient.connect();

    await ensureMetadataTable(adminClient);

    const slug = await findAvailableSlug(adminClient, payload.requestedSlug);
    const tenantId = crypto.randomUUID();
    const sqlNamespace = createNamespace(tenantPrefix, slug);

    if (provisionMode === 'database') {
      await provisionDatabaseMode(adminClient, connectionString, sqlNamespace, tenantId, payload);
    } else {
      await provisionSchemaMode(adminClient, sqlNamespace, tenantId, payload);
    }

    await adminClient.queryObject({
      text: `
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
      `,
      args: [
        tenantId,
        slug,
        payload.companyName,
        payload.adminName,
        payload.email,
        payload.phone,
        payload.city,
        payload.units,
        payload.notes,
        provisionMode,
        sqlNamespace,
      ],
    });

    return Response.json({
      success: true,
      tenant: {
        id: tenantId,
        slug,
        companyName: payload.companyName,
        adminName: payload.adminName,
        email: payload.email,
        provisionMode,
        sqlNamespace,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro interno ao provisionar tenant.' }, { status: 500 });
  } finally {
    if (adminClient) {
      await adminClient.end();
    }
  }
});
