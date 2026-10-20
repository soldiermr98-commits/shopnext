// Shared HTTP perimeter used by the production entry and isolated integration tests.
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { securityConfig } from './security/config';
import { apiRouter } from './api';
import { requireAdmin } from './security/auth';

export function createApplication() {
  securityConfig();
  const origins = new Set((process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
  if (!origins.size) throw new Error('CORS_ORIGINS must contain explicit trusted browser origins.');
  for (const origin of origins) {
    const url = new URL(origin);
    if (origin !== url.origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Invalid CORS_ORIGINS configuration.');
  }
  const app = express();
  app.disable('x-powered-by');
  // Never blindly trust proxy-supplied IPs. Optional exact proxy IP/CIDRs only.
  if (process.env.TRUSTED_PROXIES) app.set('trust proxy', process.env.TRUSTED_PROXIES.split(',').map(s => s.trim()));
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? { directives: { imgSrc: ["'self'", 'data:', 'https:'] } } : false }));
  app.use((req,res,next) => {
    const origin = req.get('Origin');
    if (origin && !origins.has(origin)) return res.status(403).json({ error:'Origin not allowed.' });
    // Origin enforcement also protects cookie mutations against untrusted browser origins.
    if (origin) { res.vary('Origin'); res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials','true'); }
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control','no-store');
      if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
        if (req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).json({error:'Cross-site request denied.'});
        if (!origin && req.get('Sec-Fetch-Site')) return res.status(403).json({error:'Origin required.'});
      }
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers','Content-Type');
      return res.sendStatus(204);
    }
    next();
  });
  const limiter = (limit: number) => rateLimit({ windowMs:15*60*1000, limit, standardHeaders:'draft-8', legacyHeaders:false, handler:(_req,res) => res.status(429).json({error:'Too many attempts. Try later.'}) });
  const loginLimit = limiter(10), otpLimit = limiter(5);
  app.use('/api/auth/login',loginLimit);
  app.use(['/api/auth/otp/send','/api/auth/otp/verify'],otpLimit);
  app.use('/api/auth/register',limiter(5));
  app.use('/api/auth/refresh',limiter(60));
  app.use('/api/auth/change-password',limiter(10));
  app.use(cookieParser());
  // Authenticate admin requests before body parsing, even for malformed/oversized payloads.
  app.use('/api', (req,res,next) => req.path.startsWith('/admin/') ? requireAdmin(req,res,next) : next());
  app.use(express.json({limit:'1mb'}));
  app.use(express.urlencoded({extended:false,limit:'1mb'}));
  app.use('/api',apiRouter);
  app.get('/health',(req,res) => {
    if (!z.object({}).strict().safeParse(req.query).success || !z.object({}).strict().safeParse(req.body || {}).success) return res.status(400).json({error:'Invalid request.'});
    res.json({status:'ok',timestamp:new Date().toISOString()});
  });
  app.use((err: any,_req: express.Request,res: express.Response,_next: express.NextFunction) => {
    const status = err?.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500;
    res.status(status).json({error:status === 500 ? 'Internal server error.' : 'Invalid request.'});
  });
  return app;
}
