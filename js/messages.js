// Local direct messages shared by accounts in this browser.
(() => {
  const key = 'kicks-messages-v1';
  let selected = Number(new URLSearchParams(location.search).get('contact')) || null;
  const drafts = new Map();
  const esc = KicksStore.escape;
  function current() {
    const user = KicksAuth.current();
    if (!user) throw Error('Please log in to use messages.');
    return user;
  }
  function all() {
    try { const rows = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(rows)) throw Error(); return rows; }
    catch { throw Error('Messages could not be loaded. Please try again.'); }
  }
  // Contacts follow booking relationships in both directions.
  function canContact(user, other) {
    if (!other || user.id === other.id) return false;
    if (user.role === 'admin' || other.role === 'admin') return true;
    if(user.role==='player'&&other.role==='player'){
      const teams=KicksStore.list('teams');
      if(KicksStore.list('challenges').some(c=>['Agreed','Awaiting payment','Booked','Completed'].includes(KicksStore.challengeStatus(c)) && [teams.find(t=>t.id===c.teamId)?.captainId,teams.find(t=>t.id===c.opponentId)?.captainId].includes(user.id) && [teams.find(t=>t.id===c.teamId)?.captainId,teams.find(t=>t.id===c.opponentId)?.captainId].includes(other.id)))return true;
    }
    const player = user.role === 'player' ? user : other.role === 'player' ? other : null;
    const owner = user.role === 'owner' ? user : other.role === 'owner' ? other : null;
    if (!player || !owner) return false;
    const fields = KicksStore.list('fields');
    return KicksStore.list('bookings').some(booking => (booking.userId === player.id || booking.captainIds?.includes(player.id)) &&
      ['Pending', 'Confirmed', 'Completed'].includes(booking.status) &&
      fields.some(field => field.id === booking.fieldId && field.ownerId === owner.id));
  }
  function contacts() { const user = current(); return KicksStore.list('users').filter(row => row.status === 'Active' && canContact(user, row)); }
  function inbox() {
    const user = current(), users = KicksStore.list('users');
    return all().filter(row => (row.senderId === user.id || row.recipientId === user.id) &&
      canContact(user, users.find(other => other.id === (row.senderId === user.id ? row.recipientId : row.senderId))));
  }
  function thread(id) { const user = current(); return inbox().filter(row => (row.senderId === user.id && row.recipientId === id) || (row.senderId === id && row.recipientId === user.id)); }
  function send(id, text) { return KicksStore.updateMessages(rows => {
    const user = current(), recipient = contacts().find(row => row.id === Number(id));
    text = String(text || '').trim();
    if (!recipient) throw Error('This account is unavailable for messaging.');
    if (!text || text.length > 2000) throw Error('Write a message between 1 and 2,000 characters.');
    const row = {id: crypto.randomUUID(), senderId:user.id, recipientId:recipient.id, text, createdAt:new Date().toISOString(), read:false};
    rows.push(row); return row;
  }); }
  function markRead(id) { return KicksStore.updateMessages(rows => {
    const user = current();
    if (!canContact(user, KicksStore.list('users').find(row => row.id === id))) return;
    for (const row of rows) if (row.senderId === id && row.recipientId === user.id && !row.read) row.read = true;
  }); }
  function render() {
    const host = document.getElementById('messagesPanel'); if (!host) return;
    const previousInput=host.querySelector('#messageText');
    const keepFocus=previousInput&&document.activeElement===previousInput;
    const selection=keepFocus?[previousInput.selectionStart,previousInput.selectionEnd]:null;
    try {
      const user = current(), rows = inbox();
      const people = KicksStore.list('users').filter(row => canContact(user, row) && (row.status === 'Active' || rows.some(m => m.senderId === row.id || m.recipientId === row.id)));
      people.sort((a,b) => {const last = id => rows.filter(m=>m.senderId===id || m.recipientId===id).at(-1)?.createdAt || ''; return last(b.id).localeCompare(last(a.id)) || a.name.localeCompare(b.name);});
      const person = people.find(row => row.id === selected);
      if (!person) selected = null;
      if (person && document.visibilityState !== 'hidden') markRead(person.id).catch(error => { const status = host.querySelector('#messageError'); if (status) status.textContent = error.message; });
      const unread = rows.filter(row => row.recipientId === user.id && !row.read && row.senderId !== selected).length;
      host.innerHTML = '<div class="messages-heading"><div><p class="messages-eyebrow">STAY CONNECTED</p><h2>Messages</h2><p>' + (user.role === 'player' ? 'Contact your booked field owners, agreed rival captains, or the KICKS team.' : user.role === 'owner' ? 'Talk to players who booked your fields, or the KICKS team.' : 'Help players and field owners with their enquiries.') + '</p></div><span class="messages-count">' + unread + ' unread</span></div><div class="messages-layout"><aside class="messages-contacts" aria-label="Conversations">' + (people.map(p => {
        const history = rows.filter(m=>m.senderId===p.id || m.recipientId===p.id), last = history.at(-1), count = history.filter(m=>m.recipientId===user.id && !m.read && m.senderId!==selected).length;
        return '<button type="button" class="message-contact" data-message-person="'+p.id+'" aria-pressed="'+(selected===p.id)+'"><span class="message-avatar" aria-hidden="true">'+esc(p.name.charAt(0))+'</span><span class="message-contact-copy"><strong>'+esc(p.name)+'</strong><small>'+esc(p.role==='owner'?'Field owner':p.role==='admin'?'Administrator':'Player')+'</small><span>'+esc(last?.text || 'Start a conversation')+'</span></span>'+(count?'<b class="message-unread">'+count+'</b>':'')+'</button>';
      }).join('') || '<p class="messages-placeholder">No contacts available yet.</p>') + '</aside><div class="messages-conversation">' + (person ? '<header class="message-thread-heading"><strong>'+esc(person.name)+'</strong><span>'+esc(person.status==='Active'?'Direct conversation':'Account inactive')+'</span></header><div class="message-history" tabindex="0" aria-label="Message history">'+(thread(person.id).map(m=>'<article class="message-bubble '+(m.senderId===user.id?'outgoing':'incoming')+'"><p>'+esc(m.text)+'</p><small>'+esc(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Amman',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(m.createdAt)))+(m.senderId===user.id?' · '+(m.read?'Read':'Sent'):'')+'</small></article>').join('') || '<p class="messages-placeholder">Say hello and start the conversation.</p>')+'</div><form id="messageForm" class="message-composer"><label for="messageText" class="message-compose-label">Your message</label><textarea id="messageText" maxlength="2000" rows="2" placeholder="Write a message…" '+(person.status!=='Active'?'disabled':'')+'>'+esc(drafts.get(user.id+':'+person.id)||'')+'</textarea><button class="meeting-primary" type="submit" '+(person.status!=='Active'?'disabled':'')+'>Send message ↗</button><p id="messageError" role="status"></p></form>' : '<div class="messages-welcome"><span aria-hidden="true">✉</span><h3>Your conversations, together.</h3><p>Choose a person to send a message or read your conversation.</p></div>')+'</div></div>';
      host.querySelectorAll('[data-message-person]').forEach(button => button.onclick=()=>{selected=Number(button.dataset.messagePerson);render();});
      const form = host.querySelector('#messageForm');
      if (form) {
        const input = host.querySelector('#messageText'); input.oninput=()=>drafts.set(user.id+':'+selected,input.value);
        form.onsubmit=async event=>{event.preventDefault();try{await send(selected,input.value);drafts.delete(user.id+':'+selected);render();}catch(error){host.querySelector('#messageError').textContent=error.message;}};
        const history = host.querySelector('.message-history'); history.scrollTop=history.scrollHeight;
        if(keepFocus){input.focus({preventScroll:true});input.setSelectionRange(...selection);}
      }
    } catch(error) { host.textContent=error.message; }
  }
  window.addEventListener('storage', event=>{if (event.key===key || event.key==='kicks-data-v2' || event.key===null) render();});
  window.addEventListener('kicks-data-change', render);
  window.addEventListener('kicks-account-change', render);
  document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')render();});
  window.KicksMessages = {contacts, inbox, thread, send, markRead, render};
})();
