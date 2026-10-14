/**
 * @file server.ts
 * @description Full-Stack Express + MongoDB + Vite Entry Point.
 * Serves REST API under /api/invoices and mounts Vite middleware in development
 * or static production bundle in production/Docker.
 * 
 * Admin authentication flow:
 * 1. On startup, seedAdminUser() creates the admin from ADMIN_EMAIL + ADMIN_PASSWORD env vars
 *    into MongoDB with bcrypt-hashed password. No plaintext credentials in source code.
 * 2. All /api/invoices/* routes are protected by requireAdminAuth middleware.
 * 3. Tokens are HMAC-SHA256 signed (AUTH_SECRET env var) and valid for 1 month.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { invoiceRepository } from './backend/store/repository.js';
import { invoiceRouter } from './backend/routes/invoiceRoutes.js';
import { authRouter } from './backend/routes/authRoutes.js';
import { requireAdminAuth } from './backend/middleware/authMiddleware.js';
import { seedAdminUser } from './backend/auth/adminSeeder.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // Initialize Database Connection (MongoDB or Mongoose-Validated Local Store Fallback)
  const dbConnection = await invoiceRepository.connectMongo(process.env.MONGODB_URI);
  console.log(`[Database Architect] Storage Mode: ${dbConnection.mode} (${dbConnection.uri})`);

  // Seed the admin user into MongoDB (runs only if admin doesn't exist yet)
  if (dbConnection.mode === 'mongodb') {
    await seedAdminUser();
  }

  // API Health & Metadata Route
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: invoiceRepository.getEngineStatus(),
    });
  });

  // Mount Admin Authentication Routes
  app.use('/api/auth', authRouter);

  // Mount Invoice Routes (Protected by Admin Authentication)
  app.use('/api/invoices', requireAdminAuth, invoiceRouter);

  // Vite middleware for development vs static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Senior Full-Stack Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
