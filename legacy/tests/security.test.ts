import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createApplication } from '../server/app';
import { getDb, initDatabase, mutateDatabase } from '../server/db/database';
import { productsRepo, ordersRepo, settingsRepo, usersRepo } from '../server/db/repository';
import { ACCESS_COOKIE, REFRESH_COOKIE, ADMIN_PERMISSIONS } from '../server/security/auth';
import { securityConfig } from '../server/security/config';
import { contracts } from '../server/security/validation';
import type { Product, UserRole } from '../shared/types';

const expectedPermissions: Record<string, UserRole[]> = {
  dashboard:['super_admin','admin','shop_manager'], products:['super_admin','admin','shop_manager'],
  orders:['super_admin','admin','shop_manager'], customers:['super_admin','admin','shop_manager'],
  settings:['super_admin','admin'], logs:['super_admin','admin'],
};
const roles: UserRole[] = ['super_admin','admin','shop_manager','content_editor','support','customer'];
const fixturePassword = randomBytes(32).toString('base64url');
const cookieJar: Record<string,string[]> = {};
const ids: Record<string,string> = {};
let app: ReturnType<typeof createApplication>;
let target: Product;
let orderId: string;
const cookieStrings = (res: request.Response): string[] => {
  const values = res.headers['set-cookie'];
  return (typeof values === 'string' ? [values] : values || []).map((v:string) => v.split(';')[0]);
};
const valueOf = (cookies:string[], name:string) => cookies.find(c => c.startsWith(name+'='))!.slice(name.length+1);
const product = (): Product => ({ id:randomUUID(),title:'Security fixture',slug:randomUUID(),sku:randomUUID(),brand:'Fixture',categoryIds:[],type:'simple',price:100,stock:20,rating:0,reviewsCount:0,fullDescription:'Fixture',mainImage:'https://audit.invalid/image.png',galleryImages:[],status:'published',featured:false,tags:[],attributes:{},specifications:[],createdAt:new Date().toISOString() });
const adminRoutes = [
  ['GET','/admin/dashboard','dashboard'], ['GET','/admin/products','products'],
  ['POST','/admin/products','products'], ['PUT','/admin/products/:id','products'], ['DELETE','/admin/products/:id','products'],
  ['GET','/admin/orders','orders'], ['PUT','/admin/orders/:id/status','orders'],
  ['GET','/admin/customers','customers'], ['GET','/admin/settings','settings'], ['PUT','/admin/settings','settings'], ['GET','/admin/logs','logs'],
];
function callAdmin(method:string, route:string, cookies:string[] = []) {
  let url=route, body:any;
  if (route.includes('products/:id')) {
    const item = method === 'DELETE' ? productsRepo.create(product()) : target;
    url=route.replace(':id',item.id);
    if (method==='PUT') body={title:'Security updated'};
  }
  if (method==='POST') body=product();
  if (route.includes('orders/:id')) { url=route.replace(':id',orderId); body={status:'processing'}; }
  if (method==='PUT' && route==='/admin/settings') body={storeName:'Security fixture store'};
  const r=(request(app) as any)[method.toLowerCase()]('/api'+url).set('Cookie',cookies);
  return body ? r.send(body) : r;
}
beforeAll(async () => {
  await initDatabase(); app=createApplication(); target=productsRepo.create(product());
  orderId=ordersRepo.list()[0].id;
  const hash=await bcrypt.hash(fixturePassword,12);
  for (const role of roles) {
    const id=randomUUID(); ids[role]=id;
    usersRepo.create({id,name:'Security fixture',phone:id,password_hash:hash,role,created_at:new Date().toISOString()});
    const res=await request(app).post('/api/auth/login').send({identifier:id,password:fixturePassword});
    expect(res.status).toBe(200); cookieJar[role]=cookieStrings(res);
  }
});

