/* Homepage presentation adapter; availability delegates to the shared store scheduling rules. */
(() => {
  'use strict';
  const store=window.KicksStore;
  const esc=value=>store.escape(String(value??''));
  const fieldsGrid=document.getElementById('home-fields-grid');
  const gamesGrid=document.getElementById('home-open-games-grid');
  const cupsGrid=document.getElementById('home-tournaments-grid');
  const form=document.getElementById('homeSearch');
  const city=document.getElementById('homeLocation'),date=document.getElementById('homeDate'),time=document.getElementById('homeTime');
  const status=document.getElementById('homeSearchStatus'),resultBar=document.getElementById('homeSearchResults');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let filters=null,lenis;
  function ammanNow(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return {date:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour)};
  }
  function available(field,day,slot){
    if(!day)return true;
    const now=ammanNow();
    if(day<now.date||(day===now.date&&!field.today))return false;
    const hours=slot?[Number(slot.slice(0,2))]:Array.from({length:13},(_,i)=>i+10);
    return hours.some(hour=>hour>=10&&hour<=22&&!(day===now.date&&hour<=now.hour)&&store.isFieldSlotAvailable(field.id,day,`${String(hour).padStart(2,'0')}:00`));
  }
  const arrow='<svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3.5 10h12M10.5 4.5 16 10l-5.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function fieldCard(field,index){
    const image=window.KicksAuth.fieldImage(field),lead=index===0;
    return `<a class="venue ${lead?'venue--lead':'venue--sm'} fl-field-card pitch-editorial ${lead?'pitch-editorial--featured':'pitch-editorial--secondary'}" href="Pages/Fields/field-details.html?id=${encodeURIComponent(field.id)}"><div class="venue-media"><img src="${esc(image)}" alt="Football pitch at ${esc(field.name)}" width="1200" height="842" loading="lazy"><span class="venue-tag">${esc(field.type)}</span></div><div class="pitch-copy"><div class="pitch-identity"><p class="venue-meta">${esc([field.city,field.area].filter(Boolean).join(' / '))}</p><h3>${esc(field.name)}</h3><p class="venue-desc">${esc(field.description||field.amenities||field.type)}</p></div><div class="pitch-foot"><p class="venue-price"><strong>${esc(field.price)} JD</strong><span>/ hour</span></p><span class="venue-link">View pitch ${arrow}</span></div></div></a>`;
  }
  function emptyFields(){return `<div class="empty-fields-copy"><p class="kicker">Your next game is out there</p><h3>${filters?'Try another search.':'Great games start here.'}</h3><p>${filters?'No fields match this search. Try another location, date, or time.':'No fields published yet. Explore KICKS, or register as a field owner to bring your pitch to the community.'}</p><a class="text-link" href="${filters?'Pages/Fields/fields.html':'Pages/Auth/register.html'}">${filters?'Explore all fields':'List your field'} ${arrow}</a></div>`;}
  function gameCard(game,fields){
    const field=fields.find(f=>f.id===game.fieldId);if(!field)return '';
    const day=new Date(`${game.date}T12:00:00+03:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Amman'});
    const spots=Math.max(0,game.capacity-game.joined),live=Date.parse(`${game.date}T${game.time}:00+03:00`)<=Date.now();
    return `<a class="game-row fl-game-row" href="Pages/OpenGames/game-details.html?id=${encodeURIComponent(game.id)}"><div class="game-date"><span>${esc(day)}</span><strong>${esc(game.time)}</strong></div><div class="game-info"><h3>${esc(game.title)}</h3><p>${esc(field.name)} · ${esc(field.city)}</p><p>${esc(field.type)} · ${esc(game.price)} JD / player</p></div><span class="game-spots">${live?'In progress':spots?`${spots} ${spots===1?'spot':'spots'} left`:'Full'}</span><span class="game-arrow">${arrow}</span></a>`;
  }
  function cupCard(cup,fields){
    const field=fields.find(f=>f.id===cup.fieldId);if(!field)return '';
    return `<a class="fl-cup-row" href="Pages/Tournaments/tournament-details.html?id=${encodeURIComponent(cup.id)}"><div><p>${esc(cup.date)} / ${esc(field.city)}</p><strong>${esc(cup.name)}</strong><p>${esc(cup.teams)} / ${esc(cup.capacity)} teams · ${esc(cup.fee)} JD / team</p></div>${arrow}</a>`;
  }
  function renderHighlights(){
    const fields=store.list('fields'),selected=city.value;
    const cities=[...new Set(fields.map(f=>f.city).filter(Boolean))].sort();
    if(selected&&!cities.includes(selected))cities.push(selected);
    if(city.dataset.cities!==cities.join('|')){city.dataset.cities=cities.join('|');city.replaceChildren(new Option('All locations',''),...cities.map(c=>new Option(c,c)));city.value=selected;}
    date.min=ammanNow().date;
    const matches=fields.filter(f=>!filters||((!filters.city||f.city===filters.city)&&available(f,filters.date,filters.time)));
    const cards=matches.slice(0,filters?12:3);fieldsGrid.innerHTML=cards.length?cards.map(fieldCard).join(''):emptyFields();
    if(filters){resultBar.hidden=false;const description=[filters.city,filters.date,filters.time].filter(Boolean).join(' · ');status.textContent=`${matches.length} ${matches.length===1?'field matches':'fields match'}${description?' · '+description:''}.${matches.length>12?' Showing the first 12.':''} Confirm your booking time on the field page.`;}
    const byStart=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);
    gamesGrid.innerHTML=store.publicActivities('games').sort(byStart).slice(0,3).map(g=>gameCard(g,fields)).join('')||'<p class="home-empty">No active or upcoming games yet. Check back for your next kick-off.</p>';
    cupsGrid.innerHTML=store.publicActivities('tournaments').sort(byStart).slice(0,1).map(c=>cupCard(c,fields)).join('')||'<p class="home-empty">No active or upcoming tournaments yet. Get your team ready for the next one.</p>';
    document.getElementById('homeCities').textContent=cities.length?cities.join(' · '):'Jordan / Everyone’s game';
    window.ScrollTrigger?.refresh();
    const settings=store.settings(),aboutTitle=document.getElementById('homeAboutTitle'),aboutDescription=document.getElementById('homeAboutDescription'),contact=document.getElementById('homeContact');
    if(aboutTitle&&settings.title?.trim())aboutTitle.textContent=settings.title;
    if(aboutDescription&&settings.description?.trim())aboutDescription.textContent=settings.description;
    if(contact&&settings.contact){contact.textContent=settings.contact;contact.hidden=false;}
    document.dispatchEvent(new CustomEvent('kicks:home-rendered'));
  }
  if(store){
    for(let hour=10;hour<=22;hour++)time.add(new Option(`${String(hour).padStart(2,'0')}:00`,`${String(hour).padStart(2,'0')}:00`));
    time.addEventListener('change',()=>{date.required=Boolean(time.value);});
    form.addEventListener('submit',event=>{
      event.preventDefault();date.min=ammanNow().date;if(!form.reportValidity())return;
      filters={city:city.value,date:date.value,time:time.value};renderHighlights();
      document.getElementById('fields').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
      status.tabIndex=-1;status.focus({preventScroll:true});
    });
    document.getElementById('homeSearchReset').addEventListener('click',()=>{
      filters=null;form.reset();date.required=false;resultBar.hidden=true;renderHighlights();
      const heading=document.getElementById('fieldsTitle');heading.tabIndex=-1;heading.focus({preventScroll:true});
    });
    renderHighlights();store.watchActivityClock(renderHighlights);
    addEventListener('storage',event=>{if(event.key==='kicks-data-v2')renderHighlights();});
    addEventListener('kicks-data-change',renderHighlights);
  }


})();
