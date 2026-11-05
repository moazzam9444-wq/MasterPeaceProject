/* Fixture builder and integrity checks only. Persistence remains the existing KicksStore format. */
(() => {
  'use strict';
  const batch = 'kicks-full-preview-4';
  const collections = ['users','fields','games','tournaments','teams','teamRequests','bookings','memberships','registrations','payments','challenges','challengeRequests','meetings','feedback'];
  const password = 'KicksDemo2026!'; // Public, fictional demo accounts only; never reused for real accounts.
  const positions = ['Goalkeeper','Defender','Midfielder','Forward'];
  const copy = value => structuredClone(value);
  async function build(now = new Date()) {
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const day = offset => new Date(Date.parse(today+'T12:00:00+03:00')+offset*86400000).toISOString().slice(0,10);
    const stamp = (offset,time='12:00') => day(offset)+'T'+time+':00+03:00';
    const d = Object.fromEntries(collections.map(k=>[k,[]]));
    d.settings = {title:'Sample football matchdays',description:'Fictional KICKS sample catalogue. No real people, bookings or payments.',city:'Jordan',contact:'sample@kicks.example.test',commissionRate:10,listingFee:5};
    const add = (kind,row) => {const item={...row,demoBatch:batch};d[kind].push(item);return item;};
    const user = (id,name,role='player',city='Amman',status='Active') => add('users',{id,name:'Sample '+name,email:'sample'+id+'@kicks.example.test',role,status,requestedRole:role,city,phone:'',avatar:'',submittedAt:stamp(-35),salt:id.toString(16).padStart(32,'0'),passwordHash:''});
    user(100,'Administrator','admin');
    user(101,'Rami Nimer','owner','Amman');user(102,'Lina Wadi','owner','Irbid');user(103,'Omar Rimal','owner','Aqaba');
    const teamNames=['Rimal Amman','Zarqa Comets','Irbid Lanterns','Salt Cedars','Capital Owls','Jerash Pines','Madaba Strikers','Aqaba Waves'];
    const cities=['Amman','Zarqa','Irbid','Balqa','Amman','Jerash','Madaba','Aqaba'];
    const given=['Yazan','Laith','Sami','Zaid','Nader','Fadi','Karam'],family=['Nimer','Rimal','Wadi','Sahl','Qamar','Rayan','Joud','Nawras'];
    let playerId=200;
    teamNames.forEach((name,i)=>{
      const format=i===6?'7v7':i===7?'6v6':'5v5',size=i===6?7:6,members=[];
      for(let j=0;j<size;j++){const p=user(playerId++,given[j]+' '+family[i],'player',cities[i]);members.push({userId:p.id,position:positions[j%4]});}
      add('teams',{id:'sample-team-'+(i+1),name:name+' · Sample',captainId:members[0].userId,members,capacity:size+3,format,city:cities[i],area:'Community sports district',level:i%2?'Casual':'Intermediate',bio:'Fictional community squad for testing KICKS team workflows.',schedule:'Friday evenings · 19:00',positions:['Defender','Midfielder'],open:true,color:['forest','navy','clay','purple','gold','teal'][i%6],initials:name.split(' ').map(n=>n[0]).join('').slice(0,2),logo:'',createdAt:stamp(-30)});
    });
    user(260,'Kareem Free Agent');user(261,'Noor Free Agent','player','Irbid');user(262,'Hadi Free Agent','player','Zarqa');
    user(270,'Player Approval Request','player','Amman','Pending');
    const pending=user(271,'Owner Approval Request','owner','Madaba','Pending');
    const proof={name:'fictional-sample-license.pdf',size:36,data:'data:application/pdf;base64,JVBERi0xLjQKJSBTYW1wbGUgcHJvb2YKJSVFT0YK'};
    for(const owner of d.users.filter(u=>u.role==='owner'))owner.ownershipProof=copy(proof);
    pending.requestedRole='owner';
    const locations=[
      ['Rimal Floodlight Arena','Amman','Khalda',28,101,31.994,35.843],['Comet Community Pitch','Zarqa','New Zarqa',24,101,32.071,36.089],
      ['Lantern Football Ground','Irbid','University district',26,102,32.550,35.850],['Cedar Five-a-Side','Balqa','Salt',22,102,32.038,35.729],
      ['Capital Evening Arena','Amman','Tla Al Ali',35,101,31.999,35.871],['Pine Community Ground','Jerash','Sports district',25,102,32.280,35.899],
      ['Mosaic Seven-a-Side','Madaba','City sports district',38,103,31.720,35.794],['Seabreeze Six-a-Side','Aqaba','Residential sports district',30,103,29.532,35.007]
    ];
    locations.forEach(([name,city,area,price,ownerId,latitude,longitude],i)=>add('fields',{id:1001+i,name:name+' · Sample',city,area,price,ownerId,latitude,longitude,type:i===6?'7v7':i===7?'6v6':'5v5',image:i%4+1,rating:4.2+(i%5)/10,description:'Fictional sample pitch: artificial turf, evening floodlights and a community atmosphere. Prices are sample JOD amounts.',amenities:'Artificial turf\nFloodlights\nParking\nChanging rooms\nDrinking water',today:true,now:false,listingFeePaid:5}));
    let paymentId=8000;
    function payment(kind,collection,row,amount,userId,ownerId,refunded=false,listing=false){
      const rate=listing||collection==='registrations'?100:10,commission=Math.round(amount*rate)/100,ownerNet=Math.round((amount-commission)*100)/100;
      if(!listing)Object.assign(row,{price:amount,paymentMethod:amount?'Visa (demo)':'Free',paymentStatus:amount?(refunded?'Refunded (demo)':'Paid (demo)'):'Free',commission,ownerNet});
      if(amount)add('payments',{id:++paymentId,kind,collection,recordId:row.id,userId,ownerId,adminId:100,amount,commission,ownerNet,rate,status:refunded?'Refunded (demo)':'Paid (demo)',createdAt:stamp(-30)});
    }
    d.fields.forEach(f=>payment('Field listing','fields',f,5,f.ownerId,f.ownerId,false,true));
    for(let i=0;i<16;i++){
      const f=d.fields[i%8],status=i<4?'Confirmed':i<6?'Pending':i<8?'Cancelled':i<14?'Completed':'Cancelled';
      const row=add('bookings',{id:5001+i,userId:200+i%6,fieldId:f.id,date:day(i<8?i+2:-(i-5)),time:'18:00',status,createdAt:stamp(-30)});
      payment('Field booking','bookings',row,f.price,row.userId,f.ownerId,status==='Cancelled');
    }
    const squadPlayers=d.users.filter(u=>u.role==='player'&&u.status==='Active'&&u.id<260);
    let membershipId=7000;
    for(let i=0;i<8;i++){
      const f=d.fields[i],g=add('games',{id:2001+i,title:['After-work Five','Friday Floodlights','Community Kickabout','Sunday Friendly'][i%4]+' · Sample',fieldId:f.id,createdBy:f.ownerId,date:day(i<6?i+1:-(i-3)),time:'20:00',durationMinutes:60,capacity:i===6?14:i===7?12:10,joined:0,price:i===3?0:3+i%3,level:i%2?'Casual':'Intermediate'});
      const count=[4,10,7,3,8,5,6,4][i];
      for(let j=0;j<count;j++){
        const p=squadPlayers[(i*6+j)%squadPlayers.length],entry=add('memberships',{id:++membershipId,userId:p.id,gameId:g.id,position:positions[j%4],status:'Joined',createdAt:stamp(-30)});
        g.joined++;payment('Open game','memberships',entry,g.price,p.id,f.ownerId);
      }
    }
    const left=add('memberships',{id:++membershipId,userId:260,gameId:2001,position:'Forward',status:'Left',createdAt:stamp(-30)});
    payment('Open game','memberships',left,d.games[0].price,260,101,true);
    let registrationId=6000;
    const ammanHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Amman',hour:'2-digit',hourCycle:'h23'}).format(now));
    const cups=[['Rimal Community Cup',12,3,8],['Comet Weekend Trophy',18,4,4],['Lantern Matchday Cup',0,4,4],['Cedar Champions Cup',-7,4,4]];
    cups.forEach(([name,offset,count,capacity],i)=>{
      const f=d.fields[i],cup=add('tournaments',{id:3001+i,name:name+' · Sample',fieldId:f.id,createdBy:f.ownerId,date:day(offset),time:i===2?String(ammanHour).padStart(2,'0')+':00':'14:00',durationMinutes:180,fee:20+i*5,teams:count,capacity,system:'Single elimination',level:'Intermediate',prize:'Sample trophy (no cash payout)',description:'Fictional sample knockout cup; all fees and results are simulated.'});
      const entries=[];
      for(let j=0;j<count;j++){
        const t=d.teams[j],captain=d.users.find(u=>u.id===t.captainId),entry=add('registrations',{id:++registrationId,userId:captain.id,teamId:t.id,teamName:t.name,captain:captain.name,email:captain.email,roster:t.members.map(m=>({...m,name:d.users.find(u=>u.id===m.userId).name})),tournamentId:cup.id,status:'Registered',createdAt:stamp(-30)});
        entries.push(entry.id);payment('Tournament','registrations',entry,cup.fee,captain.id,f.ownerId);
      }
      cup.bracket={slots:window.KicksBracketCore.seed(entries),started:i>=2,winners:{}};
      if(i>=2)cup.bracket.winners['0:0']=entries[0];
      if(i===3){cup.bracket.winners['0:1']=entries[1];cup.bracket.winners['1:0']=entries[0];}
    });
    const withdrawnTeam=d.teams[5],withdrawn=add('registrations',{id:++registrationId,userId:withdrawnTeam.captainId,teamId:withdrawnTeam.id,teamName:withdrawnTeam.name,captain:d.users.find(u=>u.id===withdrawnTeam.captainId).name,email:d.users.find(u=>u.id===withdrawnTeam.captainId).email,roster:withdrawnTeam.members.map(m=>({...m,name:d.users.find(u=>u.id===m.userId).name})),tournamentId:3001,status:'Withdrawn',createdAt:stamp(-30)});
    payment('Tournament','registrations',withdrawn,d.tournaments[0].fee,withdrawn.userId,101,true);
    const challengeSpecs=[['Open',2,0,null,'Amman'],['Agreed',9,1,2,'Zarqa'],['Booked',10,0,1,'Amman'],['Booked',-2,2,3,'Zarqa'],['Cancelled',11,3,4,'Balqa'],['Open',-1,4,null,'Amman']];
    challengeSpecs.forEach(([status,offset,host,away,city],i)=>{
      const c=add('challenges',{id:9001+i,teamId:d.teams[host].id,format:'5v5',level:d.teams[host].level,city,date:day(offset),time:'21:00',split:'Half each',note:'Fictional sample friendly; captains confirm arrangements in KICKS.',status,createdAt:stamp(-30)});
      if(away!==null)c.opponentId=d.teams[away].id;
      if(status==='Booked'){
        const f=d.fields[i===2?0:1],teams=[d.teams[host],d.teams[away]],b=add('bookings',{id:5020+i,userId:teams[0].captainId,fieldId:f.id,date:c.date,time:c.time,status:offset<0?'Completed':'Confirmed',challengeId:c.id,teamIds:teams.map(t=>t.id),teamNames:teams.map(t=>t.name),captainIds:teams.map(t=>t.captainId),createdAt:stamp(-30)});
        c.bookingId=b.id;payment('Field booking','bookings',b,f.price,b.userId,f.ownerId);
      }
    });
    add('challengeRequests',{id:9501,challengeId:9001,teamId:d.teams[5].id,note:'Sample squad available for the friendly.',status:'Pending',createdAt:stamp(-20)});
    add('challengeRequests',{id:9502,challengeId:9002,teamId:d.teams[2].id,note:'Sample accepted match request.',status:'Accepted',createdAt:stamp(-20)});
    add('teamRequests',{id:'sample-join-1',teamId:d.teams[0].id,userId:260,position:'Midfielder',message:'Fictional sample request: available for weekly evening football.',status:'pending',createdAt:stamp(-2)});
    add('teamRequests',{id:'sample-leave-1',type:'leave',teamId:d.teams[1].id,userId:d.teams[1].members[5].userId,position:'Defender',message:'Sample leave request awaiting captain approval.',status:'pending',createdAt:stamp(-2)});
    [5,4,5,3].forEach((rating,i)=>add('feedback',{id:11001+i,name:d.users.find(u=>u.id===200+i).name,email:'sample'+(200+i)+'@kicks.example.test',rating,message:['Fictional sample feedback: the pitch lighting made our evening match enjoyable.','Fictional sample feedback: clear directions and helpful booking information.','Fictional sample feedback: our squad enjoyed the community tournament.','Fictional sample feedback: please add clearer arrival instructions.'][i],createdAt:stamp(-3-i)}));
    const messages=[
      [101,200,'Sample message: your pitch booking is confirmed. Please arrive ten minutes early.',false],
      [200,101,'Sample reply: thank you; our squad will arrive before kickoff.',true],
      [100,101,'Sample organiser note: the upcoming community cup is ready for review.',false],
      [101,100,'Sample reply: the briefing time is confirmed.',true],
      [200,d.teams[1].captainId,'Sample rival captain message: our agreed match details are in KICKS.',false],
      [100,260,'Sample welcome: explore teams and request to join a squad.',false]
    ].map(([senderId,recipientId,text,read],i)=>({id:'sample-message-'+i,senderId,recipientId,text,read,createdAt:stamp(-1,'12:'+String(i*5).padStart(2,'0'))}));
    // This conversation follows an agreed challenge between team 1 and team 2.
    messages[4].senderId=d.teams[1].captainId;messages[4].recipientId=d.teams[2].captainId;
    await Promise.all(d.users.map(async u=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(u.salt),iterations:100000,hash:'SHA-256'},key,256);u.passwordHash=Array.from(new Uint8Array(bits),n=>n.toString(16).padStart(2,'0')).join('');}));
    return {data:d,messages,createdAt:now.toISOString()};
  }
  function validate(data,messages=[]) {
    const errors=[],check=(ok,code,detail)=>{if(!ok)errors.push({code,detail});};
    const allIds=new Set();
    for(const k of collections){check(Array.isArray(data[k]),'COLLECTION',k);for(const r of data[k]||[]){check(!allIds.has(String(r.id)),'DUPLICATE_ID',k+':'+r.id);allIds.add(String(r.id));}}
    const lookup=(kind,id)=>(data[kind]||[]).find(r=>r.id===id),player=id=>{const u=lookup('users',id);return u?.role==='player';};
    const slot=(date,time)=>{const n=Date.parse(date+'T'+time+':00+03:00');return Number.isFinite(n)&&new Date(n+10800000).toISOString().slice(0,16)===date+'T'+time;};
    for(const u of data.users){check(['admin','owner','player'].includes(u.role),'ROLE',u.id);check(['Active','Pending','Inactive','Rejected'].includes(u.status),'ACCOUNT_STATE',u.id);check(/^[a-f0-9]{64}$/.test(u.passwordHash||''),'PASSWORD_HASH',u.id);}
    check(new Set(data.users.map(u=>u.email.toLowerCase())).size===data.users.length,'DUPLICATE_EMAIL','users');
    for(const f of data.fields){check(lookup('users',f.ownerId)?.role==='owner','FIELD_OWNER',f.id);check(['5v5','6v6','7v7'].includes(f.type)&&Number.isFinite(f.price)&&f.price>=0,'FIELD_VALUES',f.id);check(f.latitude>=29&&f.latitude<=34&&f.longitude>=34&&f.longitude<=40,'JORDAN_COORDINATES',f.id);}
    const members=new Set();
    for(const t of data.teams){check(t.members.some(m=>m.userId===t.captainId),'CAPTAIN',t.id);check(t.members.length<=t.capacity,'TEAM_CAPACITY',t.id);for(const m of t.members){check(player(m.userId),'TEAM_PLAYER',t.id+':'+m.userId);check(!members.has(m.userId),'MULTIPLE_TEAMS',m.userId);members.add(m.userId);check(positions.includes(m.position),'POSITION',m.userId);}}
    const reservations=[];
    for(const b of data.bookings){check(player(b.userId)&&lookup('fields',b.fieldId),'BOOKING_REFERENCE',b.id);check(slot(b.date,b.time)&&/^(1[0-9]|2[0-2]):00$/.test(b.time),'BOOKING_SLOT',b.id);check(['Pending','Confirmed','Completed','Cancelled'].includes(b.status),'BOOKING_STATE',b.id);if(['Pending','Confirmed','Completed'].includes(b.status))reservations.push({field:b.fieldId,start:Date.parse(b.date+'T'+b.time+':00+03:00'),end:Date.parse(b.date+'T'+b.time+':00+03:00')+3600000,id:'booking '+b.id});if(b.challengeId)check(lookup('challenges',b.challengeId)?.bookingId===b.id,'CHALLENGE_BOOKING',b.id);}
    for(const kind of ['games','tournaments'])for(const event of data[kind]){
      const f=lookup('fields',event.fieldId),u=lookup('users',event.createdBy);check(f&&u&&['owner','admin'].includes(u.role)&& (u.role==='admin'||f.ownerId===u.id),'EVENT_ORGANIZER',event.id);check(slot(event.date,event.time)&&Number.isInteger(event.durationMinutes)&&event.durationMinutes>0,'EVENT_TIME',event.id);
      const coll=kind==='games'?'memberships':'registrations',ref=kind==='games'?'gameId':'tournamentId',active=kind==='games'?'Joined':'Registered',counter=kind==='games'?'joined':'teams';
      const entries=data[coll].filter(r=>r[ref]===event.id&&r.status===active);check(event[counter]===entries.length&&entries.length<=event.capacity,'EVENT_COUNTER',event.id);
      reservations.push({field:event.fieldId,start:Date.parse(event.date+'T'+event.time+':00+03:00'),end:Date.parse(event.date+'T'+event.time+':00+03:00')+event.durationMinutes*60000,id:kind+' '+event.id});
    }
    for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){const a=reservations[i],b=reservations[j];check(a.field!==b.field||a.start>=b.end||b.start>=a.end,'VENUE_OVERLAP',a.id+' / '+b.id);}
    const participation=new Set();
    for(const m of data.memberships){check(player(m.userId)&&lookup('games',m.gameId),'MEMBERSHIP_REFERENCE',m.id);check(positions.includes(m.position),'POSITION',m.id);const k=m.gameId+':'+m.userId;check(!participation.has(k),'DUPLICATE_MEMBERSHIP',k);participation.add(k);}
    for(const r of data.registrations){const t=lookup('teams',r.teamId),cup=lookup('tournaments',r.tournamentId);check(t&&cup&&r.userId===t.captainId&&player(r.userId),'REGISTRATION_REFERENCE',r.id);check(t?.format===lookup('fields',cup?.fieldId)?.type,'REGISTRATION_FORMAT',r.id);check(r.roster.length>=Number(t?.format[0])&&r.roster.every(m=>player(m.userId)),'REGISTRATION_ROSTER',r.id);const k=r.tournamentId+':'+r.teamId;check(!participation.has(k),'DUPLICATE_REGISTRATION',k);participation.add(k);}
    for(const cup of data.tournaments){const bracket=cup.bracket;if(!bracket)continue;const ids=data.registrations.filter(r=>r.tournamentId===cup.id&&r.status==='Registered').map(r=>r.id);check(bracket.slots.filter(Boolean).length===ids.length&&new Set(bracket.slots.filter(Boolean)).size===ids.length&&bracket.slots.filter(Boolean).every(id=>ids.includes(id)),'BRACKET_SLOTS',cup.id);const rounds=window.KicksBracketCore.rounds(bracket);for(const [key,id] of Object.entries(bracket.winners))check(rounds.flat().some(m=>m.key===key&&m.winner===id),'BRACKET_WINNER',cup.id+':'+key);}
    for(const c of data.challenges){const h=lookup('teams',c.teamId),a=c.opponentId?lookup('teams',c.opponentId):null;check(h&&(!c.opponentId||a)&&h?.format===c.format&&(!a||a.format===c.format),'CHALLENGE_REFERENCE',c.id);check(slot(c.date,c.time),'CHALLENGE_TIME',c.id);if(c.bookingId)check(lookup('bookings',c.bookingId)?.challengeId===c.id,'CHALLENGE_BOOKING',c.id);}
    for(const r of data.challengeRequests)check(lookup('challenges',r.challengeId)&&lookup('teams',r.teamId),'CHALLENGE_REQUEST',r.id);
    for(const r of data.teamRequests)check(lookup('teams',r.teamId)&&player(r.userId),'TEAM_REQUEST',r.id);
    for(const m of data.meetings){const cup=lookup('tournaments',m.tournamentId),owner=lookup('users',m.organizerId),start=Date.parse(m.startsAt);check(cup&&owner&&['owner','admin'].includes(owner.role),'MEETING_REFERENCE',m.id);check(Number.isFinite(start)&&start+m.duration*60000<=Date.parse(cup?.date+'T'+cup?.time+':00+03:00'),'MEETING_TIME',m.id);}
    const paidRecords=new Set();
    for(const p of data.payments){const row=lookup(p.collection,p.recordId);check(row&&lookup('users',p.userId)&&lookup('users',p.ownerId)?.role==='owner'&&lookup('users',p.adminId)?.role==='admin','PAYMENT_REFERENCE',p.id);check(p.amount>=0&&Math.abs(p.amount-p.commission-p.ownerNet)<.001&&Math.abs(p.commission-Math.round(p.amount*p.rate)/100)<.001,'PAYMENT_SPLIT',p.id);const k=p.collection+':'+p.recordId;check(!paidRecords.has(k),'DUPLICATE_PAYMENT',k);paidRecords.add(k);if(p.collection!=='fields')check(row?.paymentStatus===p.status&&row?.price===p.amount,'PAYMENT_STATE',p.id);}
    for(const k of ['bookings','memberships','registrations'])for(const r of data[k])if(['Paid (demo)','Refunded (demo)'].includes(r.paymentStatus))check(paidRecords.has(k+':'+r.id),'MISSING_PAYMENT',k+':'+r.id);
    for(const m of messages){check(lookup('users',m.senderId)&&lookup('users',m.recipientId),'MESSAGE_REFERENCE',m.id);check(!allIds.has(m.id),'DUPLICATE_ID',m.id);allIds.add(m.id);}
    return {valid:errors.length===0,errors,counts:Object.fromEntries(collections.map(k=>[k,data[k].length])),messages:messages.length};
  }
  window.KicksDemoCatalogue={batch,collections,password,build,validate};
})();
