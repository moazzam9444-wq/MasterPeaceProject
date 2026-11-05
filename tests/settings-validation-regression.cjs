const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 let raw=fs.readFileSync('.local/data-audit/demo-fixture.json','utf8');
 const c={structuredClone,Event,window:{dispatchEvent(){}},localStorage:{getItem:()=>raw,setItem:(k,v)=>raw=v}};
 c.window.KicksAuth={current:()=>JSON.parse(raw).users.find(user=>user.role==='admin'&&user.status==='Active')};
 vm.createContext(require('./helpers/web-locks.cjs').install(c));
 for(const file of ['admin-account','data-store'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),c);
 const store=c.window.KicksStore;let rejected=0;
 for(const changes of [{commissionRate:-1},{commissionRate:101},{commissionRate:Infinity},{commissionRate:NaN},{commissionRate:'invalid'},{listingFee:-1},{listingFee:Infinity},{listingFee:'invalid'},null,[]]){
  const before=raw;await assert.rejects(store.updateSettings(changes),/valid|commission|fee/i);assert.equal(raw,before);rejected++;
 }
 await store.updateSettings({commissionRate:0,listingFee:0});assert.equal(store.settings().commissionRate,0);
 await store.updateSettings({commissionRate:100,listingFee:'7.5'});assert.equal(store.settings().commissionRate,100);assert.equal(store.settings().listingFee,7.5);
 await store.updateSettings({title:'Valid sample title'});assert.equal(store.settings().title,'Valid sample title');
 console.log('PASS: '+rejected+' invalid settings updates reject without writes; existing valid ranges and partial updates work.');
})().catch(error=>{console.error(error);process.exitCode=1});
