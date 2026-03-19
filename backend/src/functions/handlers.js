import crypto from 'node:crypto';
import { config } from '../config.js';
import {
  createTenantNamespace,
  ensureTenantStorageProvisioned,
  findTenantById,
  queryAdmin,
  resolveTenantFromRequest,
  slugifyTenantValue,
} from '../db.js';
import {
  createRecord,
  deleteRecord,
  getRecordById,
  listRecords,
  updateRecord,
} from '../entities/repository.js';
import {
  createEmployeeSessionToken,
  hashEmployeePassword,
  needsPasswordMigration,
  normalizeUsername,
  sanitizeEmployee,
  verifyEmployeePassword,
  verifyEmployeeSessionToken,
} from '../auth/employeeAuth.js';

const ADMIN_ROLES = ['admin'];
const MANAGER_ROLES = ['admin', 'gerente'];
const SAO_PAULO_TZ = 'America/Sao_Paulo';

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assert(value, statusCode, message) {
  if (!value) {
    throw createHttpError(statusCode, message);
  }
}

function sanitizeTenantEmployee(employee, tenant) {
  return {
    ...sanitizeEmployee(employee),
    email: String(employee.email || ''),
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };
}

function formatHourInSaoPaulo(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: SAO_PAULO_TZ,
    }).format(date),
  );
}

function formatDateKeyInSaoPaulo(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SAO_PAULO_TZ,
  }).format(date);
}

function cleanPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function maskNullableString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function buildTenantLoginUrl(tenantSlug) {
  const url = new URL('/Access', `${config.publicAppUrl}/`);
  if (tenantSlug && tenantSlug !== config.defaultTenantSlug) {
    url.searchParams.set('tenant', tenantSlug);
  }
  return url.toString();
}

function generateTemporaryPassword(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#!';
  return Array.from(crypto.randomBytes(length), (value) => alphabet[value % alphabet.length]).join('');
}

function getUsernameBase(input) {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '');
  return normalized || 'usuario';
}

async function getCondoSettings(tenant) {
  const items = await listRecords({
    entityName: 'CondoSettings',
    tenant,
    sort: '-created_date',
    limit: 1,
  });
  return items[0] || null;
}

async function findEmployeeByUsername(tenant, username) {
  const employees = await listRecords({
    entityName: 'Employee',
    tenant,
    sort: 'name',
  });
  return employees.find((employee) => normalizeUsername(employee.username) === normalizeUsername(username)) || null;
}

async function countActiveAdmins(tenant) {
  const employees = await listRecords({
    entityName: 'Employee',
    tenant,
  });

  return employees.filter((employee) => employee.role === 'admin' && employee.is_active !== false).length;
}

async function generateUniqueEmployeeUsername(tenant, baseValue) {
  const base = getUsernameBase(baseValue);
  let candidate = base;
  let counter = 2;

  while (await findEmployeeByUsername(tenant, candidate)) {
    candidate = `${base}${counter}`;
    counter += 1;
  }

  return candidate;
}

function normalizeEmployeeData(data = {}, existingEmployee = null) {
  const role = ['employee', 'gerente', 'admin'].includes(data.role) ? data.role : existingEmployee?.role || 'employee';
  const isPrivileged = role === 'admin' || role === 'gerente';

  return {
    ...existingEmployee,
    name: String(data.name || existingEmployee?.name || '').trim(),
    username: normalizeUsername(data.username || existingEmployee?.username || ''),
    email: maskNullableString(data.email || existingEmployee?.email || ''),
    role,
    is_active: data.is_active !== false,
    can_add_resident: isPrivileged ? true : data.can_add_resident === true,
    can_edit_resident: isPrivileged ? true : data.can_edit_resident === true,
    can_delete_resident: isPrivileged ? true : data.can_delete_resident === true,
    can_register_delivery: isPrivileged ? true : data.can_register_delivery !== false,
  };
}

async function ensureBootstrapAdminForTenant(tenant, { name, username, password, email }) {
  if (!password) {
    return null;
  }

  const existing = await findEmployeeByUsername(tenant, username);
  if (existing) {
    return null;
  }

  const employee = await createRecord({
    entityName: 'Employee',
    tenant,
    data: {
      name,
      username: normalizeUsername(username),
      email: maskNullableString(email),
      password: hashEmployeePassword(password),
      role: 'admin',
      is_active: true,
      can_add_resident: true,
      can_edit_resident: true,
      can_delete_resident: true,
      can_register_delivery: true,
    },
  });

  return employee;
}

