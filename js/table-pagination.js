// Presentation-only table paging. Full records remain in the DOM and store.
(() => {
 'use strict';
 const size=8,states=new WeakMap(),pages=new Map();let serial=0,scheduled=false;
 const dataRows=table=>Array.from(table.tBodies).flatMap(body=>Array.from(body.rows)).filter(row=>!(row.cells.length===1&&row.cells[0].colSpan>1));
 const keyFor=(table,index)=>[location.pathname,location.hash,window.KicksAuth?.current()?.id||'guest',table.id||table.getAttribute('aria-label')||table.caption?.textContent||index].join('|');
 function paint(state){
  const {table,rows,nav}=state,q=state.query.trim().toLowerCase();
  const matches=rows.filter(row=>(row.dataset.search||row.textContent).toLowerCase().includes(q));
  const count=matches.length,totalPages=Math.max(1,Math.ceil(count/size));state.page=Math.max(1,Math.min(state.page,totalPages));pages.set(state.key,state.page);
  const start=(state.page-1)*size,visible=new Set(matches.slice(start,start+size));rows.forEach(row=>row.hidden=!visible.has(row));
  nav.hidden=rows.length<=size;
  const wanted=new Set([1,totalPages,state.page-1,state.page,state.page+1]);
  if(state.page<=3){wanted.add(2);wanted.add(3);wanted.add(4);}if(state.page>=totalPages-2){wanted.add(totalPages-1);wanted.add(totalPages-2);wanted.add(totalPages-3);}
  const numbers=[...wanted].filter(p=>p>=1&&p<=totalPages).sort((a,b)=>a-b);let last=0,buttons='';
  const button=(page,label,extra='')=>`<button type="button" data-page="${page}" ${extra}>${label}</button>`;
  for(const page of numbers){if(last&&page-last>1)buttons+='<span class="table-page-gap" aria-hidden="true">…</span>';buttons+=button(page,String(page),`aria-label="Page ${page}" ${page===state.page?'aria-current="page"':''}`);last=page;}
  nav.innerHTML=`<span class="table-page-summary" id="${state.summaryId}" role="status" aria-live="polite">${count?'Showing '+(start+1)+'–'+Math.min(start+size,count):'Showing 0'} of ${count} records${q?' · '+rows.length+' total':''}</span><div class="table-page-buttons" ${totalPages<=1?'hidden':''}>${button(state.page-1,'Previous',`aria-label="Previous page" ${state.page===1?'disabled':''}`)}${buttons}${button(state.page+1,'Next',`aria-label="Next page" ${state.page===totalPages?'disabled':''}`)}</div>`;
  state.matches=count;state.totalPages=totalPages;
  table.dispatchEvent(new CustomEvent('kicks-table-page',{bubbles:true,detail:{page:state.page,pages:totalPages,matched:count,total:rows.length}}));
  return count;
 }
 function attach(table,index){
  if(index===undefined)index=Array.from(document.querySelectorAll('table')).indexOf(table);
  if(table.closest('[data-no-pagination]')||table.hasAttribute('data-no-pagination'))return null;
  const rows=dataRows(table),key=keyFor(table,index),old=states.get(table);
  if(old&&old.key===key&&old.rows.length===rows.length&&old.rows.every((r,i)=>r===rows[i]))return old;
  const nav=old?.nav||document.createElement('nav');nav.className='kicks-table-pagination';nav.setAttribute('aria-label',(table.getAttribute('aria-label')||table.caption?.textContent||'Table')+' pages');
  const state={table,rows,nav,key,page:old?.page||pages.get(key)||1,query:old?.query||'',summaryId:old?.summaryId||'table-page-summary-'+(++serial)};states.set(table,state);
  const wrapper=table.closest('.table-wrap,.table-responsive');(wrapper||table).after(nav);
  nav.onclick=ev=>{const button=ev.target.closest('button[data-page]');if(!button||button.disabled)return;state.page=Number(button.dataset.page);paint(state);nav.querySelector('[aria-current="page"]')?.focus({preventScroll:true});};
  paint(state);return state;
 }
 function refresh(root=document){root.querySelectorAll('table').forEach((t,i)=>attach(t,i));}
 function filter(table,query){const state=attach(table);if(!state)return 0;const next=String(query||'');if(state.query!==next)state.page=1;state.query=next;return paint(state);}
 window.KicksTablePagination={refresh,filter,pageSize:size};
 function start(){refresh();new MutationObserver(records=>{
  if(records.every(r=>r.target.nodeType===1&&r.target.closest('.kicks-table-pagination')))return;
  if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;refresh();});
 }).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
