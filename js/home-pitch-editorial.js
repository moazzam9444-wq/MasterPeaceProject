/* Rebind only newly rendered pitch elements; do not modify catalogue records. */
(() => {
 'use strict';
 const grid=document.querySelector('#home-fields-grid');
 if(!grid)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let context=null;
 function reveal(){
  context?.revert();context=null;
  if(reduced.matches||!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  context=gsap.context(()=>{
   const cards=[...grid.querySelectorAll('.pitch-editorial')];
   cards.forEach((card,index)=>gsap.from(card,{y:24,opacity:0,duration:.65,delay:(index%2)*.1,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:card,start:'top 94%',once:true}}));
  },grid);
 }
 document.addEventListener('kicks:home-rendered',reveal);
 reduced.addEventListener('change',reveal);
 reveal();
})();
