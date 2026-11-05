// Near me changes the existing catalogue cards; no separate results modal.
(() => {
  const configs=[{kind:'fields',search:'#searchForm',toolbar:'.results-toolbar',sort:'#sortFields'}, {kind:'games',search:'#gameSearchForm',toolbar:'.results-toolbar',sort:'#gameSort'}, {kind:'tournaments',search:'#cupFilters',toolbar:'.results-toolbar',sort:'#cupSort'}];
  const config=configs.find(c=>document.querySelector(c.search));if(!config)return;
  // Details pages contain hidden catalogue markup. Only mount on listing routes.
  if(/(?:field|game|tournament)-details\.html$/.test(location.pathname))return;
  let position=null,pending=false,currentRanks=null;
  const bar=document.createElement('div');bar.className='catalogue-nearby';bar.innerHTML='<button type="button" class="catalogue-nearby-button" aria-pressed="false"><span aria-hidden="true">◎</span> Near me <small>15 km</small></button><p role="status" aria-live="polite"></p>';
  const toolbar=document.querySelector(config.toolbar);
  if(!toolbar)return;
  toolbar.classList.add('has-nearby');
  const sortControl=toolbar.querySelector('.sort-control');
  if(sortControl)sortControl.insertAdjacentElement('beforebegin',bar);else toolbar.append(bar);
  const button=bar.querySelector('button'),status=bar.querySelector('p');
  function changed(){button.setAttribute('aria-pressed',String(!!position));button.innerHTML='<span aria-hidden="true">◎</span> '+(position?'Show all':'Near me')+' <small>'+(position?'×':'15 km')+'</small>';const sort=document.querySelector(config.sort);if(sort)sort.disabled=!!position;window.dispatchEvent(new Event('kicks-nearby-change'));}
  function clear(notify=true){position=null;currentRanks=null;status.textContent='';if(notify)changed();else{button.setAttribute('aria-pressed','false');button.innerHTML='<span aria-hidden="true">◎</span> Near me <small>15 km</small>';const sort=document.querySelector(config.sort);if(sort)sort.disabled=false;}}
  function ranked(){return currentRanks || [];}
  function apply(kind,rows){if(!position||kind!==config.kind)return rows;currentRanks=KicksDiscovery.search({kind:config.kind},position).results;const matches=ranked(),order=new Map(matches.map((m,i)=>[m.id,i]));const result=rows.filter(r=>order.has(r.id)).sort((a,b)=>order.get(a.id)-order.get(b.id));status.textContent=result.length+' nearby · within 15 km · closest first. Area/city distances are approximate.';return result;}
  function badge(kind,id){if(!position||kind!==config.kind)return '';const row=ranked().find(r=>r.id===id);return row?'<span class="catalogue-distance">◎ '+(row.precision==='exact'?'':'~ ')+row.distance.toFixed(1)+' km'+(row.precision==='exact'?'':' · '+(row.precision==='area'?'area estimate':'city estimate'))+'</span>':'';}
  button.onclick=()=>{if(pending)return;if(position){clear();return;}if(!navigator.geolocation){status.textContent='Location is unavailable. Search by city instead.';return;}pending=true;button.disabled=true;status.textContent='Allow location access to find nearby results…';navigator.geolocation.getCurrentPosition(result=>{pending=false;button.disabled=false;position={latitude:result.coords.latitude,longitude:result.coords.longitude};changed();},error=>{pending=false;button.disabled=false;status.textContent=error.code===1?'Location permission declined. Search by city or allow location and retry.':error.code===3?'Location request timed out. Please try again.':'Location unavailable. Please retry or search by city.';},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});};
  window.KicksNearby={apply,badge,clear};
})();
