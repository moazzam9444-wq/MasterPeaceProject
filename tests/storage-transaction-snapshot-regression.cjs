const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const data=JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json','utf8'));
 data.catalogueVersion=1;delete data.catalogueRetiredVersion;
 const booking=data.bookings.find(b=>b.paymentStatus==='Paid (demo)') || data.bookings[0];
 booking.paymentStatus='Paid (demo)';
 data.payments=data.payments.filter(p=>p.collection!=='bookings'||p.recordId!==booking.id);
 let raw=JSON.stringify(data);
 const c={structuredClone,Event,window:{dispatchEvent(){}},localStorage:{getItem:()=>raw,setItem:(k,v)=>raw=v}};
 vm.createContext(require('./helpers/web-locks.cjs').install(c));
 for(const file of ['admin-account','data-store'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),c);
 assert.equal(await c.window.KicksStore.ready,null,'Both existing startup operations must commit within the same lock');
 const saved=JSON.parse(raw);
 assert.equal(saved.catalogueRetiredVersion,1);
 assert(saved.payments.some(p=>p.collection==='bookings'&&p.recordId===booking.id));
 assert.deepEqual(saved.bookings,data.bookings);
 console.log('PASS: successive existing startup writes retain their latest in-lock snapshot and preserve booking history.');
})().catch(error=>{console.error(error);process.exitCode=1;});
