/* Apply the existing saved preference synchronously before paint. */
(() => {
  'use strict';
  const system=matchMedia('(prefers-color-scheme: dark)');
  let choice,toggle;
  try{choice=localStorage.getItem('kicks-theme');}catch{}
  if(!['light','dark'].includes(choice))choice=null;
  const theme=()=>choice||(system.matches?'dark':'light');
  function apply(){
    const value=theme();document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;
    if(toggle){toggle.setAttribute('aria-label',value==='dark'?'Switch to light mode':'Switch to dark mode');toggle.setAttribute('aria-pressed',String(value==='dark'));toggle.querySelector('.theme-label').textContent=value==='dark'?'Dark':'Light';}
    dispatchEvent(new CustomEvent('kicks-theme-change',{detail:{theme:value}}));
  }
  function set(value){choice=['light','dark'].includes(value)?value:null;try{if(choice)localStorage.setItem('kicks-theme',choice);else localStorage.removeItem('kicks-theme');}catch{}apply();}
  apply();window.KicksTheme={set,get:theme};
  document.addEventListener('DOMContentLoaded',()=>{
    toggle=document.createElement('button');toggle.type='button';toggle.className='theme-toggle';
    toggle.innerHTML='<span class="theme-orbit" aria-hidden="true"><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/></svg></span><span class="theme-label"></span><span class="theme-track" aria-hidden="true"><i></i></span>';
    toggle.addEventListener('click',()=>set(theme()==='dark'?'light':'dark'));
    (document.querySelector('[data-theme-control]')||document.querySelector('#mainNavbar, .dash-top, .auth-top')||document.body).append(toggle);apply();
  },{once:true});
  system.addEventListener('change',()=>{if(!choice)apply();});
  addEventListener('storage',e=>{if(e.key!=='kicks-theme'&&e.key!==null)return;choice=['light','dark'].includes(e.newValue)?e.newValue:null;apply();});
})();
