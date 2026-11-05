/* Optional export only. The documentation itself has no build step. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const schema=require(path.join(root,'docs/database/database.js'));
const target=path.join(root,'database','KICKS-schema.sql');
schema.validate();
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,schema.sql()+'\n','utf8');
console.log('Exported database/KICKS-schema.sql',schema.validate());
