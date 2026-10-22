import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
test('HTML has no external font/script/style resources',()=>{
 const html=readFileSync(resolve(root,'index.html'),'utf8');
 assert.doesNotMatch(html,/<(?:script|link)\b[^>]+(?:src|href)=["']https?:/i);
});
test('vendored fonts match provenance hashes and local CSS targets exist',()=>{
 const p=JSON.parse(readFileSync(resolve(root,'assets/font-provenance.json')));
 for(const f of p.files) assert.equal(createHash('sha256').update(readFileSync(resolve(root,'public/fonts',f.file))).digest('hex'),f.sha256);
 for(const name of ['vazirmatn.css','material-symbols.css']) {
  const css=readFileSync(resolve(root,'public/fonts',name),'utf8');
  for(const m of css.matchAll(/url\(['"]?([^)'" ]+)/g)) {assert.ok(m[1].startsWith('/fonts/'));assert.ok(existsSync(resolve(root,'public'+m[1])));}
 }
});
test('active source has no imported remote CDN image literals',()=>{
 function walk(dir){for(const f of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,f.name);if(f.isDirectory())walk(p);else assert.doesNotMatch(readFileSync(p,'utf8'),/https?:\/\/(?:lh3\.googleusercontent\.com|images\.unsplash\.com|via\.placeholder\.com|placehold\.co|picsum\.photos|images\.pexels\.com)/,p);}}
 walk(resolve(root,'src'));assert.ok(existsSync(resolve(root,'public/images/catalog-placeholder.svg')));
});
