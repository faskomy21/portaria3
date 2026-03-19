import { SELF_HOSTED_API_URL } from '@/lib/runtime-config';
import { getTenantSlug } from '@/lib/tenantContext';

const DEFAULT_HEADERS = {
  Accept: 'application/json',
};

function getSessionToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem('condo_session');
    const session = raw ? JSON.parse(raw) : null;
    return session?.sessionToken || null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', headers = {}, body, isMultipart = false } = {}) {
  const sessionToken = getSessionToken();
  const tenantSlug = getTenantSlug();
  const finalHeaders = new Headers({
    ...DEFAULT_HEADERS,
    ...headers,
  });

  if (sessionToken) {
    finalHeaders.set('x-employee-session', sessionToken);
  }

  if (tenantSlug) {
    finalHeaders.set('x-tenant-slug', tenantSlug);
  }

  let finalBody = body;
  if (body && !isMultipart && !(body instanceof FormData)) {
    finalHeaders.set('Content-Type', 'application/json');
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(`${SELF_HOSTED_API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  const text = await response.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      })()
    : null;

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || 'Erro ao processar requisicao.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function createEntityApi(entityName) {
  const basePath = `/api/entities/${entityName}`;

  return {
    async list(sort, limit, skip, fields) {
      return request(
        `${basePath}${buildQueryString({
          sort,
          limit,
          skip,
          fields: Array.isArray(fields) ? fields.join(',') : fields,
        })}`,
      );
    },
    async filter(query, sort, limit, skip, fields) {
      return request(
        `${basePath}${buildQueryString({
          q: JSON.stringify(query || {}),
          sort,
          limit,
          skip,
          fields: Array.isArray(fields) ? fields.join(',') : fields,
        })}`,
      );
    },
    async get(id) {
      return request(`${basePath}/${id}`);
    },
    async create(payload) {
      return request(basePath, { method: 'POST', body: payload || {} });
    },
    async update(id, payload) {
      return request(`${basePath}/${id}`, { method: 'PUT', body: payload || {} });
    },
    async delete(id) {
      return request(`${basePath}/${id}`, { method: 'DELETE' });
    },
    async bulkCreate(items) {
      return request(`${basePath}/bulk`, { method: 'POST', body: items || [] });
    },
  };
}

const entityCache = new Map();

const entities = new Proxy(
  {},
  {
    get(_target, property) {
      if (typeof property !== 'string') {
        return undefined;
      }

      if (!entityCache.has(property)) {
        entityCache.set(property, createEntityApi(property));
      }

      return entityCache.get(property);
    },
  },
);

export const customBackendClient = {
  entities,
  functions: {
    invoke(name, payload) {
      return request(`/api/functions/${name}`, { method: 'POST', body: payload || {} });
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/api/uploads', {
          method: 'POST',
          body: formData,
          isMultipart: true,
        });
      },
    },
  },
  auth: {
    async me() {
      if (typeof window === 'undefined') {
        return null;
      }

      try {
        const raw = window.sessionStorage.getItem('condo_session');
        const session = raw ? JSON.parse(raw) : null;
        if (!session) {
          throw new Error('Nao autenticado.');
        }
        return session;
      } catch {
        throw new Error('Nao autenticado.');
      }
    },
    logout(redirectUrl) {
      if (typeof window === 'undefined') {
        return;
      }

      window.sessionStorage.removeItem('condo_session');
      if (redirectUrl !== false) {
        window.location.href = '/Access';
      }
    },
    redirectToLogin() {
      if (typeof window !== 'undefined') {
        window.location.href = '/Access';
      }
    },
  },
};
