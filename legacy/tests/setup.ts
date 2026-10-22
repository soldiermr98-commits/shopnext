// Isolated per-worker DB and randomly generated fixture credentials; never use a developer's data/.env.
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(64).toString('base64url');
process.env.ADMIN_INITIAL_PASSWORD = randomBytes(32).toString('base64url');
process.env.CORS_ORIGINS = 'https://audit.invalid';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'shopnext-security-'));
delete process.env.TRUSTED_PROXIES;
afterAll(() => rmSync(process.env.DATA_DIR!, { recursive: true, force: true }));
