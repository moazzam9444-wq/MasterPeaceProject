// Offline place lookup; no paid API or coordinates required from field owners.
(() => {
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase().replace(/[^a-z0-9\u0621-\u064a]+/g,' ').trim().replace(/^(?:al|el|as|at|az|ash) /,'').replace(/^ال/,'');
  const adminCodes={amman:'16',irbid:'18',zarqa:'17',ajloun:'20',jerash:'22',mafraq:'15',balqa:'02',salt:'02',madaba:'23',karak:'09',tafilah:'12',maan:'19',aqaba:'21'};
  const places=(window.KicksJordanPlaces||[]).map(p=>({...p,keys:p.names.map(normalize)}));
  const cache=new Map();
  function resolve(field){
    const city=normalize(field.city),area=normalize(field.area),cacheKey=city+'|'+area;
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const compact=city.replace(/ /g,''),admin=adminCodes[compact]||places.find(p=>p.keys.includes(city)&&['PPLC','PPLA'].includes(p.code))?.admin;
    const local=admin?places.filter(p=>p.admin===admin):[];
    const candidates=area?local.filter(p=>p.keys.includes(area)):[];
    const matches=[...new Map(candidates.map(p=>[p.latitude.toFixed(4)+','+p.longitude.toFixed(4),p])).values()];
    // Repeated names within a governorate are ambiguous; use a city-level estimate.
    let match=matches.length===1?matches[0]:null;
    let precision='area';
    if(!match){precision='city';match=local.find(p=>['PPLC','PPLA'].includes(p.code));}
    const result=match?{latitude:match.latitude,longitude:match.longitude,precision,label:match.name}:null;
    cache.set(cacheKey,result);return result;
  }
  window.KicksPlaces={resolve};
})();
