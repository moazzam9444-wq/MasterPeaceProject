// Offline discovery engine. A future provider returns filters, never invented listings.
(() => {
  const cities = {Amman:['amman','عمان'],Irbid:['irbid','اربد','إربد'],Zarqa:['zarqa','الزرقاء','زرقاء'],Aqaba:['aqaba','العقبة','عقبه'],Balqa:['balqa','balqa’','salt','السلط','البلقاء'],Madaba:['madaba','مادبا'],Jerash:['jerash','جرش'],Ajloun:['ajloun','عجلون'],Karak:['karak','الكرك'],Mafraq:['mafraq','المفرق'],Tafilah:['tafilah','tafila','الطفيلة','طفيله'],"Ma'an":["ma'an",'maan','معان']};
  const normalize = text => String(text || '').toLowerCase().replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[أإآ]/g,'ا');
  function parse(text) {
    const q=normalize(text), filters={};
    if(/بحث جديد|من جديد|ابدا من جديد|ابدأ من جديد|start over|new search|reset/i.test(q)) filters.reset=true;
    const clear=[];
    if(/بدون ميزاني|بدون حد|اي سعر|أي سعر|any budget|no budget|remove.*budget/i.test(q))clear.push('maxPrice');
    if(/كل المدن|جميع المدن|all cities|any city/i.test(q))clear.push('city','query');
    if(/اي وقت|أي وقت|any time|remove.*time/i.test(q))clear.push('date','after');
    if(/كل الانواع|كل الفئات|everything|all categories/i.test(q))clear.push('kind','format');
    if(clear.length)filters.clear=clear;
    for (const [city,aliases] of Object.entries(cities)) if(aliases.some(alias=>q.includes(normalize(alias)))) filters.city=city;
    if (/بطول|tournament|cup/.test(q)) filters.kind='tournaments';
    else if (/مبار|ماتش|game|match/.test(q)) filters.kind='games';
    else if (/ملعب|ملاعب|field|pitch/.test(q)) filters.kind='fields';
    const budget=q.match(/(?:ميزاني(?:تي|تنا|ة)?|budget|under|below|حتى|اقل من|بحدود|حد اقصى)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/) || q.match(/(\d+(?:\.\d+)?)\s*(?:دينار|jd|jod)/);
    if(budget) filters.maxPrice=Number(budget[1]);
    const format=q.match(/([5-7])\s*(?:vs|v|ضد)\s*\1(?!\d)/); if(format)filters.format=format[1]+'v'+format[1];
    const players=q.match(/(\d+)\s*(?:لاعب|players)/); if(players && [10,12,14].includes(Number(players[1])))filters.format=(Number(players[1])/2)+'v'+(Number(players[1])/2);
    const date=q.match(/\b(\d{4}-\d{2}-\d{2})\b/);if(date)filters.date=date[1];
    if(!filters.date){
      const local = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Amman'}));
      let offset=null;
      if(/tomorrow|بكرا|بكره|غدا/.test(q))offset=1;else if(/today|اليوم/.test(q))offset=0;
      const weekdays=[['sunday','الاحد'],['monday','الاثنين'],['tuesday','الثلاثاء'],['wednesday','الاربعاء'],['thursday','الخميس'],['friday','الجمعه','الجمعة'],['saturday','السبت']];
      if(offset===null)weekdays.forEach((names,day)=>{if(names.some(name=>q.includes(name)))offset=(day-local.getDay()+7)%7;});
      if(offset!==null){local.setDate(local.getDate()+offset);filters.date=local.getFullYear()+'-'+String(local.getMonth()+1).padStart(2,'0')+'-'+String(local.getDate()).padStart(2,'0');}
    }
    const time=q.match(/(?:بعد|after)\s*(?:الساعة|ال)?\s*(\d{1,2})(?::(\d{2}))?\s*(pm|am|مساء|صباح)?/);
    if(time){let hour=Number(time[1]);if((time[3]==='pm'||time[3]==='مساء')&&hour<12)hour+=12;if(time[3]==='am'&&hour===12)hour=0;if(hour<24&&Number(time[2]||0)<60)filters.after=String(hour).padStart(2,'0')+':'+(time[2]||'00');}
    const named=KicksStore.list('fields').flatMap(field=>[field.name,field.area]).filter(value=>typeof value==='string'&&value.trim().length>=3&&!Object.entries(cities).some(([city,aliases])=>[city,...aliases].some(alias=>normalize(alias)===normalize(value)))).sort((a,b)=>b.length-a.length).find(value=>q.includes(normalize(value)));
    if(named)filters.query=named;
    return filters;
  }
  function canonicalCity(value){const q=normalize(value);return Object.entries(cities).find(([city,aliases])=>normalize(city)===q||aliases.some(alias=>normalize(alias)===q))?.[0]||q;}
  function mergeFilters(previous,next){const merged=next.reset?{}:{...previous};delete merged.reset;delete merged.clear;if(next.city&&canonicalCity(next.city)!==canonicalCity(previous.city))delete merged.query;for(const key of next.clear||[])delete merged[key];if(next.kind&&previous.kind&&next.kind!==previous.kind){delete merged.date;delete merged.after;delete merged.query;}for(const [key,value]of Object.entries(next))if(!['reset','clear'].includes(key))merged[key]=value;return merged;}
  function coordinates(field) {
    if(field?.latitude==null||field?.longitude==null||String(field.latitude).trim()===''||String(field.longitude).trim()==='')return window.KicksPlaces?.resolve(field)||null;
    const lat=Number(field.latitude),lng=Number(field.longitude);
    return Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lng)&&Math.abs(lng)<=180?{latitude:lat,longitude:lng,precision:'exact'}:window.KicksPlaces?.resolve(field)||null;
  }
  function distance(a,b){const r=Math.PI/180,dlat=(b.latitude-a.latitude)*r,dlng=(b.longitude-a.longitude)*r;const h=Math.sin(dlat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dlng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
  function search(filters={},position=null) {
    const fields=KicksStore.list('fields');
    const results=[];let missingCoordinates=0;const radius=Number.isFinite(filters.radiusKm)&&filters.radiusKm>0?filters.radiusKm:15;
    for(const kind of ['fields','games','tournaments']){
      if(filters.kind&&filters.kind!==kind)continue;
      const rows=kind==='fields'?fields:KicksStore.publicActivities(kind);
      for(const row of rows){
        const field=kind==='fields'?row:fields.find(f=>f.id===row.fieldId);if(!field)continue;
        if(kind!=='fields'&&(Date.parse(row.date+'T'+row.time+':00+03:00')<=Date.now()||Number(row.capacity)<=Number(kind==='games'?row.joined:row.teams)))continue;
        if(['Cancelled','Archived','Inactive','Completed'].includes(row.status))continue;
        if(filters.city&&canonicalCity(field.city)!==canonicalCity(filters.city))continue;
        if(filters.query&&!normalize([field.name,field.area].join(' ')).includes(normalize(filters.query)))continue;
        if(filters.format&&field.type!==filters.format)continue;
        const price=Number(kind==='tournaments'?row.fee:row.price);
        if(filters.maxPrice!=null&&(!Number.isFinite(price)||price>filters.maxPrice))continue;
        // Date/time for fields requires the booking availability service; never claim availability here.
        if(kind!=='fields'&&filters.date&&row.date!==filters.date)continue;
        if(kind!=='fields'&&filters.after&&row.time<filters.after)continue;
        const point=coordinates(field);if(position&&!point){missingCoordinates++;continue;}
        const km=position?distance(position,point):null;
        if(position&&km>radius)continue;
        results.push({precision:point?.precision||'exact',locationLabel:point?.label,kind,id:row.id,name:row.name||row.title,fieldName:field.name,city:field.city,area:field.area,price,format:field.type,date:kind==='fields'?null:row.date,time:kind==='fields'?null:row.time,distance:km});
      }
    }
    results.sort((a,b)=>position?a.distance-b.distance:(a.price-b.price)||a.name.localeCompare(b.name));
    return {results,missingCoordinates};
  }
  let provider={async interpret(text){return parse(text);}};
  function setProvider(next){if(!next||typeof next.interpret!=='function')throw Error('Provider must implement interpret(text).');provider=next;}
  async function interpret(text){const raw=await provider.interpret(String(text).slice(0,500));const safe={};if(raw?.reset===true)safe.reset=true;if(Array.isArray(raw?.clear))safe.clear=raw.clear.filter(key=>['kind','city','query','maxPrice','format','date','after'].includes(key));if(typeof raw?.query==='string'&&raw.query.length<=160)safe.query=raw.query;if(['fields','games','tournaments'].includes(raw?.kind))safe.kind=raw.kind;if(typeof raw?.city==='string'&&raw.city.length<=80)safe.city=raw.city;if(Number.isFinite(raw?.maxPrice)&&raw.maxPrice>=0)safe.maxPrice=raw.maxPrice;if(['5v5','6v6','7v7'].includes(raw?.format))safe.format=raw.format;if(/^\d{4}-\d{2}-\d{2}$/.test(raw?.date))safe.date=raw.date;if(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw?.after))safe.after=raw.after;return safe;}
  window.KicksDiscovery={parse,interpret,setProvider,search,coordinates,distance,mergeFilters};
})();