describe('ALL admin endpoints: anonymous, invalid, expired and missing-user sessions fail closed', () => {
  for (const [method,path] of adminRoutes) {
    for (const kind of ['none','invalid','expired','unknown-user','missing-session','bearer-only']) {
      it(`${method} ${path}: ${kind} → 401`,async () => {
        const original=jwt.decode(decodeURIComponent(valueOf(cookieJar.super_admin,ACCESS_COOKIE))) as any;
        let cookies:string[]=[];
        if (kind==='invalid') cookies=[ACCESS_COOKIE+'='+randomBytes(30).toString('base64url')];
        if (['expired','unknown-user','missing-session'].includes(kind)) {
          const token=jwt.sign({sid:kind==='missing-session' ? randomUUID() : original.sid},process.env.JWT_SECRET!,{subject:kind==='unknown-user' ? randomUUID() : ids.super_admin,issuer:'shopnext',audience:'shopnext-web',algorithm:'HS256',expiresIn:kind==='expired' ? -1 : 900});
          cookies=[ACCESS_COOKIE+'='+token];
        }
        const req=callAdmin(method,path,cookies);
        if (kind==='bearer-only') req.set('Authorization','Bearer '+valueOf(cookieJar.super_admin,ACCESS_COOKIE));
        expect((await req).status).toBe(401);
      });
    }
  }
});
describe('ALL admin endpoints: explicit resource permissions', () => {
  it('policy equals the independently specified least-privilege matrix', () => { expect(ADMIN_PERMISSIONS).toEqual(expectedPermissions); });
  for (const [method,path,resource] of adminRoutes) for (const role of roles) {
    const expected=expectedPermissions[resource].includes(role) ? 200 : 403;
    it(`${method} ${path}: ${role} → ${expected}`,async () => {
      expect((await callAdmin(method,path,cookieJar[role])).status).toBe(expected);
    });
  }
});

