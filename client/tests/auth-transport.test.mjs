import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authFetch } from '../src/lib/authFetch.ts';
const originalFetch=globalThis.fetch;
const originalDocument=globalThis.document;
afterEach(()=>{globalThis.fetch=originalFetch;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});

test('initializes CSRF and sends only the readable XSRF token with same-origin credentials', async()=>{
 globalThis.document={cookie:''};const calls=[];
 globalThis.fetch=async(url,init)=>{
  calls.push([url,init]);
  if(url==='/sanctum/csrf-cookie'){document.cookie='XSRF-TOKEN=encoded%3Dtoken';return new Response(null,{status:204});}
  return new Response('{}',{status:200});
 };
 assert.equal((await authFetch('/api/auth/login',{method:'POST',body:'{}'})).status,200);
 assert.deepEqual(calls.map(c=>c[0]),['/sanctum/csrf-cookie','/api/auth/login']);
 assert.equal(calls[1][1].credentials,'same-origin');
 assert.equal(calls[1][1].headers.get('X-XSRF-TOKEN'),'encoded=token');
 assert.equal(calls[1][1].headers.get('Accept'),'application/json');
 assert.equal(calls[1][1].headers.has('Authorization'),false);
});

test('401 does not call a refresh endpoint or fabricate authentication',async()=>{
 globalThis.document={cookie:''};const calls=[];
 globalThis.fetch=async(url)=>{calls.push(url);return new Response('{}',{status:401});};
 assert.equal((await authFetch('/api/auth/me')).status,401);
 assert.deepEqual(calls,['/api/auth/me']);
});

test('419 retries exactly once after CSRF renewal and uses the fresh token',async()=>{
 globalThis.document={cookie:'XSRF-TOKEN=old'};const tokens=[];let csrf=0;
 globalThis.fetch=async(url,init)=>{
  if(url==='/sanctum/csrf-cookie'){csrf++;document.cookie='XSRF-TOKEN=new';return new Response(null,{status:204});}
  tokens.push(init.headers.get('X-XSRF-TOKEN'));return new Response('{}',{status:419});
 };
 assert.equal((await authFetch('/api/auth/logout',{method:'POST'})).status,419);
 assert.equal(csrf,1);assert.deepEqual(tokens,['old','new']);
});

test('failed CSRF bootstrap sends no mutation and external URLs are rejected',async()=>{
 globalThis.document={cookie:''};const calls=[];
 globalThis.fetch=async(url)=>{calls.push(url);return new Response('{}',{status:503});};
 await assert.rejects(authFetch('/api/auth/login',{method:'POST'}),/CSRF/);
 await assert.rejects(authFetch('https://external.invalid/api',{method:'POST'}),/same-origin/);
 await assert.rejects(authFetch('//external.invalid/api'),/same-origin/);
 await assert.rejects(authFetch(String.raw`/\external.invalid/api`),/same-origin/);
 await assert.rejects(authFetch('/\t/external.invalid/api'),/same-origin/);
 assert.deepEqual(calls,['/sanctum/csrf-cookie']);
});