async function requireEmployeeSession(req, payload = {}, allowedRoles = null) {
  const sessionToken = payload.sessionToken || req.get('x-employee-session');
  assert(sessionToken, 401, 'Sessao expirada. Entre novamente.');

  let session;
  try {
    session = verifyEmployeeSessionToken(sessionToken);
  } catch (error) {
    throw createHttpError(401, error.message || 'Sessao invalida.');
  }

  req.employeeSession = session;
  const tenant = await resolveTenantFromRequest(req, {
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
  });
  const employee = await getRecordById({
    entityName: 'Employee',
    tenant,
    id: session.id,
  });

  assert(employee && employee.is_active !== false, 401, 'Conta inativa ou sessao invalida.');

  const safeEmployee = sanitizeTenantEmployee(employee, tenant);
  if (allowedRoles && !allowedRoles.includes(safeEmployee.role)) {
    throw createHttpError(403, 'Voce nao tem permissao para esta operacao.');
  }

  req.employeeSession = safeEmployee;
  return { tenant, employee, safeEmployee };
}

async function getResidentPhone(tenant, residentId, residentPhone) {
  const directPhone = cleanPhone(residentPhone);
  if (directPhone) {
    return directPhone;
  }

  if (!residentId || residentId === 'manual') {
    return '';
  }

  const resident = await getRecordById({
    entityName: 'Resident',
    tenant,
    id: residentId,
  });

  return cleanPhone(resident?.phone);
}

async function ensureBlockForTenant(tenant, blockName) {
  const normalizedName = String(blockName || '').trim();
  assert(normalizedName, 400, 'Bloco nao informado.');

  const blocks = await listRecords({
    entityName: 'Block',
    tenant,
    sort: 'name',
  });

  const existingBlock = blocks.find(
    (block) => String(block.name || '').trim().toLowerCase() === normalizedName.toLowerCase(),
  );

  if (existingBlock) {
    return existingBlock;
  }

  return createRecord({
    entityName: 'Block',
    tenant,
    data: {
      name: normalizedName,
    },
  });
}

async function ensureApartmentForTenant(tenant, { block, apartmentNumber }) {
  const normalizedApartmentNumber = String(apartmentNumber || '').trim();
  assert(normalizedApartmentNumber, 400, 'Apartamento nao informado.');

  const apartments = await listRecords({
    entityName: 'Apartment',
    tenant,
    sort: 'number',
  });

  const existingApartment = apartments.find(
    (apartment) =>
      String(apartment.block_id || '') === String(block.id) &&
      String(apartment.number || '').trim() === normalizedApartmentNumber,
  );

  if (existingApartment) {
    return existingApartment;
  }

  return createRecord({
    entityName: 'Apartment',
    tenant,
    data: {
      number: normalizedApartmentNumber,
      block_id: block.id,
      block_name: block.name,
    },
  });
}

async function queueNotification(tenant, notification) {
  return createRecord({
    entityName: 'NotificationQueue',
    tenant,
    data: {
      status: 'pending',
      attempts: 0,
      priority: 'normal',
      ...notification,
    },
  });
}

