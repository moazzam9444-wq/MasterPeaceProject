// دليل الملف: عرض المباريات وفلترتها، وعرض تفاصيل مباراة والانضمام إليها.
// نستخدم نفس الملف للقائمة والتفاصيل؛ نفحص عناصر الصفحة لتحديد العرض.
// UI only: field and game IDs can later map to MVC models or Angular services.
(() => {
  const fields = KicksStore.list("fields");
  const games = KicksStore.list("games");
  const element = (id) => document.getElementById(id);
  const dateText = (date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Amman",
    }).format(new Date(`${date}T12:00:00+03:00`));
  const getField = (game) => fields.find((field) => field.id === game.fieldId);
  const spots = (game) => game.capacity - game.joined;
  const isUpcoming = (game) =>
    new Date(`${game.date}T${game.time}:00+03:00`) > new Date();
  function status(game) {
    if (!isUpcoming(game)) return "Match ended";
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
    const field = getField(game);
    element("gameDetailContent").hidden = false;
    document.title = `${game.title} | KICKS`;
    element("gameTitle").textContent = game.title;
    element("gameSubtitle").textContent =
      `${field.name} · ${field.area}, ${field.city}`;
    element("gameImage").src = `${KicksAuth.fieldImage(field)}`;
    element("gameImage").alt = `Football pitch at ${field.name}`;
    element("matchFacts").innerHTML = [
      ["calendar3", "Date", dateText(game.date)],
      ["clock", "Kickoff", game.time + " · Amman"],
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
    if (alreadyJoined) {
      button.disabled = true;
      button.textContent = "Joined ✓";
    }
    button.addEventListener("click", async () => {
      const account = KicksAuth.requirePlayer();
      if (!account) return;
      if (!isUpcoming(game) || spots(game) <= 0) {
        button.disabled = true;
        element("joinStatus").textContent = status(game);
        return;
      }
      try {
        const payment = await KicksCheckout.open(game.price, game.title + " · One player entry");
        if (!payment) return;
        if (KicksAuth.current()?.id !== account.id) throw Error("Please sign in again.");
        KicksStore.join(account.id, "games", game.id, { payment });
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
        element("joinStatus").textContent = "You joined this game";
      } catch (error) {
        KicksAuth.notify(error.message);
        return;
      }
      element("joinPreviewText").textContent =
        `${game.title} at ${field.name} · ${dateText(game.date)} at ${game.time} (Amman) · ${field.type} · ${game.price} JD per player.`;
      element("joinDialog").showModal();
    });
    element("joinDialog").addEventListener("click", (event) => {
      if (event.target === element("joinDialog")) element("joinDialog").close();
    });
    return;
  }
  // The hero reads the same catalogue as the results; no duplicate match data.
  const featured = [...games]
    .filter((game) => isUpcoming(game) && spots(game) > 0)
    .sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    )[0];
  const spotlight = element("heroSpotlight");
  if (featured && spotlight) {
    const field = getField(featured);
    spotlight.hidden = false;
    spotlight.innerHTML = `<div class="spotlight-photo"><img src="${KicksAuth.fieldImage(field)}" alt="Football pitch at ${KicksStore.escape(field.name)}"><span class="spotlight-label">UP NEXT</span><span class="spotlight-type">${KicksStore.escape(field.type)}</span></div><div class="spotlight-body"><div class="spotlight-date"><i class="bi bi-calendar3" aria-hidden="true"></i> ${dateText(featured.date)} <span>·</span> ${KicksStore.escape(featured.time)}</div><h2>${KicksStore.escape(featured.title)}</h2><p class="spotlight-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${KicksStore.escape(field.name)}, ${KicksStore.escape(field.city)}</p><div class="spotlight-team"><div class="team-markers" aria-hidden="true"><span>01</span><span>02</span><span>03</span><span>+${Math.max(0, featured.joined - 3)}</span></div><p><strong>${featured.joined} players in.</strong><br><span>${spots(featured)} spots waiting for you.</span></p></div><div class="spotlight-bottom"><p><strong>${featured.price} JD</strong><span> / player</span></p><a href="game-details.html?id=${featured.id}">View this game <span aria-hidden="true">↗</span></a></div></div>`;
  }
  const form = element("gameFilters");
  function renderGames() {
    const values = {};
    for (const [name, value] of new FormData(form)) {
      values[name] = value;
    }
    const query = element("gameSearch").value.trim().toLowerCase();
    const results = [];
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
          <div class="match-body">
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
      form.reset();
      element("gameSearch").value = "";
      element("gameSort").value = "soonest";
      renderGames();
    }),
  );
  renderGames();
})();
