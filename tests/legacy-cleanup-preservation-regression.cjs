/* Desired behavior for KICKS-012. Loading a compatibility script must not destroy data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const legacy={demoBatch:'kicks-demo-v1'},current={demoBatch:'kicks-full-preview-4'};
const dataset={
 settings:{title:'Existing settings',commissionRate:10},demoState:{installed:true,customMetadata:'keep'},
 users:[{id:1,name:'Existing player',role:'player',status:'Active'},{id:2,name:'Legacy owner',role:'owner',status:'Active',...legacy},{id:3,name:'Current sample owner',...current}],
 fields:[{id:10,ownerId:2,...legacy},{id:11,ownerId:3,...current}],
 bookings:[{id:20,userId:1,fieldId:10,status:'Confirmed',price:28,paymentStatus:'Paid (demo)'},{id:21,userId:1,fieldId:11,status:'Completed',...current}],
 payments:[{id:30,collection:'bookings',recordId:20,status:'Paid (demo)',amount:28},{id:31,collection:'bookings',recordId:21,...current}],
 teams:[{id:'retained-squad',captainId:1,members:[{userId:1},{userId:2}]}],teamRequests:[{id:'request',teamId:'retained-squad',userId:2,status:'pending'}],
 games:[{id:40,fieldId:10,createdBy:2,joined:1}],memberships:[{id:41,gameId:40,userId:1,status:'Joined'}],
 tournaments:[{id:50,fieldId:10,createdBy:2,teams:1}],registrations:[{id:51,tournamentId:50,userId:1,teamId:'retained-squad',roster:[{userId:1},{userId:2}],status:'Registered'}],
 meetings:[{id:60,tournamentId:50,organizerId:2,status:'Scheduled'}],challenges:[{id:70,teamId:'retained-squad',bookingId:20,status:'Booked'}],challengeRequests:[{id:71,challengeId:70,teamId:'retained-squad'}],feedback:[{id:80,message:'Keep my feedback'}],unknownExtension:{keep:['all','metadata']}
};
const raw=JSON.stringify(dataset,null,2),messages=JSON.stringify([{id:'message',senderId:2,recipientId:1,text:'Retain conversation',read:false}]);
function run(storage,session,blocked=false){const calls=[],logs=[];const trap=(kind,key)=>{calls.push({kind,key});if(blocked)throw Error('storage blocked');};const c={localStorage:{getItem:k=>{trap('get',k);return storage.get(k)??null},setItem:(k,v)=>{trap('set',k);storage.set(k,String(v))},removeItem:k=>{trap('remove',k);storage.delete(k)},clear(){trap('clear');storage.clear()}},sessionStorage:{getItem:k=>{trap('session get',k);return session.get(k)??null},setItem:(k,v)=>{trap('session set',k);session.set(k,v)},removeItem:k=>{trap('session remove',k);session.delete(k)},clear(){trap('session clear');session.clear()}},console:{error:(...a)=>logs.push(a),warn:(...a)=>logs.push(a)}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/demo-data.js','utf8'),c);return {calls,logs,c};}
for(const sessionId of ['1','2','3'])for(const messageData of [messages,'invalid message JSON']){
 const storage=new Map([['kicks-data-v2',raw],['kicks-messages-v1',messageData],['kicks-theme','dark'],['kicks-full-preview','legacy-version'],['unrelated-key','preserve']]),session=new Map([['kicks-session-v2',sessionId],['unrelated-session','preserve']]);const before=[...storage],beforeSession=[...session];
 run(storage,session);
 assert.deepEqual([...storage],before,'KICKS-012: preserve exact catalogue/message bytes, all linked records and unrelated keys');
 assert.deepEqual([...session],beforeSession,'Do not log out users linked to legacy records');
 run(storage,session);assert.deepEqual([...storage],before,'Repeated navigation must be idempotent');
}
for(const value of [null,'invalid catalogue JSON',JSON.stringify({settings:{title:'Partial legacy document'},demoState:{installed:true}})]){const storage=new Map(value===null?[]:[['kicks-data-v2',value]]),session=new Map();const before=[...storage];run(storage,session);assert.deepEqual([...storage],before,'Missing/malformed/partial data must not be repaired or replaced automatically');}
const blocked=run(new Map(),new Map(),true);assert.deepEqual(blocked.calls,[],'Disabled cleanup must not access blocked storage');assert.deepEqual(blocked.logs,[]);assert.equal(blocked.c.KicksDemo,undefined);
console.log('PASS: KICKS-012 exact-byte preservation of legacy/current demo and user records, linked history, rosters/counters, messages, settings and sessions; reloads, malformed/blocked storage and no seed API.');
