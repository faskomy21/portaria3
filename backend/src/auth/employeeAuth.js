import crypto from 'node:crypto';
import { config } from '../config.js';

const PASSWORD_PREFIX = 'pbkdf2_sha256';

function bytesToBase64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function base64UrlToBuffer(value) {
  return Buffer.from(value, 'base64url');
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function derivePasswordBytes(password, salt, iterations) {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
}

function signHmac(input, secret) {
  return crypto.createHmac('sha256', secret).update(input).digest();
}

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

export function sanitizeEmployee(employee) {
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

export function needsPasswordMigration(storedPassword) {
  return typeof storedPassword === 'string' && storedPassword.length > 0 && !storedPassword.startsWith(`${PASSWORD_PREFIX}$`);
}

export function hashEmployeePassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = derivePasswordBytes(password, salt, config.employeePasswordIterations);
  return `${PASSWORD_PREFIX}$${config.employeePasswordIterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export function verifyEmployeePassword(password, storedPassword) {
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

  const derivedHash = derivePasswordBytes(password, base64UrlToBuffer(saltRaw), iterations);
  const matches = constantTimeEqual(derivedHash, base64UrlToBuffer(hashRaw));

  return {
    matches,
    needsRehash: matches && iterations < config.employeePasswordIterations,
  };
}

export function createEmployeeSessionToken(employee) {
  if (!config.employeeSessionSecret) {
    throw new Error('Configure EMPLOYEE_SESSION_SECRET para habilitar a autenticacao self-hosted.');
  }

  const header = bytesToBase64Url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = bytesToBase64Url(
    Buffer.from(
      JSON.stringify({
        ...employee,
        exp: Math.floor(Date.now() / 1000) + config.employeeSessionTtlSeconds,
      }),
    ),
  );
  const signature = bytesToBase64Url(signHmac(`${header}.${payload}`, config.employeeSessionSecret));

  return `${header}.${payload}.${signature}`;
}

export function verifyEmployeeSessionToken(sessionToken) {
  if (!config.employeeSessionSecret) {
    throw new Error('Configure EMPLOYEE_SESSION_SECRET para habilitar a autenticacao self-hosted.');
  }

  if (typeof sessionToken !== 'string') {
    throw new Error('Sessao invalida.');
  }

  const parts = sessionToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Sessao invalida.');
  }

  const [header, payload, signature] = parts;
  const expectedSignature = bytesToBase64Url(signHmac(`${header}.${payload}`, config.employeeSessionSecret));

  if (!constantTimeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Sessao invalida.');
  }

  const parsedPayload = JSON.parse(base64UrlToBuffer(payload).toString('utf8'));
  if (!parsedPayload.exp || parsedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Sessao expirada.');
  }

  return parsedPayload;
}
