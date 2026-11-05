/* Native page-scroll stacking. No wheel handlers, scroll containers or storage. */
(() => {
 'use strict';
 const section=document.querySelector('#how.kickoff-stack');
 if(!section) return;
 const cards=[...section.querySelectorAll('.kickoff-card')];
 const surfaces=cards.map(card=>card.querySelector('.kickoff-surface'));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const short=matchMedia('(max-height:650px)');
 let frame=0;
 function render(){
  frame=0;
  const enabled=!reduce.matches&&!short.matches;
  const rects=cards.map(card=>card.getBoundingClientRect());
  const tops=cards.map(card=>parseFloat(getComputedStyle(card).top)||0);
  surfaces.forEach((surface,i)=>{
   let depth=0;
   if(enabled) for(let j=i+1;j<cards.length;j++) depth+=Math.max(0,Math.min(1,1-(rects[j].top-tops[j])/Math.max(1,rects[j].height)));
   surface.style.transform=`scale(${Math.max(.85,1-depth*.05)})`;
   surface.style.setProperty('--kickoff-dim',String(Math.min(.2,depth*.1)));
  });
 }
 const schedule=()=>{if(!frame) frame=requestAnimationFrame(render);};
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',schedule,{passive:true});
 reduce.addEventListener('change',schedule);short.addEventListener('change',schedule);
 const observer=new ResizeObserver(schedule);cards.forEach(card=>observer.observe(card));
 schedule();
})();
