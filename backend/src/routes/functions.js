import { Router } from 'express';
import { verifyEmployeeSessionToken } from '../auth/employeeAuth.js';
import { invokeFunction } from '../functions/handlers.js';

const router = Router();

router.use((req, res, next) => {
  const sessionToken = req.get('x-employee-session');
  if (!sessionToken) {
    return next();
  }

  try {
    req.employeeSession = verifyEmployeeSessionToken(sessionToken);
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Sessao invalida.' });
  }
});

router.post('/:functionName', async (req, res) => {
  try {
    const response = await invokeFunction(req.params.functionName, req, req.body || {});
    res.json(response);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao executar function.' });
  }
});

export default router;
