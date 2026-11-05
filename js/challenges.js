"use strict";
(() => {
  const S = KicksStore,
    A = KicksAuth,
    $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const e = S.escape,
    icon = (n) => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`,
    cities = [
      "Amman",
      "Irbid",
      "Zarqa",
      "Ajloun",
      "Jerash",
      "Mafraq",
      "Balqa",
      "Madaba",
      "Karak",
      "Tafilah",
      "Ma'an",
      "Aqaba",
    ];
  let teams = [],
    matches = [],
    requests = [],
    bookings = [],
    active = "open",
    selectedId = null,
    replyId = null,
    cancelId = null,
    timer;
  const refresh = () => {
    teams = S.list("teams");
    matches = S.list("challenges");
    requests = S.list("challengeRequests");
    bookings = S.list("bookings");
  };
  const me = () => A.current(),
    team = (id) => teams.find((t) => t.id === id),
    match = (id) => matches.find((c) => c.id === Number(id)),
    captain = (t) => !!t && t.captainId === me()?.id,
    mine = () => teams.filter((t) => captain(t)),
    status = (c) => S.challengeStatus(c),
    inTeam = (t) => t?.members.some((m) => m.userId === me()?.id),
    detailLink = (t) => "../Teams/teams.html?team=" + encodeURIComponent(t.id);
  const notify = (text) => {
    clearTimeout(timer);
    $("#toast").textContent = text;
    $("#toast").hidden = false;
    timer = setTimeout(() => ($("#toast").hidden = true), 5500);
  };
  const badge = (t) =>
    `<span class="badge ${["forest", "navy", "clay", "purple", "gold", "teal"].includes(t?.color) ? t.color : "forest"}" aria-hidden="true">${/^data:image\/(png|jpeg|webp);base64,/.test(t?.logo || "") ? `<img src="${e(t.logo)}" alt="">` : e(t?.initials || "FC")}</span>`;
  const stateBadge = (c) =>
    `<span class="match-status ${status(c).toLowerCase().replace(/\s+/g,'-')}">${e(status(c))}</span>`;
  const dateText = (d) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Amman",
    }).format(new Date(d + "T12:00:00+03:00"));
  const empty = (title, note, actions = "") =>
    `<div class="empty">${icon("ball")}<h3>${e(title)}</h3><p>${e(note)}</p><div class="challenge-empty-actions">${actions}</div></div>`;
  const teamOptions = (arr) =>
    '<option value="">Choose your team</option>' +
    arr
      .map(
        (t) =>
          `<option value="${e(t.id)}">${e(t.name)} · ${e(t.format)}</option>`,
      )
      .join("");
  function card(c) {
    const t = team(c.teamId),
      away = team(c.opponentId);
    return `<article class="challenge-card"><div class="challenge-top">${badge(t)}<div><h3>${e(t?.name || "Unavailable team")}</h3><small>${away ? "vs " + e(away.name) : e(c.level) + " · Looking for a rival"}</small></div>${stateBadge(c)}</div><div class="match-info"><div>${icon("pin")}${e(c.city)}</div><div>${icon("ball")}${e(c.format)} · One hour</div><div>${icon("clock")}${e(dateText(c.date))}</div><div>${icon("clock")}${e(c.time)} · Amman</div></div><div class="challenge-bottom"><p>${e(c.split)}</p><button class="profile-link" data-view="${c.id}" aria-label="View challenge by ${e(t?.name)}">${captain(t) ? "Manage match" : "View match"}${icon("arrow")}</button></div></article>`;
  }
  function render() {
    refresh();
    $$("[data-tab]").forEach((b) => {
      const on = b.dataset.tab === active;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    $("#challenge-results").setAttribute("aria-labelledby", "tab-" + active);
    $("#filters").hidden = active !== "open";
    const hasFilters = ["search", "city", "format", "date-filter"].some(
      (id) => $("#" + id).value,
    );
    $("#clear-filters").hidden = active !== "open" || !hasFilters;
    let rows = matches.filter((c) =>
      active === "open"
        ? status(c) === "Open"
        : inTeam(team(c.teamId)) || inTeam(team(c.opponentId)),
    );
    if (active === "requests") {
      const rs = requests
        .filter((r) => captain(team(r.teamId)))
        .sort((a, b) => b.id - a.id);
      $("#result-count").textContent = rs.length + " sent requests";
      $("#challenge-results").innerHTML = rs.length
        ? rs
            .map((r) => {
              const c = match(r.challengeId);
              return `<article class="my-request">${badge(team(r.teamId))}<div><h3>${e(team(r.teamId)?.name)} → ${e(team(c?.teamId)?.name)}</h3><p>${c ? e(dateText(c.date) + " · " + c.time + " · " + c.city) : "Unavailable match"}</p><span class="request-state ${r.status.toLowerCase()}">${e(r.status === "Pending" && c && status(c) !== "Open" ? "Closed" : r.status)}</span></div><button class="button secondary" data-view="${r.challengeId}">View match</button>${r.status === "Pending" && c && status(c) === "Open" ? `<button class="reset-button" data-action="withdraw" data-id="${c.id}" data-request="${r.id}">Withdraw</button>` : ""}</article>`;
            })
            .join("")
        : empty(
            "No requests yet.",
            "Find a suitable challenge and send a request as your team’s captain.",
            '<button class="button primary" data-browse>Find a rival ↗</button>',
          );
      return;
    }
    if (active === "open") {
      const q = $("#search").value.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          (!q ||
            [team(c.teamId)?.name, c.city]
              .join(" ")
              .toLowerCase()
              .includes(q)) &&
          (!$("#city").value || c.city === $("#city").value) &&
          (!$("#format").value || c.format === $("#format").value) &&
          (!$("#date-filter").value || c.date === $("#date-filter").value),
      );
    }
    rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    $("#result-count").textContent =
      rows.length +
      " " +
      (active === "open" ? "open challenges" : "team matches");
    $("#challenge-results").innerHTML = rows.length
      ? '<div class="challenge-grid">' + rows.map(card).join("") + "</div>"
      : empty(
          active === "mine"
            ? "Your next match starts here."
            : "No open challenges yet.",
          active === "mine"
            ? "Post a challenge or find an opponent for your team."
            : hasFilters
              ? "Try another city, date or format."
              : "Be the first captain to call the game. Post a challenge and invite another squad to play.",
          `<button class="button primary" data-post>Post a challenge ${icon("plus")}</button><a class="button secondary" href="../Teams/teams.html">Find or create a team</a>`,
        );
  }
  function selectTab(tab) {
    if (tab !== "open" && !A.requirePlayer()) return;
    active = tab;
    render();
  }
  function showDetail(id) {
    refresh();
    const c = match(id);
    if (!c) {
      notify("This challenge is unavailable.");
      return;
    }
    selectedId = c.id;
    drawDetail();
    KicksDialogs.open($("#challenge-dialog"));
  }
  function drawDetail() {
    refresh();
    const c = match(selectedId);
    if (!c) return;
    const host = team(c.teamId),
      away = team(c.opponentId),
      st = status(c),
      isHost = captain(host),
      isAway = captain(away),
      pending = requests.filter(
        (r) => r.challengeId === c.id && r.status === "Pending",
      ),
      minePending = pending.find((r) => captain(team(r.teamId))),
      choices = mine().filter(
        (t) => t.id !== host?.id && t.format === c.format,
      );
    const b = bookings.find((b) => b.id === c.bookingId);
    $("#challenge-detail").innerHTML =
      `<div class="detail-cover"><button class="icon-button" data-close="challenge-dialog" aria-label="Close challenge details">×</button></div><div class="detail-header"><div class="detail-headline"><h2 id="challenge-title">${st==='Awaiting payment' ? 'Opponent agreed. Complete both halves.' : away ? "Match agreed. Game on." : "Your next opposition."}</h2>${stateBadge(c)}</div><div class="matchup"><a href="${host ? detailLink(host) : "../Teams/teams.html"}">${badge(host)}${e(host?.name || "Unavailable team")}</a><span class="versus">VS</span>${away ? `<a href="${detailLink(away)}">${badge(away)}${e(away.name)}</a>` : '<a href="../Teams/teams.html">' + icon("shield") + "Your team?</a>"}</div><div class="match-summary"><div><small>MATCHDAY</small><strong>${e(dateText(c.date))}</strong></div><div><small>KICKOFF · AMMAN</small><strong>${e(c.time)} · One hour</strong></div><div><small>CITY / FORMAT</small><strong>${e(c.city)} · ${e(c.format)}</strong></div><div><small>PLAYING LEVEL</small><strong>${e(c.level)}</strong></div><div><small>COST AGREEMENT</small><strong>${e(c.split)}${c.paymentMode?' · '+Number(c.price).toFixed(2)+' JD total':''}</strong></div><div><small>PITCH</small><strong>${b||c.fieldId ? '<a href="../Fields/field-details.html?id=' + (b?.fieldId||c.fieldId) + '">' + e(S.find("fields", b?.fieldId||c.fieldId)?.name || "View pitch") + "</a>" : "Not reserved yet"}</strong></div></div>${c.paymentMode&&st==='Open'?'<p class="booking-note">The pitch is proposed, not reserved. Accepting a rival rechecks availability and starts a 15-minute payment hold. Both captains pay their own half.</p>':''}${c.note ? `<p class="match-note">${e(c.note)}</p>` : ""}<div class="match-actions">${st === "Open" && !isHost ? (minePending ? '<span class="recruit-status">Your request is awaiting the captain</span>' : `<button class="button primary" data-reply="${c.id}">Challenge this team ${icon("arrow")}</button>`) : ""}${(isHost || isAway) && ["Open", "Agreed", "Awaiting payment"].includes(st) ? `<button class="cancel-link" data-cancel="${c.id}">Cancel challenge</button>` : ""}${(isHost || isAway) && ["Agreed", "Awaiting payment", "Booked", "Completed"].includes(st) ? `<a class="button secondary" href="../Dashboard/player.html?contact=${isHost ? away.captainId : host.captainId}#messages">Message the other captain ↗</a>` : ""}</div></div><div class="detail-content" id="match-workspace"></div>`;
    const area = $("#match-workspace");
    if(st==='Awaiting payment'&&b?.splitPayment){
      const own=b.shares.find(s=>s.userId===me()?.id);
      area.innerHTML=`<section class="booking-box"><h3>Each captain pays their half</h3><p>Total: <b>${Number(b.price).toFixed(2)} JD</b>. Match confirmation requires both shares.</p><ul>${b.shares.map(s=>`<li>${e(team(s.teamId)?.name)}: <b>${Number(s.amount).toFixed(2)} JD</b> · ${s.paid?'Paid (demo)':'Awaiting payment'}</li>`).join('')}</ul><p>Payment deadline: ${e(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Amman',dateStyle:'medium',timeStyle:'short'}).format(new Date(b.paymentDeadline)))} · Amman.</p><p class="booking-note">Unfinished payments expire after 15 minutes or at kickoff, whichever comes first. Paid shares are held until both pay; cancellation or expiry refunds them in this demo. An odd cent is assigned to the posting team.</p>${own&&!own.paid?`<button class="button primary" id="pay-share">Pay my half · ${Number(own.amount).toFixed(2)} JD ↗</button>`:own?'<p>Your half is paid. Waiting for the other captain.</p>':'<p>Only the two agreed captains can pay.</p>'}<p class="error" id="booking-error" role="alert"></p></section>`;
    }
    if (st === "Open" && isHost)
      area.innerHTML =
        "<h3>Rival requests</h3>" +
        (pending.length
          ? pending
              .map((r) => {
                const t = team(r.teamId);
                return `<article class="request-item match-request"><div class="request-heading">${badge(t)}<div><a href="${detailLink(t)}">${e(t?.name)}</a><br><small>${e(t?.level)} · ${t?.members.length || 0} players</small></div></div><p class="request-note">${e(r.note || "Ready to play at your proposed time.")}</p><div class="request-actions"><button class="button secondary" data-action="decline" data-id="${c.id}" data-request="${r.id}">Decline</button><button class="button primary" data-action="accept" data-id="${c.id}" data-request="${r.id}">Accept rival ✓</button></div></article>`;
              })
              .join("")
          : '<p class="muted">No requests yet. Your challenge is visible on the board.</p>');
    if (st === "Agreed") {
      if (isHost) {
        const fields = S.list("fields").filter(
          (f) => f.city === c.city && f.type === c.format,
        );
        const available = fields.filter(
          (f) =>
            !bookings.some(
              (b) =>
                b.fieldId === f.id &&
                b.date === c.date &&
                b.time === c.time &&
                ["Pending", "Confirmed"].includes(b.status),
            ),
        );
        area.innerHTML = `<section class="booking-box"><h3>Opponent confirmed. Secure your pitch.</h3><p>${e(c.date)} at ${e(c.time)} · ${e(c.city)} · ${e(c.format)}</p>${available.length ? `<label for="match-field">Available pitches at this kickoff</label><select id="match-field"><option value="">Choose a pitch</option>${available.map((f) => `<option value="${f.id}">${e(f.name)} · ${Number(f.price).toFixed(2)} JD / hour</option>`).join("")}</select><p class="booking-note">You pay the full pitch price at checkout. Agreement: <b>${e(c.split)}</b>. Any team-to-team settlement happens between captains; it is not an online split payment.</p><button class="button primary" id="book-match">Book pitch & confirm match ↗</button><p id="booking-error" class="error" role="alert"></p>` : '<p>No matching pitches are available at this time. Contact a venue or cancel and propose another kickoff.</p><a href="../Fields/fields.html">Explore pitches ↗</a>'}</section>`;
      } else
        area.innerHTML =
          '<div class="booking-box"><h3>Waiting for a pitch booking.</h3><p>The posting captain will choose and reserve a pitch. Your match is agreed, but no field is secured yet.</p></div>';
    }
    if (["Booked", "Completed"].includes(st) && b)
      area.innerHTML = `<section class="booking-box"><h3>${st === "Completed" ? "A match for the memories." : "Your match is confirmed."}</h3><p>Booking #${b.id} · ${e(b.teamNames?.join(" vs ") || "Team match")}<br>${e(S.find("fields", b.fieldId)?.name || "Pitch")} · ${e(dateText(b.date))} · ${e(b.time)} · Amman</p><p>Pitch price: <b>${Number(b.price).toFixed(2)} JD</b> · ${e(b.paymentStatus || "Confirmed")}<br>Cost agreement: ${e(c.split)}. ${c.split === "Half each" ? "Suggested team share: " + (Number(b.price) / 2).toFixed(2) + " JD each." : ""}</p>${isHost || isAway ? '<a class="button secondary" href="../Dashboard/player.html#bookings">View my bookings ↗</a>' : ""}</section>`;
    if(['Booked','Completed'].includes(st)&&b?.splitPayment){
      area.innerHTML=`<section class="booking-box"><h3>${st==='Completed'?'A match for the memories.':'Your match is confirmed.'}</h3><p>Booking #${b.id} · ${e(b.teamNames.join(' vs '))}<br>${e(S.find('fields',b.fieldId)?.name)} · ${e(dateText(b.date))} · ${e(b.time)} · Amman</p><p>Total: <b>${Number(b.price).toFixed(2)} JD</b> · ${e(b.paymentStatus)}</p><ul>${b.shares.map(s=>`<li>${e(team(s.teamId)?.name)} · ${Number(s.amount).toFixed(2)} JD · ${s.amount?'Paid (demo)':'Free'}</li>`).join('')}</ul>${isHost||isAway?'<a class="button secondary" href="../Dashboard/player.html#bookings">View my bookings ↗</a>':''}</section>`;
    }
    if (st === "Expired" || st === "Cancelled")
      area.innerHTML =
        '<div class="booking-box"><h3>This challenge is ' +
        st.toLowerCase() +
        ".</h3><p>It is no longer accepting requests. Find another rival or post a new matchday.</p></div>";
    if(b?.splitPayment&&['Expired','Cancelled'].includes(st))area.innerHTML+='<p class="booking-note">The pitch hold has been released. Any captured half is refunded in this local simulation.</p>';
    $('#challenge-detail').dataset.status=st;
  }
  function openPost() {
    if (!A.requirePlayer()) return;
    refresh();
    const options = mine();
    if (!options.length) {
      notify("Create a team first. Only its captain can post challenges.");
      location.assign("../Teams/teams.html");
      return;
    }
    $("#challenge-form").reset();
    $("#post-error").textContent = "";
    $("#challenge-form [name=teamId]").innerHTML = teamOptions(options);
    if (options.length === 1)
      $("#challenge-form [name=teamId]").value = options[0].id;
    $("#challenge-form [name=city]").value = options[0].city;
    refreshPitchOptions();
    KicksDialogs.open($("#post-dialog"));
  }
  function refreshPitchOptions(){
    const form=$('#challenge-form'),f=form.elements,previous=f.fieldId.value,t=team(f.teamId.value);
    const fields=t&&f.date.value&&f.time.value?S.list('fields').filter(p=>p.city===f.city.value&&p.type===t.format&&S.isFieldSlotAvailable(p.id,f.date.value,f.time.value)):[];
    f.fieldId.innerHTML='<option value="">'+(fields.length?'Choose an available pitch':'Choose team, city and available future slot')+'</option>'+fields.map(p=>`<option value="${p.id}">${e(p.name)} · ${Number(p.price).toFixed(2)} JD total</option>`).join('');
    if(fields.some(p=>String(p.id)===previous))f.fieldId.value=previous;
    showPitchQuote();
  }
  function showPitchQuote(){const f=$('#challenge-form').elements,p=S.find('fields',Number(f.fieldId.value));f.price.value=p?Number(p.price).toFixed(2):'';const cents=p?Math.round(Number(p.price)*100):0;$('#pitch-quote').textContent=p?`Total ${Number(p.price).toFixed(2)} JD · Your half ${(Math.ceil(cents/2)/100).toFixed(2)} JD · Rival half ${(Math.floor(cents/2)/100).toFixed(2)} JD. Reserved only after accepting a rival.`:'Choose a pitch to see both halves.';}
  $('#challenge-form').addEventListener('change',ev=>{if(['teamId','city','date','time'].includes(ev.target.name))refreshPitchOptions();if(ev.target.name==='fieldId')showPitchQuote();});
  function openReply(id) {
    if (!A.requirePlayer()) return;
    refresh();
    const c = match(id),
      options = mine().filter(
        (t) => t.id !== c?.teamId && t.format === c?.format,
      );
    if (!options.length) {
      notify(
        "You need to captain another " +
          c?.format +
          " team to send a challenge.",
      );
      return;
    }
    replyId = Number(id);
    $("#reply-form").reset();
    $("#reply-error").textContent = "";
    $("#reply-form [name=teamId]").innerHTML = teamOptions(options);
    if (options.length === 1)
      $("#reply-form [name=teamId]").value = options[0].id;
    $("#reply-description").textContent =
      dateText(c.date) +
      " · " +
      c.time +
      " · " +
      c.city +
      " · " +
      c.split +
      (c.paymentMode?" · "+S.find('fields',c.fieldId)?.name+" · Total "+Number(c.price).toFixed(2)+" JD. Your half: "+(Math.floor(Math.round(c.price*100)/2)/100).toFixed(2)+" JD. Accepting a rival starts a 15-minute hold; both captains pay in KICKS.":". Legacy challenge: the posting captain books the pitch.");
    KicksDialogs.open($("#reply-dialog"));
  }
  function update() {
    render();
    if (selectedId) drawDetail();
  }
  $("#challenge-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(ev.currentTarget));
      const c = await S.challengeAction("create", values);
      $("#post-dialog").close();
      render();
      showDetail(c.id);
      notify("Challenge posted. Let the rivals come to you.");
    } catch (err) {
      $("#post-error").textContent = err.message;
    }
  });
  $("#reply-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      await S.challengeAction("request", {
        ...Object.fromEntries(new FormData(ev.currentTarget)),
        id: replyId,
      });
      $("#reply-dialog").close();
      update();
      notify("Request sent. The posting captain will review it.");
    } catch (err) {
      $("#reply-error").textContent = err.message;
    }
  });
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    try {
      if (b.hasAttribute("data-post")) openPost();
      if (b.dataset.view) showDetail(b.dataset.view);
      if (b.dataset.reply) openReply(b.dataset.reply);
      if (b.dataset.close) $("#" + b.dataset.close).close();
      if (b.dataset.tab) selectTab(b.dataset.tab);
      if (b.hasAttribute("data-browse")) selectTab("open");
      if (b.dataset.action) {
        await S.challengeAction(b.dataset.action, {
          id: b.dataset.id,
          requestId: b.dataset.request,
        });
        update();
        notify(
          b.dataset.action === "accept"
            ? "Opponent accepted. Open the match to complete payment."
            : "Request updated.",
        );
      }
      if (b.dataset.cancel) {
        cancelId = Number(b.dataset.cancel);
        $("#cancel-error").textContent = "";
        KicksDialogs.open($("#cancel-dialog"));
      }
      if (b.id === "cancel-confirm") {
        try {
          await S.challengeAction("cancel", { id: cancelId });
          $("#cancel-dialog").close();
          update();
          notify("Challenge cancelled.");
        } catch (err) {
          $("#cancel-error").textContent = err.message;
        }
      }
      if (b.id === "book-match") {
        const c = match(selectedId),
          field = S.find("fields", Number($("#match-field").value)),
          account = A.requirePlayer();
        if (!account) return;
        if (!field) throw Error("Choose an available pitch first.");
        S.validateChallengeBooking(account.id, c.id, field, c.date, c.time);
        b.disabled = true;
        try {
          const payment = await KicksCheckout.open(
            field.price,
            team(c.teamId).name +
              " vs " +
              team(c.opponentId).name +
              " · " +
              field.name,
          );
          if (!payment) return;
          if (A.current()?.id !== account.id)
            throw Error("Please sign in again.");
          await S.book(account.id, field.id, c.date, c.time, payment, c.id);
          update();
          notify("Pitch booked. Both teams can now see the confirmed match.");
        } finally {
          b.disabled = false;
        }
      }
      if(b.id==='pay-share'){
        const c=match(selectedId),booking=S.list('bookings').find(x=>x.id===c.bookingId),account=A.requirePlayer(),share=booking?.shares?.find(s=>s.userId===account?.id);
        if(!share||share.paid)throw Error('Your share is not awaiting payment.');
        b.disabled=true;
        try{const payment=await KicksCheckout.open(share.amount,'Your half · '+team(share.teamId).name+' · '+S.find('fields',booking.fieldId)?.name);if(!payment)return;if(A.current()?.id!==account.id)throw Error('Please sign in again.');const saved=await S.payChallengeShare(c.id,payment);update();notify(saved.status==='Confirmed'?'Both halves paid. Match and pitch confirmed.':'Your half is paid. Waiting for the other captain.');}finally{b.disabled=false;}
      }
    } catch (err) {
      if (["book-match","pay-share"].includes(b.id) && $("#booking-error"))
        $("#booking-error").textContent = err.message;
      else notify(err.message);
    }
  });
  $("#filters").addEventListener("submit", (ev) => ev.preventDefault());
  $("#filters").addEventListener("input", render);
  $("#clear-filters").addEventListener("click", () => {
    $("#filters").reset();
    render();
  });
  document.addEventListener("keydown", (ev) => {
    const tab = ev.target.closest("[role=tab]");
    if (!tab) return;
    const tabs = [...tab.parentElement.querySelectorAll("[role=tab]")],
      i = tabs.indexOf(tab);
    let n;
    if (ev.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (ev.key === "ArrowLeft") n = (i + tabs.length - 1) % tabs.length;
    if (ev.key === "Home") n = 0;
    if (ev.key === "End") n = tabs.length - 1;
    if (n !== undefined) {
      ev.preventDefault();
      tabs[n].click();
      tabs[n].focus();
    }
  });
  $$("dialog").forEach((d) =>
    d.addEventListener("click", (ev) => {
      if (ev.target !== d) return;
      const r = d.getBoundingClientRect();
      if (
        ev.clientX < r.left ||
        ev.clientX > r.right ||
        ev.clientY < r.top ||
        ev.clientY > r.bottom
      )
        d.close();
    }),
  );
  $("#city").innerHTML += cities
    .map((c) => "<option>" + e(c) + "</option>")
    .join("");
  $("#challenge-form [name=city]").innerHTML = cities
    .map((c) => "<option>" + e(c) + "</option>")
    .join("");
  $("#challenge-form [name=time]").innerHTML = Array.from(
    { length: 13 },
    (_, i) => `<option>${i + 10}:00</option>`,
  ).join("");
  $("#challenge-form [name=date]").min = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Amman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  window.addEventListener("storage", (ev) => {
    if (ev.key === "kicks-data-v2") {
      $$("dialog[open]").forEach((d) => d.close());
      render();
      notify("Match data updated from another tab.");
    }
  });
  let nextCatalogueRefresh=Date.now()+30000;
  setInterval(() => {
    if(document.hidden)return;
    if(!document.querySelector('dialog[open]')){if(Date.now()>=nextCatalogueRefresh){render();nextCatalogueRefresh=Date.now()+30000;}}
    else if($('#challenge-dialog').open&&!document.querySelector('dialog[open]:not(#challenge-dialog)')){refresh();const c=match(selectedId);if(c&&$('#challenge-detail').dataset.status!==status(c))drawDetail();}
  }, 1000);
  render();
  const linked = new URLSearchParams(location.search).get("id");
  if (linked && match(linked)) showDetail(linked);
  const picked = new URLSearchParams(location.search).get("team");
  if (picked && captain(team(picked))) {
    openPost();
    $("#challenge-form [name=teamId]").value = picked;
  }
})();
