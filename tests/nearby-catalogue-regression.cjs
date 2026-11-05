const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const kind of ['fields','games','tournaments']){
  let allowed,errorCallback,requestCount=0,changes=0;
  const button={disabled:false,innerHTML:'',setAttribute(k,v){this[k]=v;}},status={textContent:''},sort={disabled:false};
  const bar={className:'',innerHTML:'',querySelector:s=>s==='button'?button:status};
  const form={}; const sortControl={insertAdjacentElement(where,el){assert.equal(where,'beforebegin');assert.equal(el,bar);}};const toolbar={classList:{add(){}},querySelector:()=>sortControl};
  const selectors={fields:'#searchForm',games:'#gameSearchForm',tournaments:'#cupFilters'};
  const rows=[{id:1},{id:2},{id:3}],window={};let visible=[];
  const context={window,location:{pathname:'/Pages/'+kind+'/'+(kind==='games'?'open-games':kind)+'.html'},document:{querySelector:s=>s===selectors[kind]?form:s==='.results-toolbar'?toolbar:s.startsWith('#sort')||s==='#gameSort'||s==='#cupSort'?sort:null,createElement:()=>bar},navigator:{geolocation:{getCurrentPosition(success,error){requestCount++;allowed=success;errorCallback=error;}}},KicksDiscovery:{search(filters,position){assert.equal(filters.kind,kind);return{results:[{id:2,distance:1.2,precision:'area'},{id:1,distance:4,precision:'exact'}]};}},Event};
  window.dispatchEvent=()=>{changes++;visible=window.KicksNearby.apply(kind,rows);};
  vm.runInNewContext(fs.readFileSync('js/nearby-catalogue.js','utf8'),context);
  button.onclick();assert.equal(requestCount,1);assert.equal(button.disabled,true);
  errorCallback({code:1});assert.equal(button.disabled,false);assert.match(status.textContent,/declined/);assert.equal(changes,0);
  button.onclick();allowed({coords:{latitude:32,longitude:35}});
  assert.equal(changes,1);assert.equal(sort.disabled,true);assert.equal(visible.map(r=>r.id).join(','),'2,1');assert.match(window.KicksNearby.badge(kind,2),/1.2 km.*area estimate/);assert.match(button.innerHTML,/Show all/);
  button.onclick();assert.equal(sort.disabled,false);assert.equal(visible.length,3);assert.match(button.innerHTML,/Near me/);
}
console.log('PASS: inline nearby filtering and ordering on all three catalogues, permission denial, distance badges and Show all reset.');
