const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
(async()=>{
 let raw,actor;const ctx={structuredClone,Date,Intl,TextEncoder,crypto:webcrypto,Uint8Array,Event,window:{dispatchEvent(){},KicksAuth:{current:()=>actor}},localStorage:{getItem:()=>raw??null,setItem(k,v){raw=v;}}};
 vm.createContext(require('./helpers/web-locks.cjs').install(ctx));for(const n of ['bracket-core','demo-catalogue'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
 raw=JSON.stringify((await ctx.window.KicksDemoCatalogue.build()).data);for(const n of ['admin-account','data-store'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
 const s=ctx.window.KicksStore,as=id=>actor=id?s.find('users',id):null;
 const draft={name:'Platform tournament',fieldId:1001,date:'2100-02-01',time:'14:00',durationMinutes:180,fee:20,teams:0,capacity:4,createdBy:101};
 for(const id of [null,101,200]){as(id);const before=raw;await assert.rejects(s.save('tournaments',draft),/administrator|Sign in/);assert.equal(raw,before);}
 as(100);const cup=await s.save('tournaments',draft);assert.equal(cup.createdBy,100);assert(s.tournamentAccess(cup.id).manage);
 as(101);assert(!s.tournamentAccess(cup.id).manage);await assert.rejects(s.save('tournaments',{...cup,name:'Owner changed'}),/permission|creator/);
 const past=s.list('payments');as(200);const entry=await s.join(200,'tournaments',cup.id,{teamId:'sample-team-1',payment:{method:'Visa demo',amount:20}});
 const receipt=s.list('payments').find(p=>p.collection==='registrations'&&p.recordId===entry.id);assert.equal(receipt.adminId,100);assert.equal(receipt.amount,20);assert.equal(receipt.commission,20);assert.equal(receipt.rate,100);assert.equal(receipt.ownerNet,0);assert.equal(entry.ownerNet,0);assert.deepEqual(s.list('payments').slice(0,past.length),past);
 as(100);await s.save('registrations',{...entry,status:'Withdrawn'});assert.equal(s.list('payments').find(p=>p.id===receipt.id).status,'Refunded (demo)');
 as(200);const booking=await s.book(200,1001,'2100-02-03','18:00',{method:'Visa demo',amount:28});assert.equal(booking.commission,2.8);assert.equal(booking.ownerNet,25.2);
 console.log('PASS: admin-only creation, spoof prevention, owner UI policy, 100% tournament fees to platform, unchanged history, refunds, and unchanged field-booking revenue.');
})().catch(e=>{console.error(e);process.exitCode=1;});
