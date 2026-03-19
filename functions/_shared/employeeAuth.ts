const PASSWORD_PREFIX = 'pbkdf2_sha256';
const DEFAULT_PASSWORD_ITERATIONS = Number(Deno.env.get('EMPLOYEE_PASSWORD_ITERATIONS') || '120000');
const DEFAULT_SESSION_TTL_SECONDS = Number(Deno.env.get('EMPLOYEE_SESSION_TTL_SECONDS') || '43200');

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type SafeEmployee = {
  id: string;
  name: string;
  username: string;
  role: string;
  is_active: boolean;
  can_add_resident: boolean;
  can_edit_resident: boolean;
  can_delete_resident: boolean;
  can_register_delivery: boolean;
};

type SessionPayload = SafeEmployee & {
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
}

async function derivePasswordBytes(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return new Uint8Array(derivedBits);
}

async function signHmac(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return new Uint8Array(signature);
}

export function getEmployeeSessionSecret() {
  const secret = Deno.env.get('EMPLOYEE_SESSION_SECRET');

  if (!secret) {
    throw new Error('Configure EMPLOYEE_SESSION_SECRET para habilitar a autenticacao de funcionarios.');
  }

  return secret;
}

export function sanitizeEmployee(employee: Record<string, unknown>): SafeEmployee {
  return {
    id: String(employee.id || ''),
    name: String(employee.name || ''),
    username: String(employee.username || ''),
    role: String(employee.role || 'employee'),
    is_active: employee.is_active !== false,
    can_add_resident: employee.can_add_resident === true,
    can_edit_resident: employee.can_edit_resident === true,
    can_delete_resident: employee.can_delete_resident === true,
    can_register_delivery: employee.can_register_delivery !== false,
  };
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function needsPasswordMigration(storedPassword: unknown) {
  return typeof storedPassword === 'string' && storedPassword.length > 0 && !storedPassword.startsWith(`${PASSWORD_PREFIX}$`);
}

export async function hashEmployeePassword(password: string, iterations = DEFAULT_PASSWORD_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordBytes(password, salt, iterations);
  return `${PASSWORD_PREFIX}$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyEmployeePassword(password: string, storedPassword: unknown) {
  if (typeof storedPassword !== 'string' || !storedPassword) {
    return { matches: false, needsRehash: false };
  }

  if (!storedPassword.startsWith(`${PASSWORD_PREFIX}$`)) {
    const matches = storedPassword === password;
    return { matches, needsRehash: matches };
  }

  const [, iterationsRaw, saltRaw, hashRaw] = storedPassword.split('$');
  const iterations = Number(iterationsRaw);

  if (!iterations || !saltRaw || !hashRaw) {
    return { matches: false, needsRehash: false };
  }

  const derivedHash = await derivePasswordBytes(password, base64UrlToBytes(saltRaw), iterations);
  const matches = constantTimeEqual(derivedHash, base64UrlToBytes(hashRaw));

  return {
    matches,
    needsRehash: matches && iterations < DEFAULT_PASSWORD_ITERATIONS,
  };
}

export async function createEmployeeSessionToken(employee: SafeEmployee, secret: string) {
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = bytesToBase64Url(
    encoder.encode(
      JSON.stringify({
        ...employee,
        exp: Math.floor(Date.now() / 1000) + DEFAULT_SESSION_TTL_SECONDS,
      }),
    ),
  );

  const signature = bytesToBase64Url(await signHmac(`${header}.${payload}`, secret));
  return `${header}.${payload}.${signature}`;
}

export async function verifyEmployeeSessionToken(sessionToken: unknown, secret: string) {
  if (typeof sessionToken !== 'string') {
    throw new Error('Sessao invalida.');
  }

  const parts = sessionToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Sessao invalida.');
  }

  const [header, payload, signature] = parts;
  const expectedSignature = bytesToBase64Url(await signHmac(`${header}.${payload}`, secret));

  if (!constantTimeEqual(encoder.encode(signature), encoder.encode(expectedSignature))) {
    throw new Error('Sessao invalida.');
  }

  const parsedPayload = JSON.parse(decoder.decode(base64UrlToBytes(payload))) as SessionPayload;
  if (!parsedPayload.exp || parsedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Sessao expirada.');
  }

  return parsedPayload;
}
