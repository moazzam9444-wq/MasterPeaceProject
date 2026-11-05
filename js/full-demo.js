/* Existing demo origin and KicksStore keys; explicit, non-destructive initialization only. */
(() => {
 'use strict';
 if(location.hostname!=='127.0.0.1'||!['5501','5502'].includes(location.port))return;
 const root=new URL('../',document.currentScript.src),keys=['kicks-data-v2','kicks-messages-v1','kicks-full-preview'];
 let loading,busy=false;
 const read=()=>keys.map(k=>localStorage.getItem(k));
 function restore(before){for(let i=0;i<keys.length;i++)if(before[i]===null)localStorage.removeItem(keys[i]);else localStorage.setItem(keys[i],before[i]);}
 async function load(){
  if(!loading)loading=(async()=>{for(const path of ['js/bracket-core.js','js/demo-catalogue.js'])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(path,root);s.onload=resolve;s.onerror=()=>reject(Error('The local demo fixture could not load.'));document.head.append(s);});return window.KicksDemoCatalogue;})();
  try{return await loading;}catch(e){loading=null;throw e;}
 }
 function metadata(raw){try{const m=JSON.parse(raw);return m&&typeof m==='object'?m:null;}catch{return null;}}
 async function locked(task){if(busy)throw Error('Demo initialization is already running.');busy=true;try{if(typeof navigator.locks?.request!=='function')throw Error('Safe storage coordination is unavailable. Use Web Locks over HTTPS or localhost. No changes were saved.');return await navigator.locks.request('kicks-storage-v2',{mode:'exclusive'},task);}finally{busy=false;}}
 async function commit(reset=false){return locked(async()=>{
  const before=read(),meta=metadata(before[2]),catalogue=await load();
  if(!reset&&meta?.version===catalogue.batch&&before[0])return {installed:false,alreadyInstalled:true,validation:catalogue.validate(JSON.parse(before[0]),JSON.parse(before[1]||'[]'))};
  if(reset){if(!meta||meta.version!==catalogue.batch||before[0]!==meta.data||before[1]!==meta.messages)throw Error('Reset refused: this sandbox has changed or contains unowned data. Export it and use a fresh isolated browser profile; no records were removed.');}
  else if(before[0]!==null||(before[1]!==null&&before[1]!=='[]')||before[2]!==null)throw Error('Initialization refused: this origin already contains data or a legacy demo. Nothing was overwritten. Use a fresh isolated browser profile for sample data.');
  const fixture=await catalogue.build(),validation=catalogue.validate(fixture.data,fixture.messages);
  if(!validation.valid)throw Error('Demo integrity check failed: '+JSON.stringify(validation.errors));
  if(JSON.stringify(read())!==JSON.stringify(before))throw Error('Data changed during initialization. Nothing was overwritten.');
  const data=JSON.stringify(fixture.data),messages=JSON.stringify(fixture.messages),marker=JSON.stringify({version:catalogue.batch,createdAt:fixture.createdAt,data,messages});
  try{localStorage.setItem(keys[0],data);localStorage.setItem(keys[1],messages);localStorage.setItem(keys[2],marker);}
  catch(error){try{restore(before);}catch{throw Error('Demo storage failed and rollback was incomplete. Stop editing this sandbox and export it for recovery.');}throw Error('Demo storage failed; previous values restored. '+error.message);}
  // Identity is never auto-selected; the existing login flow verifies demo credentials.
  if(reset)sessionStorage.removeItem('kicks-session-v2');
  dispatchEvent(new Event('kicks-data-change'));
  return {installed:true,validation};
 });}
 const api={initialize:()=>commit(false),reset:()=>commit(true),async validate(){const c=await load();const raw=localStorage.getItem(keys[0]);if(!raw)return {valid:false,errors:[{code:'NOT_INITIALIZED',detail:'Initialize an empty demo sandbox first.'}]};return c.validate(JSON.parse(raw),JSON.parse(localStorage.getItem(keys[1])||'[]'));},export(){return JSON.stringify({data:JSON.parse(localStorage.getItem(keys[0])||'null'),messages:JSON.parse(localStorage.getItem(keys[1])||'[]'),demo:metadata(localStorage.getItem(keys[2]))},null,2);}};
 window.KicksDemo=api;
 document.addEventListener('DOMContentLoaded',()=>{
  const banner=document.createElement('aside');banner.setAttribute('aria-label','Fictional sample data environment');banner.className='account-notice';banner.style.cssText='position:relative;inset:auto;width:100%;max-width:none;z-index:1;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 16px;margin:0;padding:8px 18px;background:#07111f;color:#f4f7f2;border-bottom:1px solid #b6ff4840;border-radius:0;font:10px/1.7 Manrope,Arial,sans-serif;direction:ltr';
  banner.innerHTML='<strong>ISOLATED SAMPLE ENVIRONMENT</strong><span>Fictional people, bookings and simulated payments.</span><a style="color:#b6ff48" href="'+new URL('Pages/Demo/catalogue.html',root)+'">Demo setup and accounts ?</a>';const header=document.querySelector('.premium-nav');if(header)header.after(banner);else document.body.prepend(banner);
  if(!location.pathname.endsWith('/Pages/Demo/catalogue.html'))return;
  const panel=document.createElement('section');panel.className='management';panel.dir='ltr';panel.setAttribute('aria-labelledby','demoSetupTitle');
  panel.innerHTML='<h2 id="demoSetupTitle">Safe sample-data setup</h2><p>Uses this isolated origin only. Initialization never replaces an existing store. Reset is allowed only while the installed fixture is unchanged.</p><div class="actions"><button type="button" data-demo="initialize">Initialize empty demo</button><button type="button" data-demo="validate">Validate data</button><button type="button" data-demo="reset">Reset unchanged sample data</button><button type="button" data-demo="export">Export sandbox</button></div><p id="demoSetupStatus" role="status" aria-live="polite"></p><p>All sample account passwords: <code>KicksDemo2026!</code>. Sign in through the existing Login page. Pending accounts require the normal administrator approval.</p><label for="demoAccount">Sample account email</label><select id="demoAccount" aria-label="Sample account email"><option value="">Initialize to list sample accounts</option></select> <a id="demoLogin" href="'+new URL('Pages/Auth/login.html',root)+'">Open Login ↗</a>';
  document.querySelector('main').prepend(panel);
  const status=panel.querySelector('#demoSetupStatus'),select=panel.querySelector('select');
  function accounts(){select.replaceChildren(new Option('Choose a fictional sample account',''));try{const d=JSON.parse(localStorage.getItem(keys[0])||'null');for(const u of d?.users||[])if(u.demoBatch==='kicks-full-preview-4')select.add(new Option(u.email+' · '+u.role+' · '+u.status,u.email));}catch{status.textContent='Stored data is unreadable. Nothing will be overwritten.';}}
  select.addEventListener('change',()=>{status.textContent=select.value?'Use '+select.value+' with the sample password on the existing Login page.':'';});
  panel.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',async()=>{const action=button.dataset.demo;if(action==='export'){const blob=new Blob([api.export()],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kicks-sample-sandbox.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;}for(const b of panel.querySelectorAll('button'))b.disabled=true;try{const result=await api[action]();status.textContent=action==='validate'?(result.valid?'Integrity checks passed. '+JSON.stringify(result.counts):'Integrity errors: '+JSON.stringify(result.errors)):(result.alreadyInstalled?'Already initialized; existing records were left unchanged.':'Fictional sample data initialized. '+JSON.stringify(result.validation.counts));accounts();}catch(e){status.textContent=e.message;}finally{for(const b of panel.querySelectorAll('button'))b.disabled=false;}}));accounts();
 });
})();
