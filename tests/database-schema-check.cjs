const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../docs/database/database-data.js'),G=require('../docs/database/database.js');
const metrics=G.validate(),sql=G.sql(),same=(a,b)=>a.length===b.length&&a.every(n=>b.includes(n));
assert.deepEqual(fs.readdirSync(path.join(__dirname,'../docs/database')).sort(),['database-data.js','database.css','database.html','database.js']);
for(const r of D.relationships){const target=D.tables.find(t=>t.name===r.toTable),keys=[target.columns.filter(c=>c.pk).map(c=>c.name),...target.columns.filter(c=>c.uq).map(c=>[c.name]),...(target.unique||[])];assert(keys.some(k=>same(k,r.toColumns||[r.toColumn])),'FK target must be unique: '+r.toTable);}
const html=fs.readFileSync(path.join(__dirname,'../docs/database/database.html'),'utf8');assert(!/<style\b|\sstyle\s*=|\son\w+\s*=/i.test(html));assert(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html));
assert.equal((sql.match(/CREATE TABLE /g)||[]).length,metrics.tables);assert.equal((sql.match(/ FOREIGN KEY /g)||[]).length,metrics.relationships);assert(!/\bDROP\s+(TABLE|DATABASE)/i.test(sql));assert(!/\[user_id\].*IDENTITY/.test(sql));assert(!/\[id\] int IDENTITY[^\n]+DEFAULT/.test(sql));
assert(!D.tables.some(t=>t.name==='meetings'),'Retired meetings must not appear in the active design');
for(const name of ['booking_shares','booking_teams','messages','tournament_registrations'])assert(D.tables.some(t=>t.name===name));
assert.equal(D.relationships.find(r=>r.fromTable==='payments'&&r.column==='share_id').fromCardinality,'zeroOne');
assert.equal(D.relationships.find(r=>r.fromTable==='bookings'&&r.column==='challenge_id').fromCardinality,'zeroOne');
assert.equal(D.relationships.find(r=>r.fromTable==='booking_shares'&&r.fromColumns).fromCardinality,'zeroOne');
assert(D.tables.find(t=>t.name==='payments').checks.some(c=>c.includes('[commission_rate] = 100')));
assert(D.rules.some(r=>r.title.includes('Only admins')));
const order=G.orderedTables().map(t=>t.name);for(const r of D.relationships)assert(r.fromTable===r.toTable||order.indexOf(r.toTable)<order.indexOf(r.fromTable));
assert.equal(fs.readFileSync(path.join(__dirname,'../database/KICKS-schema.sql'),'utf8'),sql+'\n','Regenerate the SQL export after a schema change: node scripts/export-database.cjs');
console.log('PASS: four-file documentation, complete LAYOUT, all foreign keys/unique targets, SQL dependency ordering, identity scope and no inline JS/CSS.',metrics);
