// ===== INITIALIZATION & STARTUP =====
// Express server entry point mounting SQLite database, REST API under /api and Vite middlewares

import express from 'express';
import { createApplication } from './app';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? parseInt(process.env.PORT || '3000', 10) : 3000;

async function startServer() {
  // Validate HTTP/security configuration before touching the database.
  const app = createApplication();
  console.log('Initializing database...');
  await initDatabase();

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('✓ Vite dev middlewares mounted.');
  } else {
    // Production mode: Serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('✓ Production static files configured.');
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API operation not found.' }));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Digistyle Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
