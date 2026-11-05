// Compact local assistant. Backend model interpretation plugs into KicksDiscovery.
(() => {
  if(!window.KicksDiscovery||!window.KicksStore)return;
  const root=new URL('../',document.currentScript.src),esc=KicksStore.escape;
  const url=path=>new URL(path,root).href;
  const launcher=document.createElement('button');launcher.type='button';launcher.className='kicks-assistant-launcher';launcher.innerHTML='<span aria-hidden="true">✦</span> KICKS Assistant';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','kicksChat');launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-label','Open KICKS Assistant');document.body.append(launcher);
  const panel=document.createElement('section');panel.id='kicksChat';panel.className='kicks-chat';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','kicksChatTitle');
  panel.innerHTML='<header class="kicks-chat-header"><span class="kicks-chat-avatar" aria-hidden="true">✦</span><div><h2 id="kicksChatTitle">KICKS Assistant</h2><p>Your next game starts here.</p></div><button type="button" class="kicks-chat-close" aria-label="Close assistant">×</button></header><div class="kicks-chat-history" role="log" aria-label="Conversation" aria-live="polite"></div><form class="kicks-chat-form"><label for="kicksChatInput" class="kicks-chat-label">Your message · رسالتك</label><div><textarea id="kicksChatInput" rows="1" maxlength="500" placeholder="اكتب شو بتدور عليه…" dir="auto" required></textarea><button type="submit" aria-label="Send message">↗</button></div><p class="kicks-chat-note">Local search helper · مساعد بحث محلي</p></form>';
  document.body.append(panel);const history=panel.querySelector('.kicks-chat-history'),input=panel.querySelector('textarea'),submit=panel.querySelector('[type="submit"]');let context={},busy=false;
  let dockFrame=0;
  function dock(){
    dockFrame=0;
    if(!panel.hidden)return;
    const w=launcher.offsetWidth,h=launcher.offsetHeight,right=Math.max(16,innerWidth-launcher.getBoundingClientRect().right);
    let lift=document.querySelector('.kx-mobile-reserve')&&innerWidth<768?96:16;
    for(let attempt=0;attempt<5;attempt++){
      const x=innerWidth-right-w/2,y=innerHeight-lift-h/2;
      const blocked=document.elementsFromPoint(x,y).some(el=>!launcher.contains(el)&&el!==launcher&&el.closest('button,a,input,select,textarea,[role="button"]'));
      if(!blocked)break;
      lift+=52;
    }
    launcher.style.setProperty('--kicks-assistant-lift',lift+'px');
  }
  function requestDock(){if(!dockFrame)dockFrame=requestAnimationFrame(dock);}
  addEventListener('scroll',requestDock,{passive:true});addEventListener('resize',requestDock,{passive:true});requestDock();
  function bubble(text,kind='assistant',links=''){const row=document.createElement('div');row.className='kicks-chat-bubble '+kind;row.innerHTML='<p dir="auto">'+esc(text)+'</p>'+links;history.append(row);history.scrollTop=history.scrollHeight;}
  bubble('أهلاً! احكيلي شو بدك: ملعب، مباراة مفتوحة أو بطولة؟ مثلاً: بدي ملعب بعمان بميزانية 30 دينار.');
  function toggle(open){panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)input.focus();else launcher.focus();}
  launcher.onclick=()=>toggle(panel.hidden);panel.querySelector('.kicks-chat-close').onclick=()=>toggle(false);panel.addEventListener('keydown',event=>{if(event.key==='Escape')toggle(false);});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();panel.querySelector('form').requestSubmit();}});
  panel.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const text=input.value.trim();if(!text||busy)return;busy=true;submit.disabled=true;input.value='';bubble(text,'user');panel.setAttribute('aria-busy','true');
    try{
      const arabic=/[\u0600-\u06ff]/.test(text);
      if(/^(?:مرحبا|اهلا|أهلا|السلام عليكم|hi|hello)[! .؟?]*$/i.test(text)){bubble(arabic?'أهلاً فيك! شو بتدور عليه، وبأي مدينة؟':'Hi! Are you looking for a field, open game or tournament, and in which city?');return;}
      if(/قريب|near me|nearest/i.test(text)){bubble(arabic?'بتلاقي زر Near me بصفحة الملاعب والمباريات والبطولات. اكبس عليه واسمح بالموقع، وبتتغيّر الكاردات لتعرض النتائج ضمن 15 كم.':'Use Near me on the fields, games or tournaments page to update their cards within 15 km.', 'assistant','<div class="kicks-chat-links"><a href="'+url('Pages/Fields/fields.html')+'">Fields ↗</a><a href="'+url('Pages/OpenGames/open-games.html')+'">Open games ↗</a><a href="'+url('Pages/Tournaments/tournaments.html')+'">Tournaments ↗</a></div>');return;}
      if(/كيف.*(?:احجز|أحجز)|how.*book/i.test(text)){bubble(arabic?'افتح الملعب، اختار موعد متاح، وسجّل دخول بحساب لاعب مفعّل حتى تكمّل الحجز. احكيلي المدينة والميزانية وبساعدك تلاقي ملعب.':'Open a field, choose an available time and sign in with an approved player account to book. Tell me your city and budget to find a field.');return;}
      const parsed=await KicksDiscovery.interpret(text);
      if(!Object.keys(parsed).length){bubble(arabic?'بقدر أساعدك بالبحث عن الملاعب والمباريات والبطولات. احكيلي المدينة أو الميزانية؛ مثلاً: مباريات في إربد.':'I can help find fields, open games and tournaments. Tell me a city or budget, for example: games in Irbid.');return;}
      context=KicksDiscovery.mergeFilters(context,parsed);
      const output=KicksDiscovery.search(context),rows=output.results;
      const labels={fields:arabic?'ملاعب':'fields',games:arabic?'مباريات مفتوحة':'open games',tournaments:arabic?'بطولات':'tournaments'};
      let answer=arabic?'لقيت '+rows.length+' نتيجة':'Found '+rows.length+' matches';if(context.city)answer+=(arabic?' في ':' in ')+context.city;if(context.maxPrice!=null)answer+=(arabic?' بحد أقصى ':' up to ')+context.maxPrice+(arabic?' دينار':' JD');if(context.query)answer+=(arabic?' · بحث: ':' · Search: ')+context.query;if(context.date)answer+=' · '+context.date;if(context.after)answer+=(arabic?' · بعد ':' · After ')+context.after+' (Amman)';answer+='.';
      if(!rows.length)answer+=arabic?' جرّب مدينة ثانية أو ميزانية أعلى، وبقدر أبحثلك من جديد.':' Try a different city or a higher budget.';
      else answer+=arabic?' هاي بعض النتائج المناسبة لطلبك. افتح النتيجة لتشوف التفاصيل:':' Here are some matches. Open a result for details:';
      if((context.date||context.after)&&(!context.kind||context.kind==='fields'))answer+=arabic?' تأكد من توفر اليوم والوقت بصفحة حجز الملعب.':' Check field date/time availability on the booking page.';
      const paths={fields:'Pages/Fields/field-details.html',games:'Pages/OpenGames/game-details.html',tournaments:'Pages/Tournaments/tournament-details.html'};
      const links='<div class="kicks-chat-results">'+rows.slice(0,3).map(row=>'<a href="'+url(paths[row.kind]+'?id='+encodeURIComponent(row.id))+'"><strong dir="auto">'+esc(row.name)+'</strong><span>'+esc(labels[row.kind])+' · '+esc(row.city)+' · '+esc(row.price)+' JD'+(row.kind==='fields'?' / hour':row.kind==='games'?' / player':' / team')+'</span><b aria-hidden="true">↗</b></a>').join('')+'</div>';
      bubble(answer,'assistant',links);
    }catch{bubble('تعذّر البحث حالياً. جرّب مرة ثانية. / Search is unavailable. Please try again.');}
    finally{busy=false;submit.disabled=false;panel.removeAttribute('aria-busy');if(!panel.hidden)input.focus();}
  };
})();
