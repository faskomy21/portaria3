import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  getEmployeeSessionSecret,
  hashEmployeePassword,
  needsPasswordMigration,
  sanitizeEmployee,
  verifyEmployeeSessionToken,
} from './_shared/employeeAuth.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  try {
    const secret = getEmployeeSessionSecret();
    const base44 = createClientFromRequest(req);
    const { sessionToken } = await req.json();
    const session = await verifyEmployeeSessionToken(sessionToken, secret);

    if (session.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const employees = await base44.asServiceRole.entities.Employee.list('name');

    for (const employee of employees) {
      if (needsPasswordMigration(employee.password)) {
        await base44.asServiceRole.entities.Employee.update(employee.id, {
          password: await hashEmployeePassword(String(employee.password)),
        });
      }
    }

    const refreshedEmployees = await base44.asServiceRole.entities.Employee.list('name');

    return Response.json({
      success: true,
      employees: refreshedEmployees.map(sanitizeEmployee),
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro ao listar funcionarios.' }, { status: 500 });
  }
});
