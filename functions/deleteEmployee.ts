import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { getEmployeeSessionSecret, verifyEmployeeSessionToken } from './_shared/employeeAuth.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  try {
    const secret = getEmployeeSessionSecret();
    const base44 = createClientFromRequest(req);
    const { sessionToken, employeeId } = await req.json();
    const session = await verifyEmployeeSessionToken(sessionToken, secret);

    if (session.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    if (!employeeId) {
      return Response.json({ error: 'employeeId e obrigatorio.' }, { status: 400 });
    }

    if (session.id === employeeId) {
      return Response.json({ error: 'Nao e permitido remover o proprio usuario.' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Employee.delete(employeeId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro ao remover funcionario.' }, { status: 500 });
  }
});
