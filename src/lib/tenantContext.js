const TENANT_STORAGE_KEY = 'condo_tenant_slug';

function normalizeTenantSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function readSessionTenantSlug() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const raw = window.sessionStorage.getItem('condo_session');
    const session = raw ? JSON.parse(raw) : null;
    return normalizeTenantSlug(session?.tenantSlug || session?.tenant_slug);
  } catch {
    return '';
  }
}

export function inferTenantSlugFromHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return '';
  }

  const parts = host.split('.');
  if (parts.length < 3 || parts[0] === 'www') {
    return '';
  }

  return normalizeTenantSlug(parts[0]);
}

export function rememberTenantSlug(slug) {
  if (typeof window === 'undefined') {
    return '';
  }

  const normalized = normalizeTenantSlug(slug);
  if (!normalized) {
    window.localStorage.removeItem(TENANT_STORAGE_KEY);
    return '';
  }

  window.localStorage.setItem(TENANT_STORAGE_KEY, normalized);
  return normalized;
}

export function getTenantSlug() {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL(window.location.href);
  const fromQuery = normalizeTenantSlug(url.searchParams.get('tenant'));
  if (fromQuery) {
    return rememberTenantSlug(fromQuery);
  }

  const fromSession = readSessionTenantSlug();
  if (fromSession) {
    return rememberTenantSlug(fromSession);
  }

  const fromStorage = normalizeTenantSlug(window.localStorage.getItem(TENANT_STORAGE_KEY));
  if (fromStorage) {
    return fromStorage;
  }

  const fromHost = inferTenantSlugFromHost();
  return fromHost ? rememberTenantSlug(fromHost) : '';
}

export function buildTenantAwareUrl(pathname) {
  if (typeof window === 'undefined') {
    return pathname;
  }

  const url = new URL(pathname, window.location.origin);
  const tenantSlug = getTenantSlug();
  const hostTenantSlug = inferTenantSlugFromHost(url.hostname);

  if (tenantSlug && !hostTenantSlug && !url.searchParams.has('tenant') && tenantSlug !== 'default') {
    url.searchParams.set('tenant', tenantSlug);
  }

  return url.toString();
}
