import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  createEmployeeSessionToken,
  getEmployeeSessionSecret,
  hashEmployeePassword,
  normalizeUsername,
  sanitizeEmployee,
  verifyEmployeePassword,
} from './_shared/employeeAuth.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  try {
    const secret = getEmployeeSessionSecret();
    const base44 = createClientFromRequest(req);
    const { username, password } = await req.json();

    const normalizedUsername = normalizeUsername(String(username || ''));
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedPassword) {
      return Response.json({ error: 'Usuario e senha sao obrigatorios.' }, { status: 400 });
    }

    const employees = await base44.asServiceRole.entities.Employee.filter({ username: normalizedUsername }, 'name', 1);
    const employee = employees[0];

    if (!employee || employee.is_active === false) {
      return Response.json({ error: 'Usuario ou senha incorretos.' }, { status: 401 });
    }

    const passwordCheck = await verifyEmployeePassword(normalizedPassword, employee.password);
    if (!passwordCheck.matches) {
      return Response.json({ error: 'Usuario ou senha incorretos.' }, { status: 401 });
    }

    if (passwordCheck.needsRehash) {
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        password: await hashEmployeePassword(normalizedPassword),
      });
    }

    const safeEmployee = sanitizeEmployee(employee);
    const sessionToken = await createEmployeeSessionToken(safeEmployee, secret);

    return Response.json({
      success: true,
      employee: safeEmployee,
      sessionToken,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro interno ao autenticar funcionario.' }, { status: 500 });
  }
});
