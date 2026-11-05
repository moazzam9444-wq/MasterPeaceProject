/* Explicit authorized VM fixture setup. Never imported by application scripts. */
function admin(context){const host=context.window||context;host.KicksAuth={...(host.KicksAuth||{}),current:()=>{const raw=context.localStorage.getItem('kicks-data-v2');const users=raw?JSON.parse(raw).users:[host.KicksAdminAccount];return users.find(u=>u?.role==='admin'&&u.status==='Active')||null;}};return context;}
async function asAdmin(context,action){const host=context.window||context,previous=host.KicksAuth;admin(context);try{return await action()}finally{host.KicksAuth=previous;}}
exports.admin=admin;exports.asAdmin=asAdmin;exports.save=(context,...args)=>asAdmin(context,()=> (context.window||context).KicksStore.save(...args));