describe('authentication lifecycle', () => {
  it('does not boot with a missing, short or low-diversity signing secret', () => {
    const original=process.env.JWT_SECRET;
    for (const invalid of [undefined,'short','x'.repeat(64)]) {
      if (invalid===undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET=invalid;
      expect(() => createApplication()).toThrow(/JWT_SECRET/);
    }
    process.env.JWT_SECRET=original;
    expect(securityConfig().accessSeconds).toBe(900);
  });
  it('bootstrap admin has bcrypt hash and must rotate before any admin endpoint',async () => {
    const local=createApplication();
    const login=await request(local).post('/api/auth/login').send({identifier:'admin',password:process.env.ADMIN_INITIAL_PASSWORD});
    expect(login.status).toBe(200);expect(login.body.user.mustChangePassword).toBe(true);
    const cookies=cookieStrings(login);
    for (const [method,path] of adminRoutes) expect((await (request(local) as any)[method.toLowerCase()]('/api'+path.replace(':id',target.id)).set('Cookie',cookies).send({})).status).toBe(403);
    expect(await bcrypt.compare(process.env.ADMIN_INITIAL_PASSWORD!,usersRepo.findRawById('usr-admin').password_hash)).toBe(true);
    const changed=await request(local).post('/api/auth/change-password').set('Cookie',cookies).send({oldPassword:process.env.ADMIN_INITIAL_PASSWORD,newPassword:randomBytes(32).toString('base64url')});
    expect(changed.status).toBe(200); expect(changed.body.user.mustChangePassword).toBe(false);
    expect((await request(local).get('/api/admin/dashboard').set('Cookie',cookieStrings(changed))).status).toBe(200);
    expect((await request(local).get('/api/admin/dashboard').set('Cookie',cookies)).status).toBe(401);
    expect((await request(local).post('/api/auth/refresh').set('Cookie',cookies)).status).toBe(401);
  });
  it('uses only HttpOnly Secure SameSite=Strict host cookies, no body tokens',async () => {
    const res=await request(createApplication()).post('/api/auth/login').send({identifier:ids.admin,password:fixturePassword});
    const payload=jwt.decode(decodeURIComponent(valueOf(cookieStrings(res),ACCESS_COOKIE))) as any;
    expect(payload.exp-payload.iat).toBe(900);
    expect(res.status).toBe(200);expect(res.body.token).toBeUndefined();expect(res.body.user.password_hash).toBeUndefined();
    const cookies=res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).toContain('SameSite=Strict');expect(cookie).toContain('Path=/');expect(cookie).not.toContain('Domain=');}
  });
  it('rotates refresh, rejects replay and revokes the session on reuse',async () => {
    const local=createApplication();
    const login=await request(local).post('/api/auth/login').send({identifier:ids.admin,password:fixturePassword});
    const old=cookieStrings(login);
    const refreshed=await request(local).post('/api/auth/refresh').set('Cookie',old);
    expect(refreshed.status).toBe(200);
    const fresh=cookieStrings(refreshed);expect(valueOf(fresh,REFRESH_COOKIE)).not.toBe(valueOf(old,REFRESH_COOKIE));
    expect((await request(local).get('/api/auth/me').set('Cookie',fresh)).status).toBe(200);
    expect((await request(local).post('/api/auth/refresh').set('Cookie',old)).status).toBe(401);
    expect((await request(local).get('/api/auth/me').set('Cookie',fresh)).status).toBe(401);
  });
  it('logout revokes both access and refresh, not just browser storage',async () => {
    const local=createApplication();const login=await request(local).post('/api/auth/login').send({identifier:ids.admin,password:fixturePassword});const cookies=cookieStrings(login);
    expect((await request(local).post('/api/auth/logout').set('Cookie',cookies)).status).toBe(200);
    expect((await request(local).get('/api/auth/me').set('Cookie',cookies)).status).toBe(401);
    expect((await request(local).post('/api/auth/refresh').set('Cookie',cookies)).status).toBe(401);
  });
  it('a deleted user cannot use an otherwise valid access/refresh session',async () => {
    const id=randomUUID();usersRepo.create({id,name:'Deleted fixture',phone:id,role:'admin',password_hash:await bcrypt.hash(fixturePassword,4),created_at:new Date().toISOString()});
    const local=createApplication();const login=await request(local).post('/api/auth/login').send({identifier:id,password:fixturePassword});const cookies=cookieStrings(login);
    mutateDatabase(db=>db.run('DELETE FROM users WHERE id = ?',[id]));
    expect((await request(local).get('/api/admin/dashboard').set('Cookie',cookies)).status).toBe(401);
    expect((await request(local).post('/api/auth/refresh').set('Cookie',cookies)).status).toBe(401);
  });
  it('password change requires current password and rejects weak replacements',async () => {
    const local=createApplication();
    expect((await request(local).post('/api/auth/change-password').set('Cookie',cookieJar.customer).send({newPassword:fixturePassword})).status).toBe(400);
    expect((await request(local).post('/api/auth/change-password').set('Cookie',cookieJar.customer).send({oldPassword:fixturePassword,newPassword:'short'})).status).toBe(400);
    expect((await request(local).post('/api/auth/change-password').set('Cookie',cookieJar.customer).send({oldPassword:randomUUID(),newPassword:randomBytes(32).toString('base64url')})).status).toBe(401);
  });
  it('registers a customer with bcrypt, never accepts a submitted role',async () => {
    const local=createApplication(), phone='09'+String(Date.now()).slice(-9), password=randomBytes(32).toString('base64url');
    const bad=await request(local).post('/api/auth/register').send({name:'Fixture',phone,password,role:'super_admin'});expect(bad.status).toBe(400);
    const res=await request(local).post('/api/auth/register').send({name:'Fixture',phone,password});expect(res.status).toBe(200);expect(res.body.user.role).toBe('customer');
    expect(await bcrypt.compare(password,usersRepo.findRawById(res.body.user.id).password_hash)).toBe(true);
  });
});

