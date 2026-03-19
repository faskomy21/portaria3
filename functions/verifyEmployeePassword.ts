import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  getEmployeeSessionSecret,
  hashEmployeePassword,
  verifyEmployeePassword,
  verifyEmployeeSessionToken,
} from './_shared/employeeAuth.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  try {
    const secret = getEmployeeSessionSecret();
    const base44 = createClientFromRequest(req);
    const { sessionToken, password } = await req.json();
    const session = await verifyEmployeeSessionToken(sessionToken, secret);

    const employee = await base44.asServiceRole.entities.Employee.get(session.id);
    if (!employee || employee.is_active === false) {
      return Response.json({ error: 'Sessao invalida.' }, { status: 401 });
    }

    const passwordCheck = await verifyEmployeePassword(String(password || ''), employee.password);
    if (!passwordCheck.matches) {
      return Response.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    if (passwordCheck.needsRehash) {
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        password: await hashEmployeePassword(String(password || '')),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro ao verificar senha.' }, { status: 500 });
  }
});
