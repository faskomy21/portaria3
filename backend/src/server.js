import fs from 'node:fs/promises';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { closeAllPools, ensureInitialized } from './db.js';
import { bootstrapDefaultAdmin } from './functions/handlers.js';
import entityRoutes from './routes/entities.js';
import functionRoutes from './routes/functions.js';
import uploadRoutes from './routes/uploads.js';

const app = express();

app.use(
  cors({
    origin: true,
  }),
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/api/health', async (_req, res) => {
  res.json({
    success: true,
    service: 'portaria-facil-backend',
    date: new Date().toISOString(),
  });
});

app.use('/api/entities', entityRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/uploads', express.static(config.uploadDir));

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

async function start() {
  await ensureInitialized();
  await fs.mkdir(config.uploadDir, { recursive: true });
  await bootstrapDefaultAdmin();

  const server = app.listen(config.port, () => {
    console.log(`Self-hosted backend ativo em http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeAllPools();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error('Falha ao iniciar o backend:', error);
  await closeAllPools();
  process.exit(1);
});