describe('write-only settings and response secrecy', () => {
  it('never returns known, top-level, nested, legacy or unknown stored secrets on read/save',async () => {
    const secret=randomBytes(32).toString('base64url');
    settingsRepo.update({shaparakMerchantId:secret,kavenegarApiKey:secret,shaparakTerminalId:secret,
      gateways:{zarinpal:{merchantId:secret,apiKey:secret,pin:secret,password:secret,secret,terminalId:secret,unknownSecret:secret},unknownProvider:{apiKey:secret}},
      sms:{melipayamak:{username:secret,apiKey:secret,password:secret},farazsms:{apiKey:secret}},unknownSecret:secret} as any);
    for (const response of [await request(app).get('/api/admin/settings').set('Cookie',cookieJar.admin), await request(app).put('/api/admin/settings').set('Cookie',cookieJar.admin).send({storeName:'Safe name'})]) {
      expect(response.status).toBe(200);expect(JSON.stringify(response.body)).not.toContain(secret);
      const dto=response.body.settings || response.body;
      expect(dto.gateways.zarinpal.merchantId).toEqual({masked:'••••••••',isSet:true});expect(dto.unknownSecret).toBeUndefined();expect(dto.gateways.unknownProvider).toBeUndefined();
    }
    expect(settingsRepo.get().gateways.zarinpal.merchantId).toBe(secret);
  });
  it('only explicit newValue updates a secret; omitted nested siblings survive',async () => {
    const secret=randomBytes(32).toString('base64url'),other=randomBytes(32).toString('base64url');
    settingsRepo.update({gateways:{zarinpal:{merchantId:other,title:'Existing'},zibal:{merchantId:other}}});
    const res=await request(app).put('/api/admin/settings').set('Cookie',cookieJar.admin).send({gateways:{zarinpal:{merchantId:{newValue:secret}}}});
    expect(res.status).toBe(200);expect(JSON.stringify(res.body)).not.toContain(secret);expect(JSON.stringify(res.body)).not.toContain(other);
    expect(settingsRepo.get().gateways.zarinpal.merchantId).toBe(secret);expect(settingsRepo.get().gateways.zarinpal.title).toBe('Existing');expect(settingsRepo.get().gateways.zibal.merchantId).toBe(other);
    for (const value of [secret,{masked:'••••••••',isSet:true},{newValue:'••••••••'}]) {
      expect((await request(app).put('/api/admin/settings').set('Cookie',cookieJar.admin).send({gateways:{zarinpal:{merchantId:value}}})).status).toBe(400);
      expect(settingsRepo.get().gateways.zarinpal.merchantId).toBe(secret);
    }
  });
  it('disk write failure returns 500 with no raw secrets, preserves memory and disk',async () => {
    const before=settingsRepo.get(), disk=fs.readFileSync(join(process.env.DATA_DIR!,'digistyle.db'));
    const secret=randomBytes(32).toString('base64url');
    const spy=vi.spyOn(fs,'renameSync').mockImplementation(()=>{throw new Error(secret);});
    let res:request.Response;
    try {res=await request(app).put('/api/admin/settings').set('Cookie',cookieJar.admin).send({storeName:'Must not commit',gateways:{zarinpal:{merchantId:{newValue:secret}}}});} finally {spy.mockRestore();}
    expect(res!.status).toBe(500);expect(JSON.stringify(res!.body)).not.toContain(secret);expect(settingsRepo.get()).toEqual(before);expect(fs.readFileSync(join(process.env.DATA_DIR!,'digistyle.db'))).toEqual(disk);
  });
});

