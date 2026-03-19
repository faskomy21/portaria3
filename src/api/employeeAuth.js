import { base44 } from '@/api/base44Client';
import { getSessionToken, logoutEmployee } from '@/components/auth/AuthEmployee';

async function invokeProtectedEmployeeFunction(functionName, payload = {}) {
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    logoutEmployee();
    if (typeof window !== 'undefined') {
      window.location.href = '/Access';
    }
    throw new Error('Sessao expirada. Entre novamente.');
  }

  try {
    return await base44.functions.invoke(functionName, {
      sessionToken,
      ...payload,
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      logoutEmployee();
      if (typeof window !== 'undefined') {
        window.location.href = '/Access';
      }
    }

    throw error;
  }
}

export function loginEmployeeWithPassword(credentials) {
  return base44.functions.invoke('employeeLogin', credentials);
}

export function listEmployeesSecure() {
  return invokeProtectedEmployeeFunction('listEmployees');
}

export function saveEmployeeSecure({ employeeId, data }) {
  return invokeProtectedEmployeeFunction('saveEmployee', { employeeId, data });
}

export function deleteEmployeeSecure(employeeId) {
  return invokeProtectedEmployeeFunction('deleteEmployee', { employeeId });
}

export function verifyCurrentEmployeePassword(password) {
  return invokeProtectedEmployeeFunction('verifyEmployeePassword', { password });
}

export function listTenantsSecure() {
  return invokeProtectedEmployeeFunction('listTenants');
}

export function setTenantStatusSecure({ tenantId, status }) {
  return invokeProtectedEmployeeFunction('setTenantStatus', { tenantId, status });
}
