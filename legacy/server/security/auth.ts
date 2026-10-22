// Cookie-only access JWTs bound to durable, rotating, revocable server sessions.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { getDb, mutateDatabase } from '../db/database';
import { usersRepo } from '../db/repository';
import { securityConfig } from './config';
import type { User, UserRole } from '../../shared/types';

export const ACCESS_COOKIE = '__Host-shopnext_access';
export const REFRESH_COOKIE = '__Host-shopnext_refresh';
const options = { httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/' };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function row(id: string): any {
  const stmt = getDb().prepare('SELECT * FROM auth_sessions WHERE id = ?');
  try { stmt.bind([id]); return stmt.step() ? stmt.getAsObject() : null; } finally { stmt.free(); }
}
function write(sql: string, params: any[]) { mutateDatabase(db => { db.run(sql, params); }); }
function accessPayload(req: Request, ignoreExpiration = false): any {
  try {
    return jwt.verify(req.cookies?.[ACCESS_COOKIE] || '', securityConfig().secret, {
      algorithms: ['HS256'], issuer: 'shopnext', audience: 'shopnext-web', ignoreExpiration,
    });
  } catch { return null; }
}
export function getUserFromReq(req: Request): User | null {
  const payload = accessPayload(req);
  if (!payload || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
  const session = row(payload.sid);
  if (!session || session.user_id !== payload.sub || session.expires_at <= Date.now()) return null;
  return usersRepo.findById(payload.sub);
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  (req as any).user = user;
  next();
}
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user?.mustChangePassword) return res.status(403).json({ error: 'Password change required.', code: 'PASSWORD_CHANGE_REQUIRED' });
  next();
}
export const ADMIN_PERMISSIONS: Record<string, readonly UserRole[]> = {
  dashboard: ['super_admin', 'admin', 'shop_manager'],
  products: ['super_admin', 'admin', 'shop_manager'],
  orders: ['super_admin', 'admin', 'shop_manager'],
  customers: ['super_admin', 'admin', 'shop_manager'],
  settings: ['super_admin', 'admin'],
  logs: ['super_admin', 'admin'],
};
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    requirePasswordChanged(req, res, () => {
      const resource = req.path.split('/')[2];
      if (!ADMIN_PERMISSIONS[resource]?.includes((req as any).user.role)) return res.status(403).json({ error: 'Permission denied.' });
      next();
    });
  });
}
function setSessionCookies(res: Response, id: string, userId: string, refresh: string) {
  const config = securityConfig();
  const access = jwt.sign({ sid: id }, config.secret, { subject: userId, algorithm: 'HS256', issuer: 'shopnext', audience: 'shopnext-web', expiresIn: config.accessSeconds });
  res.cookie(ACCESS_COOKIE, access, { ...options, maxAge: config.accessSeconds * 1000 });
  res.cookie(REFRESH_COOKIE, `${id}.${refresh}`, { ...options, maxAge: config.refreshSeconds * 1000 });
  res.setHeader('Cache-Control', 'no-store');
}
export function issueSession(res: Response, userId: string) {
  const id = randomUUID(), refresh = randomBytes(48).toString('base64url');
  write('INSERT INTO auth_sessions (id,user_id,refresh_hash,expires_at) VALUES (?,?,?,?)', [id, userId, digest(refresh), Date.now() + securityConfig().refreshSeconds * 1000]);
  setSessionCookies(res, id, userId, refresh);
}
export function refreshSession(req: Request, res: Response) {
  const value = req.cookies?.[REFRESH_COOKIE];
  if (typeof value !== 'string') return res.status(401).json({ error: 'Session expired.' });
  const [id, refresh, extra] = value.split('.');
  const session = row(id || '');
  if (extra || !refresh || !session || session.expires_at <= Date.now()) return res.status(401).json({ error: 'Session expired.' });
  const hash = digest(refresh);
  if (!timingSafeEqual(Buffer.from(hash), Buffer.from(session.refresh_hash))) {
    // Reuse revokes the entire session, including its most recently issued access JWT.
    write('DELETE FROM auth_sessions WHERE id = ?', [id]);
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Session expired.' });
  }
  const user = usersRepo.findById(session.user_id);
  if (!user) { write('DELETE FROM auth_sessions WHERE id = ?', [id]); return res.status(401).json({ error: 'Session expired.' }); }
  const next = randomBytes(48).toString('base64url');
  write('UPDATE auth_sessions SET refresh_hash = ? WHERE id = ? AND refresh_hash = ?', [digest(next), id, hash]);
  setSessionCookies(res, id, user.id, next);
  res.json({ success: true, user });
}
export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, options); res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie('digistyle_token', { path: '/' });
}
export function revokeUserSessions(userId: string) { write('DELETE FROM auth_sessions WHERE user_id = ?', [userId]); }
export function logoutSession(req: Request, res: Response) {
  const payload = accessPayload(req, true);
  let id = typeof payload?.sid === 'string' ? payload.sid : undefined;
  if (!id) {
    const value = req.cookies?.[REFRESH_COOKIE];
    if (typeof value === 'string') {
      const [candidate, refresh, extra] = value.split('.');
      const session = row(candidate || '');
      if (!extra && refresh && session && digest(refresh) === session.refresh_hash) id = candidate;
    }
  }
  if (id) write('DELETE FROM auth_sessions WHERE id = ?', [id]);
  clearSessionCookies(res);
  res.json({ success: true });
}

// Password rotation and revocation are a single persisted mutation.
export function changePasswordSession(res: Response, userId: string, hash: string) {
  const id = randomUUID(), refresh = randomBytes(48).toString('base64url');
  mutateDatabase(db => {
    db.run('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [hash,userId]);
    db.run('DELETE FROM auth_sessions WHERE user_id = ?', [userId]);
    db.run('INSERT INTO auth_sessions (id,user_id,refresh_hash,expires_at) VALUES (?,?,?,?)', [id,userId,digest(refresh),Date.now()+securityConfig().refreshSeconds*1000]);
  });
  setSessionCookies(res,id,userId,refresh);
}