async function sendEvolutionTextMessage(settings, phone, message) {
  assert(settings?.whatsapp_instance_url, 400, 'Evolution API nao configurada.');
  assert(settings?.whatsapp_api_key, 400, 'Evolution API nao configurada.');
  assert(settings?.whatsapp_instance_name, 400, 'Evolution API nao configurada.');

  const baseUrl = String(settings.whatsapp_instance_url || '').replace(/\/$/, '');
  assert(/^https?:\/\//.test(baseUrl), 400, 'URL invalida da Evolution API.');

  const response = await fetch(`${baseUrl}/message/sendText/${settings.whatsapp_instance_name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: settings.whatsapp_api_key,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createHttpError(response.status, data?.message || 'Falha ao enviar mensagem via Evolution API.');
  }

  return data;
}

async function checkWhatsappNumber(settings, phone) {
  const baseUrl = String(settings.whatsapp_instance_url || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/whatsappNumbers/${settings.whatsapp_instance_name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: settings.whatsapp_api_key,
    },
    body: JSON.stringify({
      numbers: [phone],
    }),
  });

  if (!response.ok) {
    return true;
  }

  const data = await response.json().catch(() => []);
  const first = Array.isArray(data) ? data[0] : null;
  return first?.exists !== false;
}

function buildKeywordMessage(settings, payload) {
  let message =
    settings?.keyword_message ||
    'Ola {resident_name}!\n\nRecebemos sua palavra-chave de encomenda: *{keyword}*\n\nAguardamos suas encomendas na portaria!';

  return message
    .replace('{resident_name}', String(payload.resident_name || 'Morador'))
    .replace('{keyword}', String(payload.keyword || ''));
}

function buildCollectionMessage(settings, payload) {
  const collectedDate = payload.collected_at ? new Date(payload.collected_at) : new Date();
  const formattedDate = collectedDate.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ });
  const formattedTime = collectedDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SAO_PAULO_TZ,
  });

  let message =
    settings?.collection_message ||
    'Ola {resident_name}!\n\nSua encomenda foi retirada na portaria!\n\nDados da retirada:\nRetirado por: {collected_by_name}\nData: {collected_date}\nHora: {collected_time}';

  return message
    .replace('{resident_name}', String(payload.resident_name || 'Morador'))
    .replace('{collected_by_name}', String(payload.collected_by_name || 'Nao informado'))
    .replace('{collected_date}', formattedDate)
    .replace('{collected_time}', formattedTime);
}

async function handleEmployeeLogin(req, payload) {
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || '');

  assert(username, 400, 'Informe o usuario.');
  assert(password, 400, 'Informe a senha.');

  const tenant = await resolveTenantFromRequest(req, payload);
  const employee = await findEmployeeByUsername(tenant, username);
  assert(employee && employee.is_active !== false, 401, 'Usuario ou senha incorretos.');

  const verification = verifyEmployeePassword(password, employee.password);
  assert(verification.matches, 401, 'Usuario ou senha incorretos.');

  let finalEmployee = employee;
  if (verification.needsRehash || needsPasswordMigration(employee.password)) {
    finalEmployee = await updateRecord({
      entityName: 'Employee',
      tenant,
      id: employee.id,
      data: {
        password: hashEmployeePassword(password),
      },
    });
  }

  const safeEmployee = sanitizeTenantEmployee(finalEmployee, tenant);
  return {
    success: true,
    employee: safeEmployee,
    sessionToken: createEmployeeSessionToken(safeEmployee),
  };
}

async function handleListEmployees(req, payload) {
  const { tenant } = await requireEmployeeSession(req, payload, ADMIN_ROLES);
  const employees = await listRecords({
    entityName: 'Employee',
    tenant,
    sort: 'name',
  });

  return {
    success: true,
    employees: employees.map((employee) => sanitizeTenantEmployee(employee, tenant)),
  };
}

async function handleSaveEmployee(req, payload) {
  const { tenant, safeEmployee } = await requireEmployeeSession(req, payload, ADMIN_ROLES);
  const employeeId = payload.employeeId || null;
  const incoming = payload.data || {};
  const currentEmployee = employeeId
    ? await getRecordById({
        entityName: 'Employee',
        tenant,
        id: employeeId,
      })
    : null;

  if (employeeId) {
    assert(currentEmployee, 404, 'Funcionario nao encontrado.');
  }

  const normalized = normalizeEmployeeData(incoming, currentEmployee);
  assert(normalized.name, 400, 'Informe o nome do funcionario.');
  assert(normalized.username, 400, 'Informe o usuario do funcionario.');

  const existingWithUsername = await findEmployeeByUsername(tenant, normalized.username);
  if (existingWithUsername && existingWithUsername.id !== employeeId) {
    throw createHttpError(409, 'Ja existe um funcionario com este usuario.');
  }

  const password = String(incoming.password || '').trim();
  if (!employeeId) {
    assert(password, 400, 'Informe a senha inicial do funcionario.');
  }

  const nextRole = normalized.role;
  const nextIsActive = normalized.is_active !== false;
  const currentIsLastAdmin =
    currentEmployee?.role === 'admin' &&
    currentEmployee?.is_active !== false &&
    (await countActiveAdmins(tenant)) <= 1;

  if (employeeId && currentIsLastAdmin && (!nextIsActive || nextRole !== 'admin')) {
    throw createHttpError(400, 'Nao e permitido remover ou desativar o ultimo administrador ativo.');
  }

  const recordPayload = {
    ...normalized,
    ...(password ? { password: hashEmployeePassword(password) } : {}),
  };

  const savedEmployee = employeeId
    ? await updateRecord({
        entityName: 'Employee',
        tenant,
        id: employeeId,
        data: recordPayload,
      })
    : await createRecord({
        entityName: 'Employee',
        tenant,
        data: recordPayload,
      });

  return {
    success: true,
    employee: sanitizeTenantEmployee(savedEmployee, tenant),
    updatedBy: safeEmployee.username,
  };
}

async function handleDeleteEmployee(req, payload) {
  const { tenant, safeEmployee } = await requireEmployeeSession(req, payload, ADMIN_ROLES);
  const employeeId = String(payload.employeeId || '').trim();
  assert(employeeId, 400, 'Funcionario nao informado.');
  assert(employeeId !== safeEmployee.id, 400, 'Nao e permitido remover seu proprio usuario.');

  const employee = await getRecordById({
    entityName: 'Employee',
    tenant,
    id: employeeId,
  });

  assert(employee, 404, 'Funcionario nao encontrado.');

  if (employee.role === 'admin' && employee.is_active !== false && (await countActiveAdmins(tenant)) <= 1) {
    throw createHttpError(400, 'Nao e permitido remover o ultimo administrador ativo.');
  }

  await deleteRecord({
    entityName: 'Employee',
    tenant,
    id: employeeId,
  });

  return { success: true };
}

async function handleVerifyEmployeePassword(req, payload) {
  const { tenant, employee } = await requireEmployeeSession(req, payload);
  const password = String(payload.password || '');
  assert(password, 400, 'Informe a senha atual.');

  const verification = verifyEmployeePassword(password, employee.password);
  if (verification.matches && (verification.needsRehash || needsPasswordMigration(employee.password))) {
    await updateRecord({
      entityName: 'Employee',
      tenant,
      id: employee.id,
      data: {
        password: hashEmployeePassword(password),
      },
    });
  }

  return {
    success: verification.matches,
  };
}

async function handleListTenants(req, payload) {
  const { tenant, safeEmployee } = await requireEmployeeSession(req, payload, ADMIN_ROLES);
  const canManageAll = tenant.id === config.defaultTenantId;

  const result = canManageAll
    ? await queryAdmin(`
        SELECT id, slug, company_name, admin_name, email, phone, city, units, notes, provision_mode, sql_namespace, status, created_at, updated_at
        FROM public.tenants
        ORDER BY created_at DESC
      `)
    : await queryAdmin(
        `
          SELECT id, slug, company_name, admin_name, email, phone, city, units, notes, provision_mode, sql_namespace, status, created_at, updated_at
          FROM public.tenants
          WHERE id = $1
          ORDER BY created_at DESC
        `,
        [tenant.id],
      );

  return {
    success: true,
    scope: canManageAll ? 'all' : 'current',
    canManageAll,
    currentTenantId: tenant.id,
    currentTenantSlug: tenant.slug,
    requestedBy: safeEmployee.username,
    tenants: result.rows.map((item) => ({
      id: item.id,
      slug: item.slug,
      companyName: item.company_name,
      adminName: item.admin_name,
      email: item.email,
      phone: item.phone,
      city: item.city,
      units: item.units,
      notes: item.notes,
      provisionMode: item.provision_mode,
      sqlNamespace: item.sql_namespace,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      loginUrl: buildTenantLoginUrl(item.slug),
      isCurrentTenant: item.id === tenant.id,
      isDefaultTenant: item.id === config.defaultTenantId,
    })),
  };
}

async function handleSetTenantStatus(req, payload) {
  const { tenant } = await requireEmployeeSession(req, payload, ADMIN_ROLES);
  const canManageAll = tenant.id === config.defaultTenantId;
  if (!canManageAll) {
    throw createHttpError(403, 'Somente o admin do tenant principal pode gerenciar outros clientes.');
  }

  const tenantId = String(payload.tenantId || '').trim();
  const status = String(payload.status || '').trim().toLowerCase();
  assert(tenantId, 400, 'Tenant nao informado.');
  assert(['active', 'inactive'].includes(status), 400, 'Status invalido.');
  assert(tenantId !== config.defaultTenantId, 400, 'O tenant padrao nao pode ser desativado por esta tela.');

  const result = await queryAdmin(
    `
      UPDATE public.tenants
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, slug, company_name, admin_name, email, phone, city, units, notes, provision_mode, sql_namespace, status, created_at, updated_at
    `,
    [tenantId, status],
  );

  const updatedTenant = result.rows[0];
  assert(updatedTenant, 404, 'Tenant nao encontrado.');

  return {
    success: true,
    tenant: {
      id: updatedTenant.id,
      slug: updatedTenant.slug,
      companyName: updatedTenant.company_name,
      adminName: updatedTenant.admin_name,
      email: updatedTenant.email,
      phone: updatedTenant.phone,
      city: updatedTenant.city,
      units: updatedTenant.units,
      notes: updatedTenant.notes,
      provisionMode: updatedTenant.provision_mode,
      sqlNamespace: updatedTenant.sql_namespace,
      status: updatedTenant.status,
      createdAt: updatedTenant.created_at,
      updatedAt: updatedTenant.updated_at,
      loginUrl: buildTenantLoginUrl(updatedTenant.slug),
      isDefaultTenant: updatedTenant.id === config.defaultTenantId,
    },
  };
}

async function handleSendWhatsAppMessage(req, payload) {
  const { tenant } = await requireEmployeeSession(req, payload);
  const phone = cleanPhone(payload.phone);
  const message = String(payload.message || '').trim();

  assert(phone, 400, 'phone e obrigatorio.');
  assert(message, 400, 'message e obrigatorio.');

  const settings = await getCondoSettings(tenant);
  const providerResponse = await sendEvolutionTextMessage(settings, phone, message);

  return {
    success: true,
    data: {
      success: true,
      providerResponse,
    },
  };
}

async function handleSendKeywordNotification(req, payload) {
  const tenant = await resolveTenantFromRequest(req, payload);
  const settings = await getCondoSettings(tenant);

  if (!settings?.whatsapp_instance_url || !settings?.whatsapp_api_key || !settings?.whatsapp_instance_name) {
    return { success: true, skipped: true, message: 'WhatsApp nao configurado para este tenant.' };
  }

  if (settings.notify_keyword_enabled === false) {
    return { success: true, skipped: true, message: 'Notificacao de palavra-chave desativada.' };
  }

  const phone = await getResidentPhone(tenant, payload.resident_id, payload.resident_phone);
  if (!phone) {
    return { success: true, skipped: true, message: 'Morador sem telefone para notificacao.' };
  }

  const delayMinutes = Number(settings.keyword_delay_minutes || 0);
  const priority = settings.keyword_priority || 'normal';
  const scheduledAt =
    delayMinutes > 0 ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString() : undefined;

  await queueNotification(tenant, {
    phone,
    message: buildKeywordMessage(settings, payload),
    priority,
    scheduled_at: scheduledAt,
  });

  return {
    success: true,
    queued: true,
  };
}

async function handleQueueCollectionNotification(req, payload) {
  const { tenant } = await requireEmployeeSession(req, payload);
  const settings = await getCondoSettings(tenant);

  if (!settings?.whatsapp_instance_url || !settings?.whatsapp_api_key || !settings?.whatsapp_instance_name) {
    return { success: true, skipped: true, message: 'WhatsApp nao configurado para este tenant.' };
  }

  if (settings.notify_collection_enabled === false) {
    return { success: true, skipped: true, message: 'Notificacao de retirada desativada.' };
  }

  const phone = await getResidentPhone(tenant, payload.resident_id, payload.resident_phone);
  if (!phone) {
    return { success: true, skipped: true, message: 'Morador sem telefone para notificacao.' };
  }

  const delayMinutes = Number(settings.collection_delay_minutes || 0);
  const priority = settings.collection_priority || 'normal';
  const scheduledAt =
    delayMinutes > 0 ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString() : undefined;

  await queueNotification(tenant, {
    phone,
    message: buildCollectionMessage(settings, payload),
    priority,
    scheduled_at: scheduledAt,
  });

  return {
    success: true,
    queued: true,
  };
}

async function handleApproveResidentRequest(req, payload) {
  const { tenant } = await requireEmployeeSession(req, payload, MANAGER_ROLES);
  const residentRequestId = String(payload.residentRequestId || payload.requestId || '').trim();
  assert(residentRequestId, 400, 'Solicitacao nao informada.');

  const residentRequest = await getRecordById({
    entityName: 'ResidentRequest',
    tenant,
    id: residentRequestId,
  });

  assert(residentRequest, 404, 'Solicitacao nao encontrada.');
  assert(residentRequest.status !== 'approved', 400, 'Esta solicitacao ja foi aprovada.');

  const block = await ensureBlockForTenant(tenant, residentRequest.block_name);
  const apartment = await ensureApartmentForTenant(tenant, {
    block,
    apartmentNumber: residentRequest.apartment_number,
  });

  const residents = await listRecords({
    entityName: 'Resident',
    tenant,
    query: {
      apartment_id: apartment.id,
    },
    limit: 100,
  });

  const resident = await createRecord({
    entityName: 'Resident',
    tenant,
    data: {
      name: residentRequest.name,
      phone: residentRequest.phone,
      apartment_id: apartment.id,
      apartment_number: apartment.number,
      block_name: block.name,
      is_primary: residents.length === 0,
    },
  });

  const updatedRequest = await updateRecord({
    entityName: 'ResidentRequest',
    tenant,
    id: residentRequestId,
    data: {
      status: 'approved',
      resident_id: resident.id,
      approved_at: new Date().toISOString(),
    },
  });

  return {
    success: true,
    resident,
    residentRequest: updatedRequest,
    block,
    apartment,
  };
}

async function processNotificationQueueForTenant(tenant) {
  const settings = await getCondoSettings(tenant);

  if (!settings) {
    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 0 },
      message: 'Tenant sem configuracoes de condominio.',
    };
  }

  if (settings?.queue_enabled === false) {
    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 0 },
      message: 'Processamento da fila esta desativado.',
    };
  }

  const hour = formatHourInSaoPaulo(new Date());
  const silenceStartHour = Number(settings?.silence_start_hour ?? 23);
  const silenceEndHour = Number(settings?.silence_end_hour ?? 8);
  const queueIntervalMinutes = Number(settings?.queue_interval_minutes ?? 5);

  const inSilence =
    silenceStartHour < silenceEndHour
      ? hour >= silenceStartHour && hour < silenceEndHour
      : hour >= silenceStartHour || hour < silenceEndHour;

  if (inSilence) {
    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 0 },
      message: 'Horario de silencio ativo. A fila aguardara a proxima janela de envio.',
    };
  }

  const notifications = await listRecords({
    entityName: 'NotificationQueue',
    tenant,
    query: { status: 'pending' },
    sort: 'created_date',
    limit: 100,
  });

  const now = Date.now();
  const eligible = notifications.filter((notification) => {
    if (notification.scheduled_at && new Date(notification.scheduled_at).getTime() > now) {
      return false;
    }

    if (!notification.last_phone_attempt) {
      return true;
    }

    const intervalMs = queueIntervalMinutes * 60 * 1000;
    return now - new Date(notification.last_phone_attempt).getTime() >= intervalMs;
  });

  if (eligible.length === 0) {
    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 0 },
      message: 'Nao ha notificacoes elegiveis para envio neste momento.',
    };
  }

  if (!settings?.whatsapp_instance_url || !settings?.whatsapp_api_key || !settings?.whatsapp_instance_name) {
    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 0 },
      message: 'WhatsApp nao configurado para este tenant.',
    };
  }

  const todayKey = formatDateKeyInSaoPaulo(new Date());
  const sentNotifications = await listRecords({
    entityName: 'NotificationQueue',
    tenant,
    query: { status: 'sent' },
    limit: 10000,
  });

  const sentTodayCount = sentNotifications.filter(
    (item) => item.sent_at && formatDateKeyInSaoPaulo(item.sent_at) === todayKey,
  ).length;
  if (sentTodayCount >= 10000) {
    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 0 },
      message: 'Limite diario de 10 mil notificacoes ja foi atingido.',
    };
  }

  const sorted = [...eligible].sort((left, right) => {
    const priorityOrder = { high: 0, normal: 1 };
    const leftPriority = priorityOrder[left.priority] ?? 1;
    const rightPriority = priorityOrder[right.priority] ?? 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return new Date(left.created_date).getTime() - new Date(right.created_date).getTime();
  });

  const nextNotification = sorted[0];
  const lastAttemptAt = new Date().toISOString();

  try {
    const hasWhatsapp = await checkWhatsappNumber(settings, nextNotification.phone);
    if (!hasWhatsapp) {
      await updateRecord({
        entityName: 'NotificationQueue',
        tenant,
        id: nextNotification.id,
        data: {
          status: 'failed',
          sent_at: new Date().toISOString(),
          attempts: Number(nextNotification.attempts || 0) + 1,
          error: 'Numero sem WhatsApp ativo.',
          last_phone_attempt: lastAttemptAt,
        },
      });

      return {
        success: true,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        results: { sent: 0, failed: 1 },
      };
    }

    await sendEvolutionTextMessage(settings, nextNotification.phone, nextNotification.message);

    await updateRecord({
      entityName: 'NotificationQueue',
      tenant,
      id: nextNotification.id,
      data: {
        status: 'sent',
        sent_at: new Date().toISOString(),
        attempts: Number(nextNotification.attempts || 0) + 1,
        last_phone_attempt: lastAttemptAt,
      },
    });

    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 1, failed: 0 },
    };
  } catch (error) {
    const attempts = Number(nextNotification.attempts || 0) + 1;
    const delayMs = Math.min(2 ** Math.max(attempts - 1, 0) * 60000, 3600000);

    await updateRecord({
      entityName: 'NotificationQueue',
      tenant,
      id: nextNotification.id,
      data: {
        status: 'pending',
        attempts,
        error: error.message || 'Falha ao enviar notificacao.',
        last_phone_attempt: lastAttemptAt,
        scheduled_at: new Date(Date.now() + delayMs).toISOString(),
      },
    });

    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      results: { sent: 0, failed: 1 },
    };
  }
}

async function handleProcessNotificationQueue(req, payload) {
  const hasCronAccess = config.cronSecret && req.get('x-cron-secret') === config.cronSecret;

  if (!hasCronAccess) {
    const { tenant } = await requireEmployeeSession(req, payload, MANAGER_ROLES);
    return processNotificationQueueForTenant(tenant);
  }

  const hasExplicitTenantHint = Boolean(
    payload?.tenantId ||
      payload?.tenantSlug ||
      req.get('x-tenant-id') ||
      req.get('x-tenant-slug') ||
      req.query?.tenant,
  );

  if (hasExplicitTenantHint) {
    const tenant = await resolveTenantFromRequest(req, payload);
    return processNotificationQueueForTenant(tenant);
  }

  const allTenants = (
    await queryAdmin(`SELECT * FROM public.tenants WHERE status = 'active' ORDER BY created_at ASC`)
  ).rows;

  const processedTenants = [];
  let sent = 0;
  let failed = 0;

  for (const tenant of allTenants) {
    const result = await processNotificationQueueForTenant(tenant);
    processedTenants.push(result);
    sent += Number(result?.results?.sent || 0);
    failed += Number(result?.results?.failed || 0);
  }

  return {
    success: true,
    processedTenants,
    results: { sent, failed },
  };
}

function parseTenantPayload(payload) {
  const companyName = String(payload.companyName || '').trim();
  const adminName = String(payload.adminName || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const phone = maskNullableString(payload.phone);
  const city = maskNullableString(payload.city);
  const notes = maskNullableString(payload.notes);
  const units = Number.isFinite(Number(payload.units)) ? Number(payload.units) : null;
  const requestedSlug = payload.desiredSlug || companyName;

  assert(companyName, 400, 'Informe o nome do cliente.');
  assert(adminName, 400, 'Informe o responsavel pelo cliente.');
  assert(email, 400, 'Informe o e-mail do cliente.');

  return {
    companyName,
    adminName,
    email,
    phone,
    city,
    notes,
    units,
    requestedSlug: slugifyTenantValue(requestedSlug),
  };
}

async function findAvailableTenantSlug(requestedSlug) {
  const baseSlug = requestedSlug || 'tenant';
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const result = await queryAdmin(
      'SELECT slug FROM public.tenants WHERE slug = $1 LIMIT 1',
      [candidate],
    );

    if (result.rows.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}_${suffix}`;
    suffix += 1;
  }
}

async function createTenantAdminUser(tenant, payload) {
  const usernameSeed = payload.email.split('@')[0] || payload.companyName;
  const username = await generateUniqueEmployeeUsername(tenant, usernameSeed);
  const temporaryPassword = generateTemporaryPassword();

  await createRecord({
    entityName: 'Employee',
    tenant,
    data: {
      name: payload.adminName,
      username,
      email: payload.email,
      password: hashEmployeePassword(temporaryPassword),
      role: 'admin',
      is_active: true,
      can_add_resident: true,
      can_edit_resident: true,
      can_delete_resident: true,
      can_register_delivery: true,
    },
  });

  return {
    username,
    temporaryPassword,
    loginUrl: buildTenantLoginUrl(tenant.slug),
  };
}

async function createTenantDefaults(tenant, payload) {
  await createRecord({
    entityName: 'CondoSettings',
    tenant,
    data: {
      condo_name: payload.companyName,
      notify_delivery_enabled: true,
      notify_refused_enabled: true,
      notify_collection_enabled: true,
      notify_keyword_enabled: true,
      notify_approval_enabled: true,
      queue_enabled: true,
      queue_interval_minutes: 5,
      silence_start_hour: 23,
      silence_end_hour: 8,
      delivery_priority: 'normal',
      approval_priority: 'normal',
      refused_priority: 'normal',
      keyword_priority: 'normal',
      collection_priority: 'normal',
      delivery_delay_minutes: 0,
      approval_delay_minutes: 0,
      refused_delay_minutes: 0,
      keyword_delay_minutes: 0,
      collection_delay_minutes: 0,
    },
  });
}

async function handleProvisionTenant(_req, payload) {
  const tenantPayload = parseTenantPayload(payload);
  const provisionMode = config.tenantProvisionMode;

  assert(['schema', 'database'].includes(provisionMode), 500, 'TENANT_PROVISION_MODE deve ser schema ou database.');

  const slug = await findAvailableTenantSlug(tenantPayload.requestedSlug || 'tenant');
  const tenantId = crypto.randomUUID();
  const sqlNamespace = provisionMode === 'schema' || provisionMode === 'database'
    ? createTenantNamespace(config.tenantDbPrefix, slug)
    : 'public';

  await ensureTenantStorageProvisioned({
    provisionMode,
    sqlNamespace,
  });

  await queryAdmin(
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
    `,
    [
      tenantId,
      slug,
      tenantPayload.companyName,
      tenantPayload.adminName,
      tenantPayload.email,
      tenantPayload.phone,
      tenantPayload.city,
      tenantPayload.units,
      tenantPayload.notes,
      provisionMode,
      sqlNamespace,
    ],
  );

  const tenant = await findTenantById(tenantId);
  assert(tenant, 500, 'Nao foi possivel finalizar o cadastro do tenant.');

  await createTenantDefaults(tenant, tenantPayload);
  const adminCredentials = await createTenantAdminUser(tenant, tenantPayload);

  return {
    success: true,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      companyName: tenant.company_name,
      adminName: tenant.admin_name,
      email: tenant.email,
      provisionMode: tenant.provision_mode,
      sqlNamespace: tenant.sql_namespace,
    },
    adminCredentials,
  };
}

export async function bootstrapDefaultAdmin() {
  const tenant = await findTenantById(config.defaultTenantId);
  if (!tenant || !config.bootstrapAdminPassword) {
    return;
  }

  await ensureBootstrapAdminForTenant(tenant, {
    name: config.bootstrapAdminName,
    username: config.bootstrapAdminUsername,
    password: config.bootstrapAdminPassword,
    email: 'admin@localhost',
  });
}

export const functionHandlers = {
  approveResidentRequest: handleApproveResidentRequest,
  deleteEmployee: handleDeleteEmployee,
  employeeLogin: handleEmployeeLogin,
  listTenants: handleListTenants,
  listEmployees: handleListEmployees,
  processNotificationQueue: handleProcessNotificationQueue,
  provisionTenant: handleProvisionTenant,
  queueCollectionNotification: handleQueueCollectionNotification,
  saveEmployee: handleSaveEmployee,
  sendDeliveryCollectionNotification: handleQueueCollectionNotification,
  sendKeywordNotification: handleSendKeywordNotification,
  sendWhatsAppMessage: handleSendWhatsAppMessage,
  setTenantStatus: handleSetTenantStatus,
  verifyEmployeePassword: handleVerifyEmployeePassword,
};

export async function invokeFunction(functionName, req, payload = {}) {
  const handler = functionHandlers[functionName];
  if (!handler) {
    throw createHttpError(404, `Function nao suportada: ${functionName}`);
  }

  return handler(req, payload);
}
