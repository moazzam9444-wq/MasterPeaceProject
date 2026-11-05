/* Shared presentation shell; authentication stays in account.js. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src), url = path => new URL(path, root).href;
  const routes = [['Home','index.html'],['Fields','Pages/Fields/fields.html'],['Open games','Pages/OpenGames/open-games.html'],['Teams','Pages/Teams/teams.html'],['Challenges','Pages/Challenges/challenges.html'],['Tournaments','Pages/Tournaments/tournaments.html'],['About','Pages/About/about.html'],['Contact','Pages/Contact/contact.html']];
  const current = location.pathname.toLowerCase();
  const active = path => path === 'index.html' ? current === root.pathname.toLowerCase() || current.endsWith('/index.html') : current.includes('/' + path.split('/')[1].toLowerCase() + '/');
  const previous = document.querySelector('#site-header, nav.navbar');
  const extra = previous ? [...previous.querySelectorAll('a[href]')].filter(a => !routes.some(([,p])=>new URL(a.href).pathname===new URL(url(p)).pathname) && !/Auth\/login|football\.html/i.test(a.href) && !a.matches('.brand,.navbar-brand')) : [];
  const header = document.createElement('header'); header.id='site-header'; header.className='premium-nav';
  header.innerHTML=`<div class="premium-nav-inner"><a class="premium-brand" href="${url('index.html')}" aria-label="KICKS Football home"><span class="premium-brand-slash" aria-hidden="true">/</span><span>KICKS<small>FOOTBALL</small></span></a><div class="premium-menu" id="mobile-menu"><nav class="premium-panel" id="mainNavbar" aria-label="Main navigation"><ul class="premium-links">${routes.map(([name,p])=>`<li><a class="nav-link${active(p)?' active':''}" ${active(p)?'aria-current="page"':''} href="${url(p)}">${name}</a></li>`).join('')}</ul><div id="navbarAccount" class="navbar-account"><a class="account-login" href="${url('Pages/Auth/login.html')}">Log in <span aria-hidden="true">↗</span></a></div></nav></div><div class="premium-tools"><div data-theme-control></div><button class="navbar-toggler premium-menu-toggle" id="menu-toggle" type="button" aria-controls="mainNavbar" aria-expanded="false" aria-label="Open navigation"><span>Menu</span><span class="premium-menu-lines" aria-hidden="true"><i></i><i></i></span></button></div></div>`;
  const list=header.querySelector('.premium-links');
  for(const link of extra){if([...list.querySelectorAll('a')].some(a=>a.href===link.href))continue;const li=document.createElement('li'),a=document.createElement('a');a.href=link.href;a.textContent=link.textContent.trim();a.className='nav-link';li.append(a);list.append(li);}
  document.getElementById('mobile-menu')?.remove();
  if(previous)previous.replaceWith(header);else document.body.prepend(header);
  document.body.classList.add('kicks-shell');
  if(/\/Pages\/Demo\//i.test(location.pathname))document.body.classList.add('kicks-guide');
  if(document.body.dataset.dashboard)document.body.classList.add('kicks-workspace');
  const menu=header.querySelector('#mobile-menu'),button=header.querySelector('#menu-toggle'),narrow=matchMedia('(max-width:1279px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');let open=false;
  function setMenu(value,restore=false){open=value&&narrow.matches;header.classList.toggle('menu-is-open',open);document.body.classList.toggle('premium-menu-open',open);menu.hidden=narrow.matches&&!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close navigation':'Open navigation');dispatchEvent(new CustomEvent('kicks-navigation-change',{detail:{open}}));if(open)requestAnimationFrame(()=>menu.querySelector('a,button')?.focus());if(restore)button.focus();}
  button.addEventListener('click',()=>setMenu(!open));
  menu.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
  document.addEventListener('click',e=>{if(open&&!header.contains(e.target))setMenu(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){if(document.querySelector('#avatarMenu:not([hidden])'))return;setMenu(false,true);return;}if(e.key!=='Tab'||!open)return;const items=[...header.querySelectorAll('a[href],button:not(:disabled)')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]')),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  narrow.addEventListener('change',()=>setMenu(false));setMenu(false);
  let pending=false;const scrollState=()=>{header.classList.toggle('is-scrolled',scrollY>24);pending=false;};
  addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(scrollState);}},{passive:true});scrollState();
  function ready(){
    window.KicksAuth?.refreshNavigation();
    const theme=document.querySelector('.theme-toggle');if(theme)header.querySelector('[data-theme-control]').append(theme);
    const form=document.getElementById('authForm'),submit=document.getElementById('submitAuth');
    if(form&&submit){const update=()=>form.setAttribute('aria-busy',String(submit.disabled));new MutationObserver(update).observe(submit,{attributes:true,attributeFilter:['disabled']});update();
      if(window.gsap){const motion=gsap.matchMedia();motion.add('(prefers-reduced-motion:no-preference)',()=>{gsap.from('.premium-auth-story > *, .premium-auth-panel .form-wrap',{y:22,opacity:0,duration:.7,stagger:.09,ease:'power3.out',clearProps:'transform,opacity'});});}
    }
    if(!reduced.matches)header.classList.add('nav-ready');
  }
  if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
