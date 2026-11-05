const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/demo-data.js','utf8'),tag={demoBatch:'kicks-demo-v1'};
function run(initial,messages='[]'){
 const saved=new Map(initial?[['kicks-data-v2',JSON.stringify(initial)],['kicks-messages-v1',messages]]:[]),session=new Map([['kicks-session-v2','2']]);
 const context={localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},sessionStorage:{getItem:k=>session.get(k),removeItem:k=>session.delete(k)},console:{error(){}}};vm.createContext(context);vm.runInContext(source,context);return {saved,session,context};
}
const input={settings:{title:'Real settings'},users:[{id:1,name:'Real'},{id:2,...tag}],fields:[{id:3,name:'Real pitch',ownerId:1},{id:4,ownerId:2,...tag}],teams:[{id:5,captainId:1,members:[{userId:1},{userId:2}]},{id:6,captainId:2,members:[{userId:2}],...tag}],tournaments:[{id:7,createdBy:1,teams:1},{id:8,createdBy:2,...tag}],registrations:[{id:9,userId:2,teamId:6,tournamentId:7}],games:[{id:10,fieldId:3,joined:1}],memberships:[{id:11,gameId:10,userId:2}],bookings:[{id:12,userId:2,fieldId:3},{id:13,userId:1,fieldId:3}],payments:[{id:14,collection:'bookings',recordId:12},{id:15,collection:'bookings',recordId:13}],feedback:[{id:16,message:'keep'}],demoState:{installed:true}};
for(const messageData of [JSON.stringify([{senderId:1,recipientId:1},{senderId:2,recipientId:1}]),'invalid JSON']){
 const {saved,session,context}=run(input,messageData),after=JSON.parse(saved.get('kicks-data-v2'));
 assert.deepEqual(after,input);assert.equal(saved.get('kicks-data-v2'),JSON.stringify(input));
 assert.equal(saved.get('kicks-messages-v1'),messageData);assert.equal(session.get('kicks-session-v2'),'2');
 assert.equal(context.KicksDemo,undefined);const once=[...saved];vm.runInContext(source,context);assert.deepEqual([...saved],once);
}
assert.equal(run(null).saved.size,0);
console.log('PASS: automatic retirement disabled; all user/demo records, linked history, messages, settings and sessions preserved; invalid messages tolerated, idempotence and no seed API.');
