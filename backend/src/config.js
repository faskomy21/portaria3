import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

export const config = {
  port: Number(process.env.PORT || '4000'),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/portaria_facil',
  publicAppUrl: (process.env.PUBLIC_APP_URL || 'http://localhost:8080').replace(/\/$/, ''),
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'default',
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'default',
  employeeSessionSecret: process.env.EMPLOYEE_SESSION_SECRET || '',
  employeePasswordIterations: Number(process.env.EMPLOYEE_PASSWORD_ITERATIONS || '120000'),
  employeeSessionTtlSeconds: Number(process.env.EMPLOYEE_SESSION_TTL_SECONDS || '43200'),
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador',
  bootstrapAdminUsername: process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || '',
  tenantProvisionMode: (process.env.TENANT_PROVISION_MODE || 'schema').toLowerCase(),
  tenantDbPrefix: process.env.TENANT_DB_PREFIX || 'tenant',
  cronSecret: process.env.CRON_SECRET || '',
  uploadDir: path.resolve(projectRoot, process.env.UPLOAD_DIR || path.join('backend', 'uploads')),
  schemaFilePath: path.resolve(projectRoot, 'infrastructure', 'sql', '001_self_hosted_init.sql'),
};
