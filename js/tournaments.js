// دليل الملف: عرض البطولات وفلترتها، ثم تسجيل فريق في بطولة.
// قائمة البطولات وتفاصيلها وتسجيل الفريق بعد الدفع المحلي التجريبي.
// Public listings and account-linked team registration.
(() => {
  let tournaments = KicksStore.publicActivities("tournaments");
  const getElement = (id) => document.getElementById(id);
  const fieldFor = (cup) => KicksStore.find('fields',cup.fieldId);
  const remaining = (cup) => cup.capacity - cup.teams;
  const upcoming = (cup) =>
    new Date(`${cup.date}T${cup.time}:00+03:00`) > new Date();
  const open = (cup) => !['Cancelled','Archived'].includes(cup.status) && upcoming(cup) && remaining(cup) > 0 && !cup.bracket?.started;
  function status(cup) {
    if (['Cancelled','Archived'].includes(cup.status)) return cup.status;
    if (cup.bracket?.started || !upcoming(cup)) return "Registration closed";
    if (remaining(cup) === 0) return "Fully registered";
    if (remaining(cup) <= 2) return "Few spots left";
    return "Registration open";
  }
  const dateText = (date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Amman",
    }).format(new Date(`${date}T12:00:00+03:00`));
  if (getElement("cupContent")) {
    const detailAccount=KicksAuth.current();
    const managed=KicksStore.list('tournaments').filter(t=>KicksStore.tournamentAccess(t.id).view);
    const cup = [...tournaments,...managed].find(
      (cup) =>
        String(cup.id) === new URLSearchParams(location.search).get("id"),
    );
    if (!cup) {
      getElement("cupMissing").hidden = false;
      return;
    }
    let field = fieldFor(cup);
    getElement("cupContent").hidden = false;
    document.title = `${cup.name} | KICKS`;
    getElement("cupTitle").textContent = cup.name;
    getElement("cupLocation").textContent =
      `${field.name} · ${field.area}, ${field.city}`;
    getElement("cupPhoto").src = `${KicksAuth.fieldImage(field)}`;
    getElement("cupPhoto").alt = `Football pitch at ${field.name}`;
    getElement("cupFacts").innerHTML = [
      ["calendar3", "Date", dateText(cup.date)],
      ["clock", "Kickoff", cup.time + " · " + cup.durationMinutes + " min · Amman"],
      ["people", "Team format", field.type],
      ["bar-chart", "Level", cup.level],
    ]
      .map(
        ([icon, label, value]) =>
          `<div><i class="bi bi-${icon}" aria-hidden="true"></i><span>${label}</span><strong>${KicksStore.escape(value)}</strong></div>`,
      )
      .join("");
    getElement("cupSystem").textContent =
      cup.system === "Single elimination"
        ? "Single elimination: winners advance through quarter-finals, semi-finals and the final."
        : "Two groups of four teams. The top two in each group advance to semi-finals, followed by the final.";
    getElement("cupFieldLink").href =
      `../Fields/field-details.html?id=${field.id}`;
    getElement("cupPrize").textContent = cup.prize;
    getElement("cupFee").textContent = cup.fee;
    getElement("cupAvailability").textContent = status(cup);
    getElement("cupTeamCount").textContent =
      `${cup.teams} / ${cup.capacity} teams · ${remaining(cup)} ${remaining(cup) === 1 ? "spot" : "spots"} left`;
    getElement("cupProgress").max = cup.capacity;
    getElement("cupProgress").value = cup.teams;
    function renderRegistered(){
      const host=getElement('registeredTeamList');if(!host)return;const permitted=KicksStore.tournamentAccess(cup.id).view;host.parentElement.hidden=!permitted;if(!permitted){host.replaceChildren();return;}
      const rows=KicksStore.list('registrations').filter(r=>r.tournamentId===cup.id && r.status==='Registered');
      host.innerHTML=rows.length?rows.map(r=>{const team=KicksStore.list('teams').find(t=>t.id===r.teamId);return '<p>'+(team?'<a href="../Teams/teams.html?team='+encodeURIComponent(team.id)+'">'+KicksStore.escape(team.name)+'</a>':KicksStore.escape(r.teamName))+(r.roster?' · '+r.roster.length+' registered players':'')+'</p>'+(r.roster?'<details><summary>Registered squad</summary><ul>'+r.roster.map(m=>'<li>'+KicksStore.escape(m.name||KicksStore.find('users',m.userId)?.name||'Player')+' · '+KicksStore.escape(m.position)+'</li>').join('')+'</ul></details>':'')}).join(''):'<p>No teams registered yet.</p>';
    }
    renderRegistered();
    if (detailAccount?.role === 'admin') {
      getElement('registeredTeamList')?.insertAdjacentHTML('beforebegin','<p><a href="../Dashboard/admin.html#registrations">Manage team registrations & demo refunds ↗</a></p>');
    }
    window.addEventListener('kicks-account-change',renderRegistered);
    window.addEventListener('storage',renderRegistered);
    if(cup.bracket?.started) getElement("cupSystem").textContent="Single elimination: winners advance through the tournament bracket below.";
    const inputs = ["teamName", "captainName", "captainEmail"];
    const errors = ["teamError", "captainError", "emailError"];
    function closeRegistration() {
      getElement("teamSelect").disabled = true;
      inputs.forEach((id) => (getElement(id).disabled = true));
      getElement("teamSubmit").disabled = true;
      getElement("teamSubmit").textContent = status(cup);
    }
    if (!open(cup)) closeRegistration();
    const account = KicksAuth.current();
    if (account) {
      getElement("captainName").value = account.name;
      getElement("captainEmail").value = account.email;
    }
    const teamSelect=getElement('teamSelect');
    const captainTeams=KicksStore.list('teams').filter(t=>t.captainId===account?.id);
    teamSelect.innerHTML='<option value="">Choose your team</option>'+captainTeams.map(t=>'<option value="'+KicksStore.escape(t.id)+'">'+KicksStore.escape(t.name)+'</option>').join('');
    function chooseTeam(){
      getElement("teamStatus").textContent="";
      const team=captainTeams.find(t=>t.id===teamSelect.value);
      getElement('teamName').value=team?.name||'';
      getElement('teamRosterHint').textContent=team?team.members.length+' players · '+team.format+' · Roster is saved when you register.':account?(captainTeams.length?'Select a team you captain.':'Create a team and build your squad before registering.'):'Sign in as a player to register your team.';
    }
    teamSelect.addEventListener('change',chooseTeam);if(captainTeams.length===1)teamSelect.value=captainTeams[0].id;chooseTeam();
    const alreadyRegistered =
      account &&
      KicksStore.list("registrations").some(
        (entry) =>
          entry.userId === account.id &&
          entry.tournamentId === cup.id &&
          entry.status === "Registered",
      );
    if (alreadyRegistered) {
      teamSelect.disabled=true;
      inputs.forEach((id) => (getElement(id).disabled = true));
      getElement("teamSubmit").disabled = true;
      getElement("teamSubmit").textContent = "Registered ✓";
    }
    inputs.forEach((id, index) =>
      getElement(id).addEventListener("input", () => {
        getElement(errors[index]).textContent = "";
        getElement(id).removeAttribute("aria-invalid");
        getElement("teamStatus").textContent = "";
      }),
    );
    let checkoutOpen = false;
    getElement("teamForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      if(checkoutOpen)return;
      refreshDetails();
      const account = KicksAuth.requirePlayer();
      if (!account) return;
      if (!open(cup)) {
        closeRegistration();
        return;
      }
      try { KicksStore.tournamentRoster(account.id,cup.id,teamSelect.value); } catch(error) { getElement('teamStatus').textContent=error.message; return; }
      let first;
      inputs.forEach((id, index) => {
        const input = getElement(id);
        input.value = input.value.trim();
        const valid =
          index === 2
            ? input.value && input.validity.valid
            : input.value.length >= 2;
        getElement(errors[index]).textContent = valid
          ? ""
          : index === 2
            ? "Enter a valid email address."
            : "Enter at least 2 characters.";
        if (!valid) {
          input.setAttribute("aria-invalid", "true");
          first ||= input;
        } else input.removeAttribute("aria-invalid");
      });
      if (first) {
        getElement("teamStatus").textContent = "Check the highlighted fields.";
        first.focus();
        return;
      }
      try {
        checkoutOpen = true;
        const payment = await KicksCheckout.open(cup.fee, cup.name + " · One team entry");
        checkoutOpen = false;
        if (!payment) return;
        if (KicksAuth.current()?.id !== account.id) throw Error("Please sign in again.");
        (await KicksStore.join(account.id, "tournaments", cup.id, {
          payment,
          teamId: teamSelect.value,
          teamName: getElement("teamName").value,
          captain: getElement("captainName").value,
          email: getElement("captainEmail").value,
        }));
        Object.assign(cup, KicksStore.find("tournaments", cup.id));
        teamSelect.disabled=true; renderRegistered();
        getElement("cupTeamCount").textContent =
          cup.teams +
          " / " +
          cup.capacity +
          " teams · " +
          remaining(cup) +
          " spots left";
        getElement("cupProgress").value = cup.teams;
        inputs.forEach((id) => (getElement(id).disabled = true));
        getElement("teamSubmit").disabled = true;
        getElement("teamSubmit").textContent = "Registered ✓";
      } catch (error) {
        checkoutOpen = false;
        getElement("teamStatus").textContent = error.message;
        return;
      }
      getElement("teamStatus").textContent = "";
      getElement("teamPreview").textContent =
        `${getElement("teamName").value} · Captain: ${getElement("captainName").value} · ${cup.name} · ${dateText(cup.date)} at ${cup.time} (Amman) · ${cup.fee} JD per team.`;
      KicksDialogs.open(getElement("teamDialog"));
    });
    getElement("teamDialog").addEventListener("click", (event) => {
      if (event.target === getElement("teamDialog"))
        getElement("teamDialog").close();
    });
    getElement("teamDialog").addEventListener("close", () => {
      getElement("teamPreview").textContent = "";
      getElement("teamForm").reset();
    });
    function refreshDetails() {
      const latest=KicksStore.find('tournaments',cup.id), current=KicksAuth.current();
      const visible=latest && (KicksStore.publicActivities('tournaments').some(t=>t.id===cup.id) || KicksStore.tournamentAccess(cup.id).view);
      const terms=['name','fieldId','date','time','durationMinutes','fee','capacity','status'];
      const changed=latest && terms.some(k=>JSON.stringify(cup[k])!==JSON.stringify(latest[k]));
      if(latest) Object.assign(cup,latest);
      const registered=current && KicksStore.list('registrations').some(r=>r.userId===current.id && r.tournamentId===cup.id && r.status==='Registered');
      if(checkoutOpen && (!visible || changed || !open(cup) || registered)) {
        KicksCheckout.cancel();
        getElement('teamStatus').textContent='Tournament availability or details changed. Review the latest information before paying.';
      }
      getElement('cupContent').hidden=!visible;
      getElement('cupMissing').hidden=!!visible;
      if(!visible){closeRegistration();if(getElement('teamDialog').open)getElement('teamDialog').close();return;}
      const venue=fieldFor(cup);
      field=venue;
      getElement('cupTitle').textContent=cup.name;
      document.title=`${cup.name} | KICKS`;
      getElement('cupFee').textContent=cup.fee;
      getElement('cupPrize').textContent=cup.prize;
      getElement('cupAvailability').textContent=status(cup);
      getElement('cupTeamCount').textContent=`${cup.teams} / ${cup.capacity} teams · ${remaining(cup)} ${remaining(cup)===1?'spot':'spots'} left`;
      getElement('cupProgress').max=cup.capacity;getElement('cupProgress').value=cup.teams;
      getElement('cupLocation').textContent=`${venue.name} · ${venue.area}, ${venue.city}`;
      getElement('cupFieldLink').href=`../Fields/field-details.html?id=${venue.id}`;
      getElement('cupPhoto').src=KicksAuth.fieldImage(venue);
      getElement('cupPhoto').alt=`Football pitch at ${venue.name}`;
      getElement('cupSystem').textContent=cup.bracket?.started || cup.system==='Single elimination'
        ? 'Single elimination: winners advance through the tournament bracket below.'
        : 'Two groups of four teams. The top two in each group advance to semi-finals, followed by the final.';
      const facts=getElement('cupFacts').querySelectorAll('strong');
      if(facts.length===4){facts[0].textContent=dateText(cup.date);facts[1].textContent=cup.time+' · '+cup.durationMinutes+' min · Amman';facts[2].textContent=venue.type;facts[3].textContent=cup.level;}
      const closed=!open(cup)||!!registered;
      teamSelect.disabled=closed;inputs.forEach(id=>getElement(id).disabled=closed);
      getElement('teamSubmit').disabled=closed;
      getElement('teamSubmit').textContent=registered?'Registered ✓':closed?status(cup):'Register team';
      renderRegistered();
    }
    window.addEventListener('storage',refreshDetails);
    window.addEventListener('kicks-data-change',refreshDetails);
    window.addEventListener('kicks-account-change',refreshDetails);
    KicksStore.watchActivityClock(refreshDetails);
    return;
  }
  const form = getElement("cupFilters");
  function render() {
    tournaments = KicksStore.publicActivities("tournaments");
    const values = {};
    for (const [name, value] of new FormData(form)) {
      values[name] = value;
    }
    const query = (values.search || "").trim().toLowerCase();
    let results = [];
    for (const cup of tournaments) {
      const field = fieldFor(cup);
      const searchableText = `${cup.name} ${field.name} ${field.city}`.toLowerCase();
      if (!searchableText.includes(query)) continue;
      if (values.city && field.city !== values.city) continue;
      if (values.format && field.type !== values.format) continue;
      if (values.open && !open(cup)) continue;
      results.push(cup);
    }
    const sortBy = getElement("cupSort").value;
    results.sort(function (firstCup, secondCup) {
      if (sortBy === "fee") return firstCup.fee - secondCup.fee;
      if (sortBy === "spots") return remaining(secondCup) - remaining(firstCup);
      const firstTime = firstCup.date + "T" + firstCup.time;
      const secondTime = secondCup.date + "T" + secondCup.time;
      return firstTime.localeCompare(secondTime);
    });
    results = window.KicksNearby?.apply("tournaments", results) || results;
    getElement("cupCount").textContent =
      `${results.length} ${results.length === 1 ? "tournament" : "tournaments"} found`;
    getElement("cupEmpty").hidden = results.length > 0;
    let tournamentCards = "";
    for (const cup of results) {
      const field = fieldFor(cup);
      let closedClass = "";
      if (!open(cup)) closedClass = "closed";
      tournamentCards += `
        <article class="cup-card" data-cup-id="${cup.id}" tabindex="0" role="link" aria-label="View ${KicksStore.escape(cup.name)}">
          <div class="cup-card-image">
            <img src="${KicksAuth.fieldImage(field)}" alt="Football pitch at ${KicksStore.escape(field.name)}" loading="lazy">
            <span class="cup-badge ${closedClass}">${status(cup)}</span>
            <span class="cup-format">${KicksStore.escape(field.type)}</span>
          </div>
          <div class="cup-card-body">${window.KicksNearby?.badge("tournaments",cup.id) || ""}
            <p class="cup-level">${KicksStore.escape(cup.level)}</p>
            <h3>${KicksStore.escape(cup.name)}</h3>
            <p class="cup-card-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${KicksStore.escape(field.name)}, ${KicksStore.escape(field.city)}</p>
            <div class="cup-card-date">
              <span><i class="bi bi-calendar3" aria-hidden="true"></i> ${dateText(cup.date)}</span>
              <span>${KicksStore.escape(cup.time)} · Amman</span>
            </div>
            <div class="cup-card-prize">
              <i class="bi bi-trophy" aria-hidden="true"></i>
              <span>${KicksStore.escape(cup.prize)} <small>prize</small></span>
              <strong>${cup.teams}/${cup.capacity} teams</strong>
            </div>
            <progress value="${cup.teams}" max="${cup.capacity}" aria-label="Registered teams"></progress>
            <div class="cup-card-bottom">
              <p><strong>${cup.fee} JD</strong><span> / team</span></p>
              <a href="tournament-details.html?id=${cup.id}">View tournament ↗<span class="visually-hidden">: ${KicksStore.escape(cup.name)}</span></a>
            </div>
          </div>
        </article>`;
    }
    getElement("cupGrid").innerHTML = tournamentCards;
  }
  function openCard(event){
    if(event.type==='keydown' && !['Enter',' '].includes(event.key))return;
    if(event.target.closest('a,button,input,select'))return;
    const card=event.target.closest('[data-cup-id]');if(!card)return;
    event.preventDefault();location.assign('tournament-details.html?id='+card.dataset.cupId);
  }
  getElement('cupGrid').addEventListener('click',openCard);
  getElement('cupGrid').addEventListener('keydown',openCard);
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  getElement("cupSort").addEventListener("change", render);
  document.querySelectorAll("[data-clear-cups]").forEach((button) =>
    button.addEventListener("click", () => {
      window.KicksNearby?.clear(false);
      form.reset();
      getElement("cupSort").value = "date";
      render();
    }),
  );
  render();
  window.addEventListener("kicks-nearby-change", render);
  window.addEventListener('storage',event=>{if(event.key==='kicks-data-v2'||event.key===null)render();});
  window.addEventListener('kicks-data-change',render);
  KicksStore.watchActivityClock(render);
})();
