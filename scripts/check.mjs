import {readFile,access,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const files=await readdir(dist);
for(const file of files.filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',path.join(dist,file)],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);}
const html=await readFile(path.join(dist,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))await access(path.join(dist,m[1]));
for(const name of ['three.module.js','three.core.js','OrbitControls.js','LICENSE'])await access(path.join(dist,'vendor',name));
for(const name of files.filter(f=>f.endsWith('.js'))){const src=await readFile(path.join(dist,name),'utf8');for(const m of src.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g))await access(path.join(dist,m[1]));}
console.log('PASS: JavaScript syntax, local entrypoints, imports and vendored Three.js.');
