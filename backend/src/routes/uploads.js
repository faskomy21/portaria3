import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { verifyEmployeeSessionToken } from '../auth/employeeAuth.js';
import { config } from '../config.js';
import { resolveTenantFromRequest } from '../db.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function resolveExtension(file) {
  const explicit = path.extname(file.originalname || '');
  if (explicit) {
    return explicit.toLowerCase();
  }

  const type = String(file.mimetype || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  if (type.includes('gif')) return '.gif';
  return '.jpg';
}

router.use((req, res, next) => {
  const sessionToken = req.get('x-employee-session');
  if (!sessionToken) {
    return res.status(401).json({ error: 'Sessao expirada. Entre novamente.' });
  }

  try {
    req.employeeSession = verifyEmployeeSessionToken(sessionToken);
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Sessao invalida.' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo nao informado.' });
    }

    const tenant = await resolveTenantFromRequest(req);
    const directory = path.join(config.uploadDir, tenant.slug || tenant.id || 'default');
    const fileName = `${Date.now()}-${crypto.randomUUID()}${resolveExtension(req.file)}`;
    const absolutePath = path.join(directory, fileName);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(absolutePath, req.file.buffer);

    const relativePath = `${tenant.slug || tenant.id || 'default'}/${fileName}`.replace(/\\/g, '/');
    return res.status(201).json({
      file_url: `${config.publicAppUrl}/uploads/${relativePath}`,
      path: relativePath,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao enviar arquivo.' });
  }
});

export default router;
