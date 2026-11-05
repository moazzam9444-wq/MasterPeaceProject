// دليل الملف: عرض المباريات وفلترتها، وعرض تفاصيل مباراة والانضمام إليها.
// نستخدم نفس الملف للقائمة والتفاصيل؛ نفحص عناصر الصفحة لتحديد العرض.
// UI only: field and game IDs can later map to MVC models or Angular services.
(() => {
  let games = KicksStore.publicActivities("games");
  const element = (id) => document.getElementById(id);
  const dateText = (date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Amman",
    }).format(new Date(`${date}T12:00:00+03:00`));
  const getField = (game) => KicksStore.find('fields',game.fieldId);
  const spots = (game) => game.capacity - game.joined;
  const isUpcoming = (game) =>
    new Date(`${game.date}T${game.time}:00+03:00`) > new Date();
  function status(game) {
    if (KicksStore.hasEnded("games", game)) return "Match ended";
    if (!isUpcoming(game)) return "In progress";
    if (spots(game) === 0) return "Full";
    if (spots(game) <= 2) return "Almost full";
    return "Open game";
  }
  const id = new URLSearchParams(location.search).get("id");
  const detailRoute = location.pathname.endsWith("/game-details.html");
  if (detailRoute) {
    element("gamesListing").hidden = true;
    element("gameDetail").hidden = false;
    const game = games.find((item) => String(item.id) === id);
    if (!game) {
      element("missingGame").hidden = false;
      return;
    }
    let field = getField(game);
    element("gameDetailContent").hidden = false;
    document.title = `${game.title} | KICKS`;
    element("gameTitle").textContent = game.title;
    element("gameSubtitle").textContent =
      `${field.name} · ${field.area}, ${field.city}`;
    element("gameImage").src = `${KicksAuth.fieldImage(field)}`;
    element("gameImage").alt = `Football pitch at ${field.name}`;
    element("matchFacts").innerHTML = [
      ["calendar3", "Date", dateText(game.date)],
      ["clock", "Kickoff", game.time + " · " + game.durationMinutes + " min · Amman"],
      ["people", "Format", field.type],
      ["bar-chart", "Level", game.level],
    ]
      .map(
        ([icon, label, value]) =>
          `<div><i class="bi bi-${icon}" aria-hidden="true"></i><span>${label}</span><strong>${KicksStore.escape(value)}</strong></div>`,
      )
      .join("");
    element("gameFieldLink").href =
      `../Fields/field-details.html?id=${field.id}`;
    element("gamePrice").textContent = game.price;
    element("joinStatus").textContent = status(game);
    element("joinPlayers").textContent =
      `${game.joined} / ${game.capacity} players · ${spots(game)} ${spots(game) === 1 ? "spot" : "spots"} left`;
    element("joinProgress").innerHTML =
      `<progress max="${game.capacity}" value="${game.joined}" aria-label="Players joined"></progress>`;
    const button = element("previewJoin");
    button.disabled = !isUpcoming(game) || spots(game) === 0;
    if (button.disabled) button.textContent = status(game);
    const account = KicksAuth.current();
    const alreadyJoined =
      account &&
      KicksStore.list("memberships").some(
        (entry) =>
          entry.userId === account.id &&
          entry.gameId === game.id &&
          entry.status === "Joined",
      );
    const positionInputs = document.querySelectorAll('[name="playingPosition"]');
    positionInputs.forEach(input => input.addEventListener('change', () => { element('positionError').textContent = ''; }));
    const existingEntry = alreadyJoined && KicksStore.list('memberships').find(entry => entry.userId === account.id && entry.gameId === game.id && entry.status === 'Joined');
    if (existingEntry) positionInputs.forEach(input => { input.checked = input.value === existingEntry.position; input.disabled = true; });
    if (!isUpcoming(game) || spots(game) <= 0) positionInputs.forEach(input => input.disabled = true);
    if (alreadyJoined) {
      button.disabled = true;
      button.textContent = "Joined ✓";
    }
    let checkoutOpen=false;
    button.addEventListener("click", async () => {
      if(checkoutOpen)return;
      refreshDetails();
      const account = KicksAuth.requirePlayer();
      if (!account) return;
      if (!isUpcoming(game) || spots(game) <= 0) {
        button.disabled = true;
        element("joinStatus").textContent = status(game);
        return;
      }
      const position = document.querySelector('[name="playingPosition"]:checked')?.value;
      if (!position) { element('positionError').textContent = 'Choose your playing position before joining.'; positionInputs[0]?.focus(); return; }
      try {
        checkoutOpen=true;
        const payment = await KicksCheckout.open(game.price, game.title + " · One player entry");
        checkoutOpen=false;
        if (!payment) return;
        if (KicksAuth.current()?.id !== account.id) throw Error("Please sign in again.");
        (await KicksStore.join(account.id, "games", game.id, { payment, position }));
        positionInputs.forEach(input => input.disabled = true);
        Object.assign(game, KicksStore.find("games", game.id));
        button.disabled = true;
        button.textContent = "Joined ✓";
        element("joinPlayers").textContent =
          game.joined +
          " / " +
          game.capacity +
          " players · " +
          spots(game) +
          " spots left";
        element("joinProgress").querySelector("progress").value = game.joined;
        element("joinStatus").textContent = "You joined this game as " + position;
      } catch (error) {
        checkoutOpen=false;
        KicksAuth.notify(error.message);
        return;
      }
      element("joinPreviewText").textContent =
        `${game.title} at ${field.name} · ${dateText(game.date)} at ${game.time} (Amman) · ${field.type} · ${game.price} JD per player.`;
      KicksDialogs.open(element("joinDialog"));
    });
    element("joinDialog").addEventListener("click", (event) => {
      if (event.target === element("joinDialog")) element("joinDialog").close();
    });
    function refreshDetails(){
      const latest=KicksStore.find('games',game.id);
      const visible=latest && KicksStore.publicActivities('games').some(g=>g.id===game.id);
      const changed=latest && ['title','fieldId','date','time','durationMinutes','price','capacity','status'].some(k=>JSON.stringify(game[k])!==JSON.stringify(latest[k]));
      if(latest) Object.assign(game,latest);
      const current=KicksAuth.current(),entry=current && KicksStore.list('memberships').find(r=>r.userId===current.id&&r.gameId===game.id&&r.status==='Joined');
      const closed=!visible || !isUpcoming(game) || spots(game)<=0 || !!entry;
      if(checkoutOpen && (changed || closed)){KicksCheckout.cancel();element('positionError').textContent='Match availability or details changed. Review the latest information before paying.';}
      element('gameDetailContent').hidden=!visible;element('missingGame').hidden=!!visible;
      button.disabled=closed;positionInputs.forEach(input=>input.disabled=closed);
      if(!visible){if(element('joinDialog').open)element('joinDialog').close();return;}
      const venue=getField(game);
      field=venue;
      element('gameTitle').textContent=game.title;
      document.title=`${game.title} | KICKS`;
      element('gamePrice').textContent=game.price;
      element('gameSubtitle').textContent=`${venue.name} · ${venue.area}, ${venue.city}`;
      element('gameFieldLink').href=`../Fields/field-details.html?id=${venue.id}`;
      element('gameImage').src=KicksAuth.fieldImage(venue);
      element('gameImage').alt=`Football pitch at ${venue.name}`;
      element('joinPlayers').textContent=`${game.joined} / ${game.capacity} players · ${spots(game)} ${spots(game)===1?'spot':'spots'} left`;
      const progress=element('joinProgress').querySelector('progress');progress.max=game.capacity;progress.value=game.joined;
      const facts=element('matchFacts').querySelectorAll('strong');
      if(facts.length===4){facts[0].textContent=dateText(game.date);facts[1].textContent=game.time+' · '+game.durationMinutes+' min · Amman';facts[2].textContent=venue.type;facts[3].textContent=game.level;}
      element('joinStatus').textContent=entry?'You joined this game as '+entry.position:status(game);
      button.textContent=entry?'Joined ✓':closed?status(game):'Join game';
      if(entry) positionInputs.forEach(input=>input.checked=input.value===entry.position);
    }
    window.addEventListener('storage',refreshDetails);
    window.addEventListener('kicks-data-change',refreshDetails);
    window.addEventListener('kicks-account-change',refreshDetails);
    KicksStore.watchActivityClock(refreshDetails);
    return;
  }
  // The hero reads the same catalogue as the results; no duplicate match data.
  function renderSpotlight() {
    const featured = [...games]
      .filter((game) => isUpcoming(game) && spots(game) > 0)
      .sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
      )[0];
    const spotlight = element("heroSpotlight");
    if (spotlight) spotlight.hidden = !featured;
    if (featured && spotlight) {
      const field = getField(featured);
      spotlight.hidden = false;
      spotlight.innerHTML = `<div class="spotlight-photo"><img src="${KicksAuth.fieldImage(field)}" alt="Football pitch at ${KicksStore.escape(field.name)}"><span class="spotlight-label">UP NEXT</span><span class="spotlight-type">${KicksStore.escape(field.type)}</span></div><div class="spotlight-body"><div class="spotlight-date"><i class="bi bi-calendar3" aria-hidden="true"></i> ${dateText(featured.date)} <span>·</span> ${KicksStore.escape(featured.time)}</div><h2>${KicksStore.escape(featured.title)}</h2><p class="spotlight-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${KicksStore.escape(field.name)}, ${KicksStore.escape(field.city)}</p><div class="spotlight-team"><div class="team-markers" aria-hidden="true"><span>01</span><span>02</span><span>03</span><span>+${Math.max(0, featured.joined - 3)}</span></div><p><strong>${featured.joined} players in.</strong><br><span>${spots(featured)} spots waiting for you.</span></p></div><div class="spotlight-bottom"><p><strong>${featured.price} JD</strong><span> / player</span></p><a href="game-details.html?id=${featured.id}">View this game <span aria-hidden="true">↗</span></a></div></div>`;
    }
  }
  const form = element("gameFilters");
  function renderGames() {
    games = KicksStore.publicActivities("games");
    renderSpotlight();
    const values = {};
    for (const [name, value] of new FormData(form)) {
      values[name] = value;
    }
    const query = element("gameSearch").value.trim().toLowerCase();
    let results = [];
    for (const game of games) {
      const field = getField(game);
      const searchableText = `${game.title} ${field.name} ${field.city}`.toLowerCase();
      if (!searchableText.includes(query)) continue;
      if (values.city && values.city !== field.city) continue;
      if (values.date && values.date !== game.date) continue;
      if (values.format && values.format !== field.type) continue;
      if (values.level && values.level !== game.level) continue;
      if (values.spots && !(spots(game) > 0 && isUpcoming(game))) continue;
      results.push(game);
    }
    const sortBy = element("gameSort").value;
    results.sort(function (firstGame, secondGame) {
      if (sortBy === "price") return firstGame.price - secondGame.price;
      if (sortBy === "spots") return spots(secondGame) - spots(firstGame);
      const firstTime = firstGame.date + "T" + firstGame.time;
      const secondTime = secondGame.date + "T" + secondGame.time;
      return firstTime.localeCompare(secondTime);
    });
    results = window.KicksNearby?.apply("games", results) || results;
    element("gameCount").textContent =
      `${results.length} ${results.length === 1 ? "game" : "games"} found`;
    element("gamesEmpty").hidden = results.length > 0;
    let gameCards = "";
    for (const game of results) {
      const field = getField(game);
      const openSpots = spots(game);
      let badgeClass = "";
      if (!isUpcoming(game) || openSpots === 0) badgeClass = "closed";
      else if (openSpots <= 2) badgeClass = "limited";
      const spotLabel = openSpots === 1 ? "spot" : "spots";
      gameCards += `
        <article class="match-card">
          <div class="match-image">
            <img src="${KicksAuth.fieldImage(field)}" alt="Football pitch at ${KicksStore.escape(field.name)}" loading="lazy">
            <span class="match-badge ${badgeClass}">${status(game)}</span>
            <span class="match-format">${KicksStore.escape(field.type)}</span>
          </div>
          <div class="match-body">${window.KicksNearby?.badge("games",game.id) || ""}
            <span class="match-level">${KicksStore.escape(game.level)}</span>
            <h3>${KicksStore.escape(game.title)}</h3>
            <p class="match-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${KicksStore.escape(field.name)}, ${KicksStore.escape(field.city)}</p>
            <div class="match-schedule">
              <span><i class="bi bi-calendar3" aria-hidden="true"></i> ${dateText(game.date)}</span>
              <span><i class="bi bi-clock" aria-hidden="true"></i> ${KicksStore.escape(game.time)}</span>
            </div>
            <div class="match-players">
              <span><strong>${game.joined}</strong> / ${game.capacity} players</span>
              <strong>${openSpots} ${spotLabel} left</strong>
            </div>
            <progress max="${game.capacity}" value="${game.joined}" aria-label="Players joined"></progress>
            <div class="match-bottom">
              <p><strong>${game.price} <small>JD</small></strong><span> / player</span></p>
              <a href="game-details.html?id=${game.id}">View game ↗<span class="visually-hidden">: ${KicksStore.escape(game.title)}</span></a>
            </div>
          </div>
        </article>`;
    }
    element("gamesGrid").innerHTML = gameCards;
  }
  form.addEventListener("change", renderGames);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderGames();
  });
  element("gameSearch").addEventListener("input", renderGames);
  element("gameSort").addEventListener("change", renderGames);
  element("gameSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderGames();
    element("gameCount").scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
  document.querySelectorAll("[data-reset]").forEach((button) =>
    button.addEventListener("click", () => {
      window.KicksNearby?.clear(false);
      form.reset();
      element("gameSearch").value = "";
      element("gameSort").value = "soonest";
      renderGames();
    }),
  );
  renderGames();
  window.addEventListener("kicks-nearby-change", renderGames);
  window.addEventListener('storage',event=>{if(event.key==='kicks-data-v2'||event.key===null)renderGames();});
  window.addEventListener('kicks-data-change',renderGames);
  KicksStore.watchActivityClock(renderGames);
})();
