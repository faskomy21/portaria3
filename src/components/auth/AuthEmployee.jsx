import { rememberTenantSlug } from '@/lib/tenantContext';

// Simple employee auth stored in sessionStorage
const SESSION_KEY = 'condo_session';

export function loginEmployee(employee) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(employee));
  rememberTenantSlug(employee?.tenantSlug || employee?.tenant_slug);
}

export function logoutEmployee() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getSession();
}

export function getSessionToken() {
  return getSession()?.sessionToken || null;
}

export function isAdmin() {
  const s = getSession();
  return s?.role === 'admin';
}
