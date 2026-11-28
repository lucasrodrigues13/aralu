const fs=require('fs');
const sql=fs.readFileSync(process.argv[2],'utf8');
const T={}; // name -> {cols:[{n,t,nn}], pk:[], fks:[{col,ref,on}], uniq:[]}
const stmts=sql.split(/;\s*\n/);
for(let s of stmts){ s=s.replace(/^[\s\S]*?\bTHEN\s*/,'').trim();
 let m;
 if(m=s.match(/^CREATE TABLE "([^"]+)" \(([\s\S]*)\)$/)){
  const t={cols:[],pk:[],fks:[],uniq:[]}; T[m[1]]=t;
  const parts=m[2].split(/,\s*\n/).map(x=>x.trim());
  for(const p of parts){ let c;
   if(c=p.match(/^CONSTRAINT "[^"]+" PRIMARY KEY \(([^)]+)\)/)) t.pk=c[1].replace(/"/g,'').split(/,\s*/);
   else if(c=p.match(/^CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"[^)]*\)(.*)/)) t.fks.push({name:c[1],col:c[2].replace(/"/g,''),ref:c[3],on:(c[4].match(/ON DELETE (\w+( \w+)?)/)||[])[1]||'NO ACTION'});
   else if(c=p.match(/^"([^"]+)" (.+)$/)) t.cols.push({n:c[1],t:c[2].replace(/ NOT NULL| GENERATED.*| DEFAULT.*/g,'').trim(),nn:/NOT NULL/.test(c[2])});
  }
 } else if(m=s.match(/^ALTER TABLE "([^"]+)" ADD "([^"]+)" (.+)$/)){ T[m[1]]?.cols.push({n:m[2],t:m[3].replace(/ NOT NULL| DEFAULT.*/g,'').trim(),nn:/NOT NULL/.test(m[3])}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" DROP COLUMN "([^"]+)"/)){ const t=T[m[1]]; if(t){t.cols=t.cols.filter(c=>c.n!==m[2]); t.fks=t.fks.filter(f=>f.col!==m[2]);} }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" RENAME COLUMN "([^"]+)" TO "([^"]+)"/)){ const t=T[m[1]]; t?.cols.forEach(c=>{if(c.n===m[2])c.n=m[3]}); t?.fks.forEach(f=>{if(f.col===m[2])f.col=m[3]}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" ALTER COLUMN "([^"]+)" DROP NOT NULL/)){ T[m[1]]?.cols.forEach(c=>{if(c.n===m[2])c.nn=false}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" ALTER COLUMN "([^"]+)" SET NOT NULL/)){ T[m[1]]?.cols.forEach(c=>{if(c.n===m[2])c.nn=true}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" ALTER COLUMN "([^"]+)" TYPE (.+)$/)){ T[m[1]]?.cols.forEach(c=>{if(c.n===m[2])c.t=m[3]}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"[^)]*\)(.*)$/)){ T[m[1]]?.fks.push({name:m[2],col:m[3].replace(/"/g,''),ref:m[4],on:(m[5].match(/ON DELETE (\w+( \w+)?)/)||[])[1]||'NO ACTION'}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" PRIMARY KEY \(([^)]+)\)/)){ if(T[m[1]]) T[m[1]].pk=m[3].replace(/"/g,'').split(/,\s*/); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" DROP CONSTRAINT "([^"]+)"/)){ const t=T[m[1]]; if(t){ t.fks=t.fks.filter(f=>f.name!==m[2]); if(m[2].startsWith('PK_')) t.pk=[];} }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" RENAME CONSTRAINT "([^"]+)" TO "([^"]+)"/)){ T[m[1]]?.fks.forEach(f=>{if(f.name===m[2])f.name=m[3]}); }
 else if(m=s.match(/^ALTER TABLE "([^"]+)" RENAME TO "([^"]+)"/)){ T[m[2]]=T[m[1]]; delete T[m[1]]; for(const t of Object.values(T)) t.fks.forEach(f=>{if(f.ref===m[1])f.ref=m[2]}); }
 else if(m=s.match(/^DROP TABLE "([^"]+)"/)){ delete T[m[1]]; }
 else if(m=s.match(/^CREATE UNIQUE INDEX "[^"]+" ON "([^"]+)" \(([^)]+)\)/)){ T[m[1]]?.uniq.push(m[2].replace(/"/g,'')); }
}
delete T.__EFMigrationsHistory;
fs.writeFileSync('schema.json',JSON.stringify(T,null,1));
const names=Object.keys(T).sort();
console.log(names.length,'tables');
for(const n of names){const t=T[n]; console.log(n, t.cols.length+'c', 'pk='+t.pk.join('+'), t.fks.map(f=>f.col+'->'+f.ref+(f.on!=='CASCADE'?'('+f.on+')':'')).join(' '), t.cols.some(c=>c.n==='ContaId')?'[ContaId]':'');}
