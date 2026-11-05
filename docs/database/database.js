/* SQL, dictionaries and both diagrams are projected from database-data.js. */
(() => {
 const D=typeof module!=='undefined'&&module.exports?require('./database-data.js'):window.KICKS_DATABASE;
 const q=name=>'['+name+']',literal=s=>"N'"+String(s).replaceAll("'","''")+"'";
 function validate(){
  const names=new Set(D.tables.map(t=>t.name));if(names.size!==D.tables.length)throw Error('Duplicate table');
  const layout=D.LAYOUT.flat();if(layout.length!==names.size || new Set(layout).size!==layout.length || layout.some(n=>!names.has(n)))throw Error('Invalid LAYOUT');
  for(const t of D.tables){
   if(!D.groups.some(g=>g.id===t.group))throw Error('Unknown group '+t.name);
   if(!t.columns.some(c=>c.pk)||new Set(t.columns.map(c=>c.name)).size!==t.columns.length)throw Error('Invalid columns '+t.name);
   for(const c of t.columns.filter(c=>c.fk))if(!D.relationships.some(r=>r.fromTable===t.name&&(r.fromColumns||[r.column]).includes(c.name)))throw Error('Missing relationship '+t.name+'.'+c.name);
   for(const keys of t.unique||[])for(const n of keys)if(!t.columns.some(c=>c.name===n))throw Error('Unknown unique column');
   for(const c of t.columns)for(const flag of ['pk','fk','uq','null'])if(typeof c[flag]!=='boolean')throw Error('Missing column flag '+t.name+'.'+c.name);
   for(const index of t.indexes||[])if(!index.columns.length||index.columns.some(n=>!t.columns.some(c=>c.name===n)))throw Error('Invalid index '+t.name);
  }
  for(const r of D.relationships){const a=D.tables.find(t=>t.name===r.fromTable),b=D.tables.find(t=>t.name===r.toTable);if(!a||!b)throw Error('Unknown relationship table');const source=r.fromColumns||[r.column],target=r.toColumns||[r.toColumn];if(source.length!==target.length)throw Error('Invalid FK arity');source.forEach((n,i)=>{const from=a.columns.find(c=>c.name===n),to=b.columns.find(c=>c.name===target[i]);if(!from||!to||!from.fk||from.type!==to.type)throw Error('Invalid FK columns '+r.fromTable);});const keys=[b.columns.filter(c=>c.pk).map(c=>c.name),...b.columns.filter(c=>c.uq).map(c=>[c.name]),...(b.unique||[])];if(!keys.some(key=>key.length===target.length&&key.every((n,i)=>n===target[i])))throw Error('FK target is not a candidate key '+r.toTable);for(const cardinality of [r.fromCardinality,r.toCardinality])if(!['one','zeroOne','many','zeroMany'].includes(cardinality))throw Error('Unknown cardinality');if(!r.label)throw Error('Missing relationship verb');}
  return {tables:D.tables.length,columns:D.tables.reduce((n,t)=>n+t.columns.length,0),relationships:D.relationships.length};
 }
 function orderedTables(){const pending=new Set(D.tables.map(t=>t.name)),result=[];while(pending.size){let moved=false;for(const name of [...pending])if(!D.relationships.some(r=>r.fromTable===name&&r.toTable!==name&&pending.has(r.toTable))){result.push(D.tables.find(t=>t.name===name));pending.delete(name);moved=true;}if(!moved)throw Error('Cyclic table dependency');}return result;}
 function sql(){
  validate();const lines=['-- '+D.project+' · '+D.engine,'-- Generated from database-data.js. Execute in a NEW, empty database.','-- No DROP, no seeded users, no card data. Authorization rules are documented separately.','SET ANSI_NULLS ON;','SET QUOTED_IDENTIFIER ON;','SET ANSI_PADDING ON;','SET ANSI_WARNINGS ON;','SET CONCAT_NULL_YIELDS_NULL ON;','SET ARITHABORT ON;','SET NUMERIC_ROUNDABORT OFF;','SET XACT_ABORT ON;','BEGIN TRY','BEGIN TRANSACTION;',''];
  for(const t of orderedTables()){
   lines.push('-- '+t.description);const definitions=t.columns.map(c=>'    '+q(c.name)+' '+(c.computed?'AS ('+c.computed+') PERSISTED':c.type+(c.name==='id'&&c.pk&&c.identity!==false?' IDENTITY(1,1)':'')+(c.null?' NULL':' NOT NULL')+(c.default!==undefined?' DEFAULT ('+c.default+')':'')));
   definitions.push('    CONSTRAINT '+q('PK_'+t.name)+' PRIMARY KEY ('+t.columns.filter(c=>c.pk).map(c=>q(c.name)).join(', ')+')');
   for(const cols of [...t.columns.filter(c=>c.uq).map(c=>[c.name]),...(t.unique||[])])definitions.push('    CONSTRAINT '+q(('UQ_'+t.name+'_'+cols.join('_')).slice(0,125))+' UNIQUE ('+cols.map(q).join(', ')+')');
   for(const c of t.columns){if(c.check)definitions.push('    CONSTRAINT '+q('CK_'+t.name+'_'+c.name)+' CHECK ('+c.check+')');if(c.enum)definitions.push('    CONSTRAINT '+q('CK_'+t.name+'_'+c.name+'_enum')+' CHECK ('+q(c.name)+' IN ('+c.enum.map(literal).join(', ')+'))');}
   (t.checks||[]).forEach((check,i)=>definitions.push('    CONSTRAINT '+q('CK_'+t.name+'_rule_'+(i+1))+' CHECK ('+check+')'));
   D.relationships.filter(r=>r.fromTable===t.name).forEach((r,i)=>definitions.push('    CONSTRAINT '+q(('FK_'+t.name+'_'+(r.fromColumns||[r.column]).join('_')+'_'+i).slice(0,125))+' FOREIGN KEY ('+(r.fromColumns||[r.column]).map(q).join(', ')+') REFERENCES [dbo].'+q(r.toTable)+' ('+(r.toColumns||[r.toColumn]).map(q).join(', ')+') ON DELETE NO ACTION'));
   lines.push('CREATE TABLE [dbo].'+q(t.name)+' (\n'+definitions.join(',\n')+'\n);','');
   const indexes=[...(t.indexes||[])];
   for(const c of t.columns.filter(c=>c.fk))if(!(c.pk&&t.columns.filter(k=>k.pk).length===1)&&!c.uq&&!indexes.some(i=>i.columns[0]===c.name))indexes.push({columns:[c.name]});
   indexes.forEach((index,i)=>lines.push('CREATE '+(index.unique?'UNIQUE ':'')+'INDEX '+q(('IX_'+t.name+'_'+i).slice(0,125))+' ON [dbo].'+q(t.name)+' ('+index.columns.map(q).join(', ')+')'+(index.where?' WHERE '+index.where:'')+';'));
   lines.push('');
  }
  lines.push('COMMIT TRANSACTION;','END TRY','BEGIN CATCH','    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;','    THROW;','END CATCH;');return lines.join('\n');
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={validate,sql,orderedTables};return;}
 validate();const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
 const el=(tag,attrs={},parent)=>{const node=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);parent?.append(node);return node;};
 const txt=(parent,text,x,y,cls,extra={})=>{const node=el('text',{x,y,class:cls,...extra},parent);node.textContent=text;return node;};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const metrics=validate(),script=sql(),diagrams={};let active='er',selected=null,hovered=null;
 const measure=document.createElement('canvas').getContext('2d');measure.font='12px monospace';const width=s=>measure.measureText(s).width;
 $('engine').textContent=D.engine;$('description').textContent=D.description;
 $('stats').innerHTML=Object.entries(metrics).map(([name,n])=>`<span><strong>${n}</strong>${name}</span>`).join('');
 D.groups.forEach(g=>{const span=document.createElement('span');const svg=el('svg',{viewBox:'0 0 10 10'});el('circle',{cx:5,cy:5,r:5,fill:g.color},svg);span.append(svg,document.createTextNode(g.name));$('legend').append(span);});
 $('sql-code').textContent=script;
 const refs=name=>({out:D.relationships.filter(r=>r.fromTable===name),in:D.relationships.filter(r=>r.toTable===name)});
 const uniqueNames=rows=>[...new Set(rows)];
 function description(name){const r=refs(name);return `${name} · Points to: ${uniqueNames(r.out.map(r=>r.toTable)).join(', ')||'none'} · Referenced by: ${uniqueNames(r.in.map(r=>r.fromTable)).join(', ')||'none'}`;}
 function keyChips(c){return ['pk','fk','uq'].filter(k=>c[k]).map(k=>`<span class="flag">${k.toUpperCase()}</span>`).join('')+(c.null?'<span class="flag">NULL</span>':'');}
 $('table-cards').innerHTML=D.groups.map(g=>`<section class="card-section"><h2>${escape(g.name)}</h2><div class="cards">${D.tables.filter(t=>t.group===g.id).map(t=>{const r=refs(t.name),link=names=>uniqueNames(names).map(n=>`<a href="#table-${n}">${escape(n)}</a>`).join(', ')||'none';return `<article class="table-card" id="table-${t.name}"><h3>${escape(t.name)}</h3><p>${escape(t.description)}</p><div class="table-scroll"><table><thead><tr><th>Keys</th><th>Column</th><th>Type</th></tr></thead><tbody>${t.columns.map(c=>`<tr><td>${keyChips(c)}</td><td><code>${escape(c.name)}</code>${c.computed?' · computed':''}</td><td><code>${escape(c.type)}</code></td></tr>`).join('')}</tbody></table></div><div class="links-footer"><strong>Points to:</strong> ${link(r.out.map(r=>r.toTable))}<br><strong>Referenced by:</strong> ${link(r.in.map(r=>r.fromTable))}</div></article>`;}).join('')}</div></section>`).join('');
 $('rule-cards').innerHTML=D.rules.map(r=>`<article class="rule"><small>${escape(r.scope)}</small><h3>${escape(r.title)}</h3><p>${escape(r.detail)}</p></article>`).join('');
 $('status-rows').innerHTML=D.statuses.map(s=>`<tr><td>${escape(s.entity)}</td><td>${escape(s.stored)}</td><td>${escape(s.shown)}</td></tr>`).join('');
 $('sources').innerHTML=D.sources.map(s=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></li>`).join('');
 function mark(parent,x,y,dir,card){const g=el('g',{class:'cardinality'},parent),at=n=>x+dir*n,line=(a,b,c,d)=>el('path',{d:`M${a},${b}L${c},${d}`,fill:'none'},g);if(card==='many'||card==='zeroMany'){for(const delta of [-6,0,6])line(x,y+delta,at(12),y);}else line(at(6),y-6,at(6),y+6);if(card==='zeroOne'||card==='zeroMany')el('circle',{cx:at(19),cy:y,r:3.3},g);else line(at(17),y-6,at(17),y+6);}
 function draw(mode){
  const viewport=$(mode+'-viewport'),svg=el('svg',{role:'group','aria-label':mode==='er'?'KICKS entity relationships':'KICKS detailed SQL schema'});viewport.replaceChildren(svg);const boxes={},nodes={},edges=[],columnWidths=[];
  D.LAYOUT.forEach((names,i)=>columnWidths[i]=Math.max(...names.map(name=>{const t=D.tables.find(t=>t.name===name);return mode==='er'?Math.max(290,width(name)+55,width(`${t.columns.length} columns · PK ${t.columns.filter(c=>c.pk).map(c=>c.name).join(' + ')}`)+40):Math.max(390,width(name)+55,...t.columns.map(c=>width(c.name)+width(c.type)+145));})));
  let x=70,maxY=0;
  D.LAYOUT.forEach((names,col)=>{let y=60;names.forEach(name=>{const t=D.tables.find(t=>t.name===name),height=mode==='er'?100:52+t.columns.length*29;boxes[name]={x,y,w:columnWidths[col],h:height,col,table:t};maxY=Math.max(maxY,y+height);y+=height+64;});x+=columnWidths[col]+190;});
  const W=x+60,H=maxY+70,edgeLayer=el('g',{},svg),nodeLayer=el('g',{},svg);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const occurrences=new Map(),portCounts=new Map();
  for(const r of D.relationships)for(const source of [true,false]){const box=boxes[source?r.fromTable:r.toTable],target=boxes[source?r.toTable:r.fromTable],cols=source?(r.fromColumns||[r.column]):(r.toColumns||[r.toColumn]),row=box.table.columns.findIndex(c=>c.name===cols[0]),side=target.col===box.col||target.x>box.x?'right':'left',key=box.table.name+':'+row+':'+side;portCounts.set(key,(portCounts.get(key)||0)+1);}
  function port(box,key,target,source,number){const side=target.col===box.col||target.x>box.x?'right':'left';let y;if(mode==='schema'){const cols=source?(key.fromColumns||[key.column]):(key.toColumns||[key.toColumn]);const row=box.table.columns.findIndex(c=>c.name===cols[0]);const bucket=box.table.name+':'+row+':'+side;const offset=occurrences.get(bucket)||0;occurrences.set(bucket,offset+1);y=box.y+52+row*29-9+20*(offset+1)/((portCounts.get(bucket)||1)+1);}else{const connected=D.relationships.filter(r=>r.fromTable===box.table.name||r.toTable===box.table.name),index=connected.indexOf(key);y=box.y+44+(index+1)*(box.h-48)/(connected.length+1);if(box===target)y=box.y+(source?58:84);}return {x:side==='right'?box.x+box.w:box.x,y,dir:side==='right'?1:-1};}
  D.relationships.forEach((r,i)=>{
   const a=boxes[r.fromTable],b=boxes[r.toTable],from=port(a,r,b,true,i),to=port(b,r,a,false,i),g=el('g',{class:'relationship','data-from':r.fromTable,'data-to':r.toTable},edgeLayer);
   let d,labelX,labelY;if(a.col===b.col){const loop=Math.max(from.x,to.x)+48+(i%7)*14;d=`M${from.x},${from.y} C${loop},${from.y} ${loop},${to.y} ${to.x},${to.y}`;labelX=(from.x+to.x)/8+loop*.75;labelY=(from.y+to.y)/2-7;}else{const bend=Math.max(60,Math.abs(to.x-from.x)*.48);d=`M${from.x},${from.y} C${from.x+from.dir*bend},${from.y} ${to.x+to.dir*bend},${to.y} ${to.x},${to.y}`;labelX=(from.x+to.x)/2;labelY=(from.y+to.y)/2-7;}
   el('path',{d,class:'edge'},g);mark(g,from.x,from.y,from.dir,r.fromCardinality);mark(g,to.x,to.y,to.dir,r.toCardinality);const label=txt(g,r.label,labelX,labelY,'verb');edges.push({group:g,label,r});
  });
  for(const [name,b]of Object.entries(boxes)){
   const t=b.table,g=el('g',{class:'node',tabindex:0,role:'button','aria-label':`${name}, ${t.columns.length} columns. Select relationships.`,'aria-pressed':'false','data-table':name},nodeLayer);nodes[name]=g;
   el('rect',{x:b.x,y:b.y,width:b.w,height:b.h,rx:9,class:'box'},g);el('path',{d:`M${b.x+9},${b.y}H${b.x+b.w-9}Q${b.x+b.w},${b.y} ${b.x+b.w},${b.y+9}V${b.y+40}H${b.x}V${b.y+9}Q${b.x},${b.y} ${b.x+9},${b.y}`,fill:D.groups.find(k=>k.id===t.group).color},g);txt(g,name,b.x+15,b.y+26,'heading');
   if(mode==='er'){txt(g,`${t.columns.length} columns · PK ${t.columns.filter(c=>c.pk).map(c=>c.name).join(' + ')}`,b.x+14,b.y+67,'summary');}
   else t.columns.forEach((c,i)=>{const y=b.y+52+i*29;el('line',{x1:b.x,x2:b.x+b.w,y1:y+15,y2:y+15,class:'row-line'},g);let cx=b.x+10;for(const flag of ['pk','fk','uq'].filter(k=>c[k])){el('rect',{x:cx,y:y-9,width:23,height:15,rx:3,class:'chip-bg'},g);txt(g,flag.toUpperCase(),cx+4,y+2,'chip');cx+=26;}txt(g,c.name+(c.null?' ?':''),b.x+96,y+3,'column');txt(g,c.type,b.x+b.w-12,y+3,'type',{'text-anchor':'end'});});
   const choose=()=>{selected=selected===name?null:name;hovered=null;highlight();};g.addEventListener('click',event=>{event.stopPropagation();choose();});g.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();choose();}});g.addEventListener('pointerenter',()=>{if(!selected){hovered=name;highlight();}});g.addEventListener('pointerleave',()=>{hovered=null;highlight();});
  }
  svg.addEventListener('click',()=>{selected=null;hovered=null;highlight();});
  diagrams[mode]={svg,viewport,W,H,nodes,edges,scale:1,manual:false};fit(mode);highlight();
 }
 function highlight(){const name=selected||hovered;for(const diagram of Object.values(diagrams)){const connected=new Set([name]);diagram.edges.forEach(({r})=>{if(r.fromTable===name)connected.add(r.toTable);if(r.toTable===name)connected.add(r.fromTable);});for(const [n,g]of Object.entries(diagram.nodes)){g.classList.toggle('selected',n===name);g.classList.toggle('dimmed',!!name&&!connected.has(n));g.setAttribute('aria-pressed',String(n===selected));}diagram.edges.forEach(({group,label,r})=>{group.toggleAttribute('hidden',$('hide-hub').checked&&(r.fromTable===D.hub||r.toTable===D.hub));label.toggleAttribute('hidden',!$('show-labels').checked);const related=r.fromTable===name||r.toTable===name;group.classList.toggle('active',!!name&&related);group.classList.toggle('dimmed',!!name&&!related);});}
  $('diagram-info').textContent=name?description(name):'Select a table to explore its relationships. Click empty space to clear.';
  const count=D.relationships.filter(r=>!$('hide-hub').checked||(r.fromTable!==D.hub&&r.toTable!==D.hub)).length;$('link-count').textContent=`(${count} / ${D.relationships.length} links)`;
 }
 function scale(mode,value){const d=diagrams[mode];d.scale=Math.max(.08,Math.min(2.5,value));d.svg.setAttribute('width',Math.ceil(d.W*d.scale));d.svg.setAttribute('height',Math.ceil(d.H*d.scale));if(active===mode)$('zoom-level').textContent=Math.round(d.scale*100)+'%';}
 function fit(mode=active){const d=diagrams[mode];if(!d)return;scale(mode,Math.min((d.viewport.clientWidth-40)/d.W,(d.viewport.clientHeight-40)/d.H));d.viewport.scrollTo(0,0);}
 function switchTab(name){active=name;for(const button of document.querySelectorAll('[data-view]')){const on=button.dataset.view===name;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;$('panel-'+button.dataset.view).hidden=!on;}const diagram=['er','schema'].includes(name);for(const id of ['diagram-controls','legend','diagram-help','diagram-info'])$(id).hidden=!diagram;if(diagram){if(!diagrams[name])draw(name);else if(!diagrams[name].manual)fit(name);else scale(name,diagrams[name].scale);}}
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.view)));
 document.querySelector('.tabs').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('[data-view]')],i=tabs.indexOf(document.activeElement);if(i<0)return;let n;if(event.key==='ArrowRight')n=(i+1)%tabs.length;if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(event.key==='Home')n=0;if(event.key==='End')n=tabs.length-1;if(n!==undefined){event.preventDefault();tabs[n].click();tabs[n].focus();}});
 $('hide-hub').addEventListener('change',highlight);$('show-labels').addEventListener('change',highlight);
 for(const [id,factor]of [['zoom-in',1.25],['zoom-out',.8]])$(id).addEventListener('click',()=>{const d=diagrams[active];d.manual=true;scale(active,d.scale*factor);});
 $('fit').addEventListener('click',()=>{diagrams[active].manual=false;fit();});window.addEventListener('resize',()=>{if(diagrams[active]&&!diagrams[active].manual)fit();});
 $('copy-sql').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(script);$('sql-status').textContent='SQL copied to clipboard.';}catch{let area=document.querySelector('.copy-fallback');if(!area){area=document.createElement('textarea');area.className='copy-fallback';area.setAttribute('aria-label','SQL for manual copy');$('sql-status').after(area);}area.value=script;area.focus();area.select();$('sql-status').textContent='Clipboard access unavailable. The script is selected; press Ctrl+C or copy manually.';}});
 $('download-sql').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([script],{type:'application/sql;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='KICKS-v2-SQLServer.sql';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('sql-status').textContent='SQL download prepared.';});
 switchTab('er');
})();
