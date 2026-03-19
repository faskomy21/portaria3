import { Router } from 'express';
import { verifyEmployeeSessionToken } from '../auth/employeeAuth.js';
import { resolveTenantFromRequest } from '../db.js';
import { assertEntityActionAllowed } from '../entities/config.js';
import {
  bulkCreateRecords,
  createRecord,
  deleteRecord,
  getRecordById,
  listRecords,
  updateRecord,
} from '../entities/repository.js';

const router = Router();

function attachEmployeeSession(req, res, next) {
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
}

function ensureEntityAccess(entityName, action, isAuthenticated) {
  try {
    assertEntityActionAllowed(entityName, action, isAuthenticated);
  } catch (error) {
    if (error.message?.includes('Acesso negado')) {
      error.statusCode = 403;
    } else if (error.message?.includes('nao suportada')) {
      error.statusCode = 404;
    } else {
      error.statusCode = 400;
    }
    throw error;
  }
}

function parseFilterQuery(rawValue) {
  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    const err = new Error('Filtro invalido.');
    err.statusCode = 400;
    throw err;
  }
}

router.use(attachEmployeeSession);

router.post('/:entityName/bulk', async (req, res) => {
  try {
    const isAuthenticated = Boolean(req.employeeSession);
    ensureEntityAccess(req.params.entityName, 'bulkCreate', isAuthenticated);
    const tenant = await resolveTenantFromRequest(req, req.body || {});
    const created = await bulkCreateRecords({
      entityName: req.params.entityName,
      tenant,
      items: Array.isArray(req.body) ? req.body : [],
    });

    res.json(created);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar registros.' });
  }
});

router.get('/:entityName', async (req, res) => {
  try {
    const isAuthenticated = Boolean(req.employeeSession);
    const action = req.query.q ? 'filter' : 'list';
    ensureEntityAccess(req.params.entityName, action, isAuthenticated);
    const tenant = await resolveTenantFromRequest(req);
    const data = await listRecords({
      entityName: req.params.entityName,
      tenant,
      query: parseFilterQuery(req.query.q),
      sort: req.query.sort,
      limit: req.query.limit,
      skip: req.query.skip,
      fields: req.query.fields,
    });

    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao listar registros.' });
  }
});

router.get('/:entityName/:id', async (req, res) => {
  try {
    const isAuthenticated = Boolean(req.employeeSession);
    ensureEntityAccess(req.params.entityName, 'get', isAuthenticated);
    const tenant = await resolveTenantFromRequest(req);
    const record = await getRecordById({
      entityName: req.params.entityName,
      tenant,
      id: req.params.id,
    });

    if (!record) {
      return res.status(404).json({ error: 'Registro nao encontrado.' });
    }

    return res.json(record);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao buscar registro.' });
  }
});

router.post('/:entityName', async (req, res) => {
  try {
    const isAuthenticated = Boolean(req.employeeSession);
    ensureEntityAccess(req.params.entityName, 'create', isAuthenticated);
    const tenant = await resolveTenantFromRequest(req, req.body || {});
    const record = await createRecord({
      entityName: req.params.entityName,
      tenant,
      data: req.body || {},
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao criar registro.' });
  }
});

router.put('/:entityName/:id', async (req, res) => {
  try {
    const isAuthenticated = Boolean(req.employeeSession);
    ensureEntityAccess(req.params.entityName, 'update', isAuthenticated);
    const tenant = await resolveTenantFromRequest(req, req.body || {});
    const record = await updateRecord({
      entityName: req.params.entityName,
      tenant,
      id: req.params.id,
      data: req.body || {},
    });

    if (!record) {
      return res.status(404).json({ error: 'Registro nao encontrado.' });
    }

    return res.json(record);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao atualizar registro.' });
  }
});

router.delete('/:entityName/:id', async (req, res) => {
  try {
    const isAuthenticated = Boolean(req.employeeSession);
    ensureEntityAccess(req.params.entityName, 'delete', isAuthenticated);
    const tenant = await resolveTenantFromRequest(req);
    const deleted = await deleteRecord({
      entityName: req.params.entityName,
      tenant,
      id: req.params.id,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Registro nao encontrado.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao remover registro.' });
  }
});

export default router;