describe('HTTP perimeter and endpoint validation', () => {
  it('helmet headers, explicit CORS allowlist and cross-site mutation protection',async () => {
    const local=createApplication();
    const good=await request(local).get('/health').set('Origin','https://audit.invalid');expect(good.status).toBe(200);expect(good.headers['access-control-allow-origin']).toBe('https://audit.invalid');expect(good.headers['access-control-allow-credentials']).toBe('true');expect(good.headers['x-content-type-options']).toBe('nosniff');expect(good.headers['x-powered-by']).toBeUndefined();
    expect((await request(local).get('/health').set('Origin','https://untrusted.invalid')).status).toBe(403);
    expect((await request(local).post('/api/auth/logout').set('Origin','https://untrusted.invalid').set('Cookie',cookieJar.admin)).status).toBe(403);
    expect((await request(local).post('/api/auth/logout').set('Sec-Fetch-Site','cross-site').set('Cookie',cookieJar.admin)).status).toBe(403);
  });
  for (const path of ['/auth/login','/auth/otp/send','/auth/otp/verify']) it(`${path} is rate limited`,async () => {
    const local=createApplication();let last:request.Response;
    const body=path.includes('otp') ? {phone:'09'+String(Date.now()).slice(-9),...(path.endsWith('verify')?{code:'000000'}:{})} : {identifier:randomUUID(),password:fixturePassword};
    const count=path==='/auth/login' ? 11 : 6;
    for (let i=0;i<count;i++) last=await request(local).post('/api'+path).send(body);
    expect(last!.status).toBe(429);expect(last!.headers['retry-after']).toBeDefined();
  });
  it('OTP fails closed without a transport; never returns a code or authenticates',async () => {
    const local=createApplication();
    for (const path of ['/auth/otp/send','/auth/otp/verify']) {
      const res=await request(local).post('/api'+path).send({phone:'09'+String(Date.now()).slice(-9),...(path.endsWith('verify')?{code:'000000'}:{})});expect(res.status).toBe(503);expect(res.body.code).toBeUndefined();expect(res.headers['set-cookie']).toBeUndefined();
    }
  });
  it('every registered API contract rejects unknown query input, after auth',async () => {
    for (const c of contracts) {
      const path=c.path.replace(/:[^/]+/g,target.id);
      const res=await (request(createApplication()) as any)[c.method.toLowerCase()]('/api'+path+'?unexpected=value').set('Cookie',cookieJar.admin).send(c.body ? {} : undefined);
      expect(res.status,`${c.method} ${c.path}`).toBe(400);
    }
  });
  it('route registry covers every actual API handler, including new auth routes', () => {
    const source=fs.readFileSync(new URL('../server/api.ts',import.meta.url),'utf8');
    const actual=[...source.matchAll(/apiRouter\.(get|post|put|delete)\('([^']+)'/g)].map(m=>m[1].toUpperCase()+' '+m[2]);
    expect(contracts.map(c=>c.method+' '+c.path).sort()).toEqual(actual.sort());
  });
  it('rejects malformed JSON, unknown routes, unknown fields and unsafe pagination',async () => {
    expect((await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{')).status).toBe(400);
    expect((await request(app).get('/api/unknown')).status).toBe(404);
    expect((await request(app).get('/api/admin/products?limit=NaN').set('Cookie',cookieJar.admin)).status).toBe(400);
    expect((await request(app).get('/api/products?limit=999999')).status).toBe(400);
    expect((await request(app).put('/api/admin/settings').set('Cookie',cookieJar.admin).send({unknownSecret:randomUUID()})).status).toBe(400);
  });
  it('does not disclose another customer order or substitute sample orders',async () => {
    expect((await request(app).get('/api/orders/'+orderId)).status).toBe(401);
    expect((await request(app).get('/api/orders/'+orderId).set('Cookie',cookieJar.customer)).status).toBe(403);
    const own=await request(app).get('/api/orders').set('Cookie',cookieJar.customer);expect(own.status).toBe(200);expect(own.body).toEqual([]);
  });
});

describe('security review regressions', () => {
  it('cannot revoke another session with a fabricated refresh secret on logout',async () => {
    const local=createApplication();const login=await request(local).post('/api/auth/login').send({identifier:ids.admin,password:fixturePassword});const cookies=cookieStrings(login);
    const sid=valueOf(cookies,REFRESH_COOKIE).split('.')[0];
    expect((await request(local).post('/api/auth/logout').set('Cookie',[REFRESH_COOKIE+'='+sid+'.'+randomBytes(48).toString('base64url')])).status).toBe(200);
    expect((await request(local).get('/api/auth/me').set('Cookie',cookies)).status).toBe(200);
  });
  it('checks current DB role, not a role claim supplied in the signed payload',async () => {
    const old=jwt.decode(decodeURIComponent(valueOf(cookieJar.customer,ACCESS_COOKIE))) as any;
    const token=jwt.sign({sid:old.sid,role:'super_admin'},process.env.JWT_SECRET!,{subject:ids.customer,issuer:'shopnext',audience:'shopnext-web',algorithm:'HS256',expiresIn:900});
    expect((await request(app).get('/api/admin/settings').set('Cookie',[ACCESS_COOKIE+'='+token])).status).toBe(403);
  });
  it('rejects alternative JWT algorithms even when signed using the right secret',async () => {
    const old=jwt.decode(decodeURIComponent(valueOf(cookieJar.admin,ACCESS_COOKIE))) as any;
    const token=jwt.sign({sid:old.sid},process.env.JWT_SECRET!,{subject:ids.admin,issuer:'shopnext',audience:'shopnext-web',algorithm:'HS384',expiresIn:900});
    expect((await request(app).get('/api/admin/settings').set('Cookie',[ACCESS_COOKIE+'='+token])).status).toBe(401);
  });
  it('cannot renew past the absolute refresh-session expiry',async () => {
    const local=createApplication();const login=await request(local).post('/api/auth/login').send({identifier:ids.admin,password:fixturePassword});const cookies=cookieStrings(login);
    const id=valueOf(cookies,REFRESH_COOKIE).split('.')[0];
    mutateDatabase(db=>db.run('UPDATE auth_sessions SET expires_at = ? WHERE id = ?',[Date.now()-1,id]));
    expect((await request(local).get('/api/auth/me').set('Cookie',cookies)).status).toBe(401);
    expect((await request(local).post('/api/auth/refresh').set('Cookie',cookies)).status).toBe(401);
  });
  it('failed login persistence sets no cookies and inserts no phantom session',async () => {
    const local=createApplication();const count=()=>getDb().exec('SELECT COUNT(*) FROM auth_sessions')[0].values[0][0];const before=count();
    const spy=vi.spyOn(fs,'renameSync').mockImplementation(()=>{throw new Error('Synthetic failure');});let res:request.Response;
    try {res=await request(local).post('/api/auth/login').send({identifier:ids.admin,password:fixturePassword});} finally {spy.mockRestore();}
    expect(res!.status).toBe(500);expect(res!.headers['set-cookie']).toBeUndefined();expect(count()).toBe(before);
  });
  it('failed password persistence preserves hash and existing session',async () => {
    const local=createApplication();const before=usersRepo.findRawById(ids.customer).password_hash;
    const spy=vi.spyOn(fs,'renameSync').mockImplementation(()=>{throw new Error('Synthetic failure');});let res:request.Response;
    try {res=await request(local).post('/api/auth/change-password').set('Cookie',cookieJar.customer).send({oldPassword:fixturePassword,newPassword:randomBytes(32).toString('base64url')});} finally {spy.mockRestore();}
    expect(res!.status).toBe(500);expect(usersRepo.findRawById(ids.customer).password_hash).toBe(before);
    expect((await request(local).get('/api/auth/me').set('Cookie',cookieJar.customer)).status).toBe(200);
  });
  it('production enables CSP; browser writes with no Origin and oversized input are rejected',async () => {
    const prior=process.env.NODE_ENV;process.env.NODE_ENV='production';let local:ReturnType<typeof createApplication>;
    try {local=createApplication();} finally {process.env.NODE_ENV=prior;}
    const csp=(await request(local!).get('/health')).headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");expect(csp).toContain("img-src 'self' data: https:");
    expect((await request(app).post('/api/auth/logout').set('Sec-Fetch-Site','same-origin').set('Cookie',cookieJar.admin)).status).toBe(403);
    expect((await request(app).post('/api/auth/login').send({identifier:'x'.repeat(1100000),password:fixturePassword})).status).toBe(413);
    expect((await request(app).get('/health?unexpected=value')).status).toBe(400);
    expect((await request(app).get('/health').send({unexpected:'value'})).status).toBe(400);
  });
});


describe('admin authentication precedes JSON validation', () => {
  for (const [method,path] of adminRoutes) it(`${method} ${path}: malformed JSON cannot change 401/403 semantics`,async () => {
    const url='/api'+path.replace(':id',target.id);
    const anonymous=await (request(app) as any)[method.toLowerCase()](url).set('Content-Type','application/json').send('{');
    expect(anonymous.status).toBe(401);
    const forbidden=await (request(app) as any)[method.toLowerCase()](url).set('Cookie',cookieJar.customer).set('Content-Type','application/json').send('{');
    expect(forbidden.status).toBe(403);
  });
});
