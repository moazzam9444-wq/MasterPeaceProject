// Pure bracket projection. Registration IDs preserve legacy entries as well as teams.
(() => {
  function seed(ids) {
    if(ids.length<2)return ids.slice();
    const size=2**Math.ceil(Math.log2(ids.length)), slots=Array(size).fill(null), half=size/2;
    ids.forEach((id,i)=>slots[i<half?i*2:(i-half)*2+1]=id);
    return slots;
  }
  function rounds(bracket) {
    const result=[];
    let sources=bracket.slots.map(id=>({id,ready:true})), round=0;
    while(sources.length>1){
      const matches=[];
      for(let i=0;i<sources.length;i+=2){
        const a=sources[i],b=sources[i+1],key=round+':'+i/2;
        const ready=a.ready&&b.ready, bye=ready&&(!a.id||!b.id);
        const selected=bracket.winners[key];
        const winner=ready?(bye?(a.id||b.id):([a.id,b.id].includes(selected)?selected:null)):null;
        matches.push({key,a,b,ready,bye,winner});
      }
      result.push(matches);sources=matches.map(m=>({id:m.winner,ready:m.bye||!!m.winner}));round++;
    }
    return result;
  }
  window.KicksBracketCore={seed,rounds};
})();
