/* Secondary-page composition adapter. No persistence, role decisions, or business actions. */
(()=>{'use strict';
 if(!document.body.classList.contains('kx-secondary'))return;
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const make=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n};
 function group(parent,selector,cls){const nodes=$$(selector,parent).filter(n=>n.parentElement===parent);if(!nodes.length)return null;const box=make('div',cls);parent.insertBefore(box,nodes[0]);nodes.forEach(n=>box.append(n));return box;}
 function cards(){
  $$('.match-card:not([data-kx-composed])').forEach(c=>{c.dataset.kxComposed='true';const body=$('.match-body',c),schedule=$('.match-schedule',c);if(!body||!schedule)return;const rail=make('div','kx-kickoff-rail');rail.append(schedule);c.prepend(rail);const identity=group(body,'.match-level,h3,.match-location','kx-match-identity');if(identity){const tags=make('div','kx-match-tags');$$('.match-badge,.match-format',c).forEach(n=>tags.append(n));identity.prepend(tags)}group(body,'.match-players,progress','kx-match-capacity');});
  $$('.team-card:not([data-kx-composed])').forEach(c=>{c.dataset.kxComposed='true';const body=$('.team-card-body',c),top=$('.team-card-top',c);if(!body||!top)return;const identity=make('div','kx-club-identity');identity.append(top);const name=$('.team-name',body);if(name)identity.append(name);c.prepend(identity);group(body,'.team-meta,.team-tags','kx-club-facts');});
  $$('.cup-card:not([data-kx-composed])').forEach((c,i)=>{c.dataset.kxComposed='true';const b=$('.cup-card-body',c);if(!b)return;const strip=make('div','kx-competition-rail');const k=make('span','kx-competition-label');k.textContent='KICKS / COMPETITION';strip.append(k);const d=$('.cup-card-date',b);if(d)strip.append(d);c.prepend(strip);group(b,'.cup-level,h3,.cup-card-location','kx-competition-identity');});
  $$('.challenge-card:not([data-kx-composed])').forEach(c=>{c.dataset.kxComposed='true';const top=$('.challenge-top',c);if(top){const word=make('span','kx-versus-mark');word.textContent='VS';word.setAttribute('aria-hidden','true');top.append(word)}});
  $$('.meeting-card:not([data-kx-composed])').forEach(c=>{c.dataset.kxComposed='true';group(c,'h3,p','kx-meeting-information')});
 }
 function details(){
  const game=$('#gameDetailContent');if(game&&!game.dataset.kxComposed){game.dataset.kxComposed='true';const layout=$('.game-detail-layout',game);if(layout){const photo=$('.game-detail-image',game);const title=$('h1',game);if(photo&&title){const hero=make('header','kx-match-hero');photo.before(hero);hero.append(photo);const identity=make('div','kx-match-hero-copy');identity.append(title);const registration=$('.join-card',game);if(registration){registration.id ||= 'kxMatchRegistration';const jump=make('a','kx-registration-jump');jump.href='#'+registration.id;jump.textContent='Registration & places \u2193';identity.append(jump)}hero.append(identity);}}}
  const cup=$('#cupContent');if(cup&&!cup.dataset.kxComposed){cup.dataset.kxComposed='true';const photo=$('.cup-cover',cup),title=$('h1',cup);if(photo&&title){const head=make('header','kx-cup-hero');photo.before(head);head.append(photo);const copy=make('div','kx-cup-hero-copy');copy.append(title);const registration=$('.cup-registration',cup);if(registration){registration.id ||= 'kxCupRegistration';const jump=make('a','kx-registration-jump');jump.href='#'+registration.id;jump.textContent='Registration details \u2193';copy.append(jump)}head.append(copy)}}
  $$('#team-detail,#challenge-detail').forEach(n=>{const head=$('.detail-header',n);if(!head||head.closest('.kx-club-masthead'))return;const mast=make('header','kx-club-masthead');head.before(mast);const close=$('.detail-cover .icon-button',n);if(close){close.classList.add('kx-detail-close');mast.append(close)}mast.append(head);const cover=$('.detail-cover',n);if(cover)cover.hidden=true;const summary=$('.match-summary',head),workspace=$('#match-workspace',n);if(summary&&workspace){summary.classList.add('kx-match-brief');workspace.prepend(summary)}});
 }
 function dashboard(){
  const body=document.body,role=body.dataset.dashboard,view=$('#dashboardView');if(!role||!view)return;
  const nav=$('#dashNav');if(nav){$$('a[href^="#"]',nav).forEach(a=>{const id=a.hash.slice(1);a.dataset.kxGroup=['overview','bookings','memberships','registrations'].includes(id)?'activity':['profile','meetings','messages'].includes(id)?'account':'manage'});}
  const overview=$('.stats-grid',view);if(overview&&!view.dataset.organized&&!$('.kx-workspace-overview',view)){
   const layout=make('div','kx-workspace-overview');view.prepend(layout);
   const lead=make('section','kx-workspace-lead');const eyebrow=make('p','kx-workspace-label');eyebrow.textContent=role==='player'?'YOUR PERSONAL TOUCHLINE':role==='owner'?'VENUE OPERATIONS':'PLATFORM CONTROL';
   const title=make('h2','kx-workspace-title');title.textContent=role==='player'?'MAKE TIME\nFOR THE GAME.':role==='owner'?'YOUR GROUNDS.\nIN GOOD HANDS.':'A CLEAR VIEW.\nTOTAL CONTROL.';
   const links=make('div','kx-workspace-links');for(const [label,hash]of(role==='player'?[['Find a pitch','../Fields/fields.html'],['Your bookings','#bookings']]:role==='owner'?[['Manage venues','#fields'],['Booking desk','#bookings']]:[['Accounts','#users'],['Booking oversight','#bookings']])){const a=make('a','');a.href=hash;a.textContent=label+' \u2197';links.append(a)}lead.append(eyebrow,title,links);layout.append(lead,overview);
   const charts=$('.analytics-grid',view),bookings=$('.overview-bookings',view),columns=$('.dash-columns',view);
   if(role==='player'){const content=make('div','kx-player-activity');layout.after(content);if(bookings)content.append(bookings);if(columns)content.append(columns);if(charts)content.after(charts)}
   else if(role==='owner'){const operations=make('div','kx-owner-operations');layout.after(operations);if(bookings)operations.append(bookings);if(charts)operations.append(charts)}
   else{const control=make('div','kx-admin-control');layout.after(control);if(charts)control.append(charts);if(columns)control.append(columns);if(bookings)control.after(bookings)}
  }
  const ledger=$('.reservations-panel',view);if(ledger&&!ledger.dataset.kxComposed){ledger.dataset.kxComposed='true';const intro=make('aside','kx-ledger-intro');const heading=$('.reservations-heading',ledger),tools=$('.reservations-tools',ledger);ledger.prepend(intro);if(heading)intro.append(heading);if(tools)intro.append(tools)}
  const current=$('#viewTitle')?.textContent||'Overview';const crumb=$('.kx-dashboard-breadcrumb');if(crumb&&crumb.textContent!==current)crumb.textContent=current;
  $$('.table-wrap',view).forEach(w=>{w.tabIndex=0;w.setAttribute('role','region');w.setAttribute('aria-label',current+' records â€” scroll horizontally when needed')});
 }
 function motion(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;$$('.kx-workspace-lead:not([data-kx-motion]),.kx-match-hero:not([data-kx-motion]),.kx-cup-hero:not([data-kx-motion])').forEach(n=>{n.dataset.kxMotion='true';if(window.gsap)gsap.fromTo(n,{y:12},{y:0,duration:.55,ease:'power2.out',clearProps:'transform'});});}
 function update(){cards();details();dashboard();

 motion()}
 function init(){
  if(document.body.dataset.dashboard){const top=$('.dash-top'),side=$('.dash-sidebar');if(top&&side){const bar=make('div','kx-dashboard-toolbar');const btn=make('button','kx-dashboard-menu');btn.type='button';btn.textContent='Workspace menu';btn.setAttribute('aria-controls','dashNav');btn.setAttribute('aria-expanded','false');btn.addEventListener('click',()=>{const open=!document.body.classList.contains('kx-nav-open');document.body.classList.toggle('kx-nav-open',open);btn.setAttribute('aria-expanded',String(open));if(open)$('#dashNav a')?.focus()});const crumb=make('span','kx-dashboard-breadcrumb');bar.append(btn,crumb);top.before(bar);side.addEventListener('click',e=>{if(e.target.closest('a')){document.body.classList.remove('kx-nav-open');btn.setAttribute('aria-expanded','false');if(e.target.closest('a').getAttribute('href')?.startsWith('#'))requestAnimationFrame(()=>{const title=$('#viewTitle');if(title){title.tabIndex=-1;title.focus({preventScroll:true})}})}});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('kx-nav-open')){document.body.classList.remove('kx-nav-open');btn.setAttribute('aria-expanded','false');btn.focus()}})}
   const identity=$('#sidebarProfile'),nav=$('#dashNav');if(identity&&nav)nav.before(identity);
  }
  update();let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()})}).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
