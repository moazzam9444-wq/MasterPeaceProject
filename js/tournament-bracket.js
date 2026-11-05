(() => {
  const S=KicksStore, id=Number(new URLSearchParams(location.search).get('id'));
  const host=document.getElementById('tournamentBracket');
  if(!host || !S.find('tournaments',id))return;
  let dragged=null;
  function connectors(){
    const tree=host.querySelector('.bracket-tree');if(!tree)return;
    tree.querySelector('.bracket-lines')?.remove();
    const base=tree.getBoundingClientRect(),columns=[...tree.querySelectorAll('.bracket-round')];
    const paths=[];
    columns.slice(0,-1).forEach((col,r)=>[...col.querySelectorAll('.bracket-match')].forEach((match,i)=>{
      const from=match.getBoundingClientRect(),to=columns[r+1].querySelectorAll('.bracket-match')[Math.floor(i/2)].getBoundingClientRect();
      const x=from.right-base.left,y=from.top+from.height/2-base.top,end=to.left-base.left,endY=to.top+to.height/2-base.top,mid=(x+end)/2;
      paths.push(`<path d="M${x} ${y}H${mid}V${endY}H${end}"/>`);
    }));
    tree.insertAdjacentHTML('afterbegin',`<svg class="bracket-lines" aria-hidden="true" width="${tree.scrollWidth}" height="${tree.scrollHeight}">${paths.join('')}</svg>`);
  }
  async function act(action,values){try{(await S.tournamentBracket(id,action,values));render();if(action==='start')location.reload();}catch(error){host.querySelector('[role=status]').textContent=error.message;}}
  function render(){
    host.hidden=!!document.getElementById('cupContent')?.hidden || !S.tournamentAccess(id).view;
    if(host.hidden){host.replaceChildren();return;}
    const {bracket,entries,manage:accessManage,rounds}=S.tournamentBracket(id);
    const cancelled=S.find('tournaments',id).status==='Cancelled',manage=accessManage&&!cancelled;
    const name=entryId=>S.escape(entries.find(e=>e.id===entryId)?.teamName||'Team');
    const champion=rounds.at(-1)?.[0]?.winner;
    host.innerHTML=`<header class="bracket-heading"><div><p class="bracket-eyebrow">THE ROAD TO THE TROPHY</p><h2>Tournament bracket<span>.</span></h2><p>${entries.length} registered teams · Single elimination · ${bracket.started?'Draw locked':'Live draw preview'}</p></div><span class="bracket-status">${champion?'Champion crowned':bracket.started?'In progress':'Preparing the draw'}</span></header>
      ${manage?`<div class="bracket-toolbar"><div><strong>${bracket.started?'You control the matchday.':'Set the stage.'}</strong><p>${bracket.started?'Drag a team to its connected winner slot, or use its advance button. Changing a winner clears later results on that path.':'Shuffle the registered teams, then start when the draw is ready. Starting locks entries and the draw.'}</p></div><div class="bracket-actions"><button type="button" data-bracket-action="shuffle" ${bracket.started||entries.length<2?'disabled':''}>↻ Shuffle draw</button>${!bracket.started?'<button type="button" class="bracket-primary" data-bracket-action="start" '+(entries.length<2?'disabled':'')+'>Start tournament ↗</button>':''}</div></div>`:'<p class="bracket-help">Follow every matchup and the organiser’s confirmed winners. Empty places receive an automatic bye.</p>'}
      <p class="bracket-feedback" role="status" aria-live="polite"></p>
      ${entries.length<2?'<div class="bracket-empty"><span>🏆</span><h3>The stage is waiting.</h3><p>The bracket appears when at least two teams register.</p></div>':`<div class="bracket-scroll" tabindex="0" role="region" aria-label="Tournament elimination tree; scroll horizontally to see all rounds"><div class="bracket-tree">${rounds.map((matches,r)=>`<section class="bracket-round"><h3>${r===rounds.length-1?'Final':r===rounds.length-2?'Semi-finals':r===rounds.length-3?'Quarter-finals':'Round of '+matches.length*2}<small>${matches.length} ${matches.length===1?'match':'matches'}</small></h3><div class="bracket-matches">${matches.map((m,i)=>`<article class="bracket-match"><div class="bracket-match-label">MATCH ${i+1}${m.bye?' · AUTO BYE':''}</div>${[m.a,m.b].map((entry,index)=>`<div ${r>0&&manage&&bracket.started?`data-drop-match="${r-1}:${i*2+index}" data-droppable="true"`:""} class="bracket-team ${entry.id===m.winner?'is-winner':''} ${!entry.id?'is-empty':''}" ${entry.id&&manage&&bracket.started&&m.ready&&!m.bye?`draggable="true" data-drag-entry="${entry.id}" data-drag-match="${m.key}"`:''}><span class="bracket-seed">${index+1}</span><strong dir="auto">${entry.id?name(entry.id):entry.ready?'BYE':'Awaiting winner'}</strong>${entry.id&&manage&&bracket.started&&m.ready&&!m.bye?`<button type="button" data-advance="${entry.id}" data-match="${m.key}" aria-label="Advance ${name(entry.id)}">↑</button>`:''}</div>`).join('')}<div class="bracket-drop ${m.winner?'has-winner':''}" data-drop-match="${m.key}" ${manage&&bracket.started&&!m.bye&&m.ready?'data-droppable="true"':''}><small>${m.bye?'AUTOMATIC QUALIFIER':r===rounds.length-1?'CHAMPION':'ADVANCES'}</small><strong dir="auto">${m.winner?name(m.winner):'Drop winner here'}</strong></div></article>`).join('')}</div></section>`).join('')}<section class="bracket-trophy"><span>🏆</span><p>THE CHAMPIONS</p><h3 dir="auto">${champion?name(champion):'Who will lift it?'}</h3><small>${champion?'Tournament winner':'One team. One trophy.'}</small></section></div></div>`}`;
    if(cancelled){host.querySelector('.bracket-status').textContent='Cancelled · refunds issued';host.querySelector('.bracket-help').textContent='Tournament cancelled. This draw is retained as read-only history.';}
    requestAnimationFrame(connectors);
  }
  host.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.bracketAction)(await act(b.dataset.bracketAction));if(b.dataset.advance)(await act('advance',{match:b.dataset.match,entryId:Number(b.dataset.advance)}));});
  host.addEventListener('dragstart',e=>{const team=e.target.closest('[data-drag-entry]');if(!team)return;dragged={match:team.dataset.dragMatch,entryId:Number(team.dataset.dragEntry)};e.dataTransfer.setData('text/plain',JSON.stringify(dragged));e.dataTransfer.effectAllowed='move';});
  host.addEventListener('dragover',e=>{const slot=e.target.closest('[data-droppable]');if(slot&&dragged?.match===slot.dataset.dropMatch){e.preventDefault();e.dataTransfer.dropEffect='move';slot.classList.add('drag-over');}});
  host.addEventListener('dragleave',e=>e.target.closest('[data-droppable]')?.classList.remove('drag-over'));
  host.addEventListener('drop',async e=>{const slot=e.target.closest('[data-droppable]');if(!slot)return;e.preventDefault();if(dragged?.match===slot.dataset.dropMatch)(await act('advance',dragged));dragged=null;});
  host.addEventListener('dragend',()=>{dragged=null;host.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over'));});
  window.addEventListener('storage',()=>render());
  window.addEventListener('resize',connectors);
  window.addEventListener('kicks-data-change',()=>render());
  window.addEventListener('kicks-account-change',()=>render());
  S.watchActivityClock(render);
  render();
})();
