const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
(async()=>{
 let saved,actor,blocked=false;
 const ctx={structuredClone,Event,TextEncoder,crypto:webcrypto,Date,Intl,Uint8Array,console,window:{dispatchEvent(){},KicksAuth:{current:()=>actor}},localStorage:{getItem:()=>saved??null,setItem(k,v){if(blocked)throw Error('quota');saved=v;}}};
 vm.createContext(require('./helpers/web-locks.cjs').install(ctx));
 for(const n of ['bracket-core','demo-catalogue'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
 const fixture=(await ctx.window.KicksDemoCatalogue.build()).data;fixture.fields[0].price=28.01;saved=JSON.stringify(fixture);
 for(const n of ['admin-account','data-store'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
 const s=ctx.window.KicksStore,as=id=>actor=s.find('users',id),snap=()=>saved;
 const post=async(date='2100-01-01')=>{as(200);return s.challengeAction('create',{teamId:'sample-team-1',date,time:'18:00',city:'Amman',split:'Half each',fieldId:1001,price:28.01});};
 const agree=async c=>{as(206);await s.challengeAction('request',{id:c.id,teamId:'sample-team-2'});const r=s.list('challengeRequests').find(r=>r.challengeId===c.id&&r.status==='Pending');as(200);return s.challengeAction('accept',{id:c.id,requestId:r.id});};
 const pay=amount=>({method:'Visa demo',amount});
 as(200);await assert.rejects(s.challengeAction('create',{teamId:'sample-team-1',date:'2100-01-01',time:'18:00',city:'Amman',split:'Half each'}),/pitch matching/);
 await assert.rejects(s.challengeAction('create',{teamId:'sample-team-1',date:'2100-01-01',time:'18:00',city:'Amman',split:'Half each',fieldId:1001,price:20}),/price changed/);
 let c=await post();assert.equal(c.price,28.01);assert.equal(c.fieldId,1001);assert(s.isFieldSlotAvailable(1001,c.date,c.time));
 await agree(c);c=s.list('challenges').find(x=>x.id===c.id);let b=s.find('bookings',c.bookingId);
 assert.equal(b.status,'Pending');assert.equal(s.challengeStatus(c),'Awaiting payment');assert.equal(s.isFieldSlotAvailable(1001,c.date,c.time),false);assert.deepEqual(Array.from(b.shares,s=>s.amount),[14.01,14]);
 as(262);await assert.rejects(s.payChallengeShare(c.id,pay(14.01)),/captain/);
 as(200);await assert.rejects(s.payChallengeShare(c.id,pay(28.01)),/exactly/);await assert.rejects(s.payChallengeShare(c.id,{method:'cash',amount:14.01}),/exactly/);
 const before=snap();blocked=true;await assert.rejects(s.payChallengeShare(c.id,pay(14.01)),/storage/);blocked=false;assert.equal(snap(),before);
 b=await s.payChallengeShare(c.id,pay(14.01));assert.equal(b.status,'Pending');assert.equal(s.list('payments').filter(p=>p.recordId===b.id&&p.collection==='bookings'&&p.status==='Held (demo)').length,1);
 await assert.rejects(s.payChallengeShare(c.id,pay(14.01)),/already/);
 as(100);await assert.rejects(s.save('bookings',{...b,status:'Confirmed'}),/Split bookings/);await assert.rejects(s.save('bookings',{...b,price:1}),/Split bookings/);
 as(206);b=await s.payChallengeShare(c.id,pay(14));assert.equal(b.status,'Confirmed');assert.equal(s.challengeStatus(s.list('challenges').find(x=>x.id===c.id)),'Booked');
 const receipts=s.list('payments').filter(p=>p.collection==='bookings'&&p.recordId===b.id);assert.equal(receipts.length,2);assert(receipts.every(p=>p.status==='Paid (demo)'));assert.equal(Math.round(receipts.reduce((sum,p)=>sum+p.amount,0)*100),2801);assert.equal(Math.round(receipts.reduce((sum,p)=>sum+p.commission,0)*100),280);
 await assert.rejects(s.challengeAction('cancel',{id:c.id}),/unbooked/);await assert.rejects(s.payChallengeShare(c.id,pay(14)),/not awaiting/);
 as(100);await s.save('bookings',{...b,status:'Cancelled'});assert(s.list('payments').filter(p=>p.collection==='bookings'&&p.recordId===b.id).every(p=>p.status==='Refunded (demo)'));assert(s.isFieldSlotAvailable(1001,c.date,c.time));
 c=await post('2100-01-02');await agree(c);as(206);await s.payChallengeShare(c.id,pay(14));as(200);await s.challengeAction('cancel',{id:c.id});b=s.list('bookings').find(b=>b.challengeId===c.id);assert.equal(b.status,'Cancelled');assert(s.list('payments').filter(p=>p.collection==='bookings'&&p.recordId===b.id).every(p=>p.status==='Refunded (demo)'));
 c=await post('2100-01-03');await agree(c);as(200);b=await s.payChallengeShare(c.id,pay(14.01));let raw=JSON.parse(saved);raw.bookings.find(x=>x.id===b.id).paymentDeadline='2000-01-01T00:00:00Z';saved=JSON.stringify(raw);
 assert(s.isFieldSlotAvailable(1001,c.date,c.time));assert.equal(s.find('bookings',b.id).status,'Cancelled');assert.equal(s.challengeStatus(s.list('challenges').find(x=>x.id===c.id)),'Expired');assert(s.list('payments').filter(p=>p.collection==='bookings'&&p.recordId===b.id).every(p=>p.status==='Refunded (demo)'));as(206);await assert.rejects(s.payChallengeShare(c.id,pay(14)),/expired/);
 c=await post('2100-01-04');as(101);const field=s.find('fields',1001);await s.save('fields',{...field,price:30});as(206);const unchanged=snap();await assert.rejects(s.challengeAction('request',{id:c.id,teamId:'sample-team-2'}),/price changed/);assert.equal(snap(),unchanged);
 // Recheck a selected slot when accepting; a proposal is never a reservation.
 as(101);await s.save('fields',{...s.find('fields',1001),price:28.01});
 c=await post('2100-01-05');as(206);await s.challengeAction('request',{id:c.id,teamId:'sample-team-2'});let req=s.list('challengeRequests').find(r=>r.challengeId===c.id);as(262);await s.book(262,1001,c.date,c.time,pay(28.01));as(200);const booked=snap();await assert.rejects(s.challengeAction('accept',{id:c.id,requestId:req.id}),/no longer available/);assert.equal(snap(),booked);
 // A frozen accepted quote survives a later price change; duplicate payment is atomic.
 c=await post('2100-01-06');await agree(c);as(200);const attempts=await Promise.allSettled([s.payChallengeShare(c.id,pay(14.01)),s.payChallengeShare(c.id,pay(14.01))]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 as(101);await s.save('fields',{...s.find('fields',1001),price:40});as(206);b=await s.payChallengeShare(c.id,pay(14));assert.equal(b.price,28.01);assert.equal(b.status,'Confirmed');
 // Free pitches confirm without fake charges or a dead-end zero-value checkout.
 as(101);await s.save('fields',{...s.find('fields',1001),price:0});as(200);c=await s.challengeAction('create',{teamId:'sample-team-1',fieldId:1001,price:0,date:'2100-01-07',time:'18:00',city:'Amman',split:'Half each'});await agree(c);b=s.list('bookings').find(b=>b.challengeId===c.id);assert.equal(b.status,'Confirmed');assert.equal(b.paymentStatus,'Free');assert(!s.list('payments').some(p=>p.collection==='bookings'&&p.recordId===b.id));
 console.log('PASS: upfront terms, stale quotes, slot recheck, frozen accepted prices, captain identity, exact halves/odd cents, rollback, duplicate races, two receipts, commission, cancellation/refunds, expiry, zero-price and legacy compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1;});
