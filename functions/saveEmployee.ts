import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  getEmployeeSessionSecret,
  hashEmployeePassword,
  normalizeUsername,
  sanitizeEmployee,
  verifyEmployeeSessionToken,
} from './_shared/employeeAuth.ts';

const ALLOWED_ROLES = new Set(['employee', 'gerente', 'admin']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  try {
    const secret = getEmployeeSessionSecret();
    const base44 = createClientFromRequest(req);
    const { sessionToken, employeeId, data } = await req.json();
    const session = await verifyEmployeeSessionToken(sessionToken, secret);

    if (session.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const name = String(data?.name || '').trim();
    const username = normalizeUsername(String(data?.username || ''));
    const rawPassword = String(data?.password || '').trim();
    const role = ALLOWED_ROLES.has(String(data?.role || '')) ? String(data.role) : 'employee';

    if (!name || !username) {
      return Response.json({ error: 'Nome e usuario sao obrigatorios.' }, { status: 400 });
    }

    if (!employeeId && !rawPassword) {
      return Response.json({ error: 'Senha obrigatoria para novos usuarios.' }, { status: 400 });
    }

    const existingWithSameUsername = await base44.asServiceRole.entities.Employee.filter({ username }, 'name', 10);
    const usernameTaken = existingWithSameUsername.some((employee) => employee.id !== employeeId);

    if (usernameTaken) {
      return Response.json({ error: 'Ja existe um funcionario com este usuario.' }, { status: 409 });
    }

    const payload: Record<string, unknown> = {
      name,
      username,
      role,
      is_active: data?.is_active !== false,
      can_add_resident: data?.can_add_resident === true,
      can_edit_resident: data?.can_edit_resident === true,
      can_delete_resident: data?.can_delete_resident === true,
      can_register_delivery: data?.can_register_delivery !== false,
    };

    if (rawPassword) {
      payload.password = await hashEmployeePassword(rawPassword);
    }

    let savedEmployee;

    if (employeeId) {
      savedEmployee = await base44.asServiceRole.entities.Employee.update(employeeId, payload);
    } else {
      savedEmployee = await base44.asServiceRole.entities.Employee.create(payload);
    }

    return Response.json({
      success: true,
      employee: sanitizeEmployee(savedEmployee),
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro ao salvar funcionario.' }, { status: 500 });
  }
});
