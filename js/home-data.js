// دليل الملف: إنشاء كروت الهوم من الملاعب والمباريات والبطولات المحفوظة.
// كروت الهوم تأتي من الملاعب والأحداث المنشورة فقط.
{
  const store = KicksStore;
  const escapeHtml = store.escape;
  const fields = store.list("fields");
  function fieldCard(field) {
    // Smaller homepage copies; uploaded photos stay exactly as supplied.
    const image = KicksAuth.fieldImage(field).replace(/assets\/images\/(field[1-4])\.jpg$/, "assets/images/$1-home.webp");
    let availability = "Check schedule";
    if (field.today) availability = "Available today";
    return `
    <div class="col-lg-3 col-md-6"><article class="field-card">
      <div class="field-image-wrapper"><img class="field-image" src="${image}" alt="${escapeHtml(field.name)}" loading="lazy" decoding="async"><span class="field-price">${field.price} JD / hour</span></div>
      <div class="field-card-body"><h3>${escapeHtml(field.name)}</h3><p class="field-location">${escapeHtml(field.city)}</p>
      <div class="field-details"><span>${escapeHtml(field.type)}</span><span>${availability}</span></div>
      <a class="field-btn" href="Pages/Fields/field-details.html?id=${field.id}">View field ↗</a></div>
    </article></div>`;
  }
  function gameCard(game) {
    const field = fields.find(function (item) {
      return item.id === game.fieldId;
    });
    const spots = game.capacity - game.joined;
    let status = "Full";
    if (spots > 0) status = "Open";
    return `
    <div class="col-lg-4 col-md-6"><article class="game-card">
      <div class="game-card-header"><span class="game-status">${status}</span><span class="game-date">${escapeHtml(game.date)}</span></div>
      <h3>${escapeHtml(game.title)}</h3><p class="game-field">${escapeHtml(field.name)}, ${escapeHtml(field.city)}</p>
      <div class="game-info"><div class="game-info-item"><div><span>Time</span><strong>${escapeHtml(game.time)}</strong></div></div><div class="game-info-item"><div><span>Format</span><strong>${escapeHtml(field.type)}</strong></div></div></div>
      <div class="players-info"><div><span class="players-label">Players</span><div class="players-count"><strong>${game.joined}</strong><span>/ ${game.capacity} joined</span></div></div><span class="spots-left">${spots} spots left</span></div>
      <div class="players-progress"><div class="players-progress-bar" style="width:${(game.joined / game.capacity) * 100}%"></div></div>
      <a class="join-game-btn" href="Pages/OpenGames/game-details.html?id=${game.id}">View game ↗</a>
    </article></div>`;
  }
  function tournamentCard(cup) {
    const field = fields.find(function (item) {
      return item.id === cup.fieldId;
    });
    let status = "Full";
    if (cup.teams < cup.capacity) status = "Registration open";
    return `
    <div class="col-lg-4 col-md-6"><article class="tournament-card">
      <div class="tournament-top"><div class="tournament-icon"><i class="bi bi-trophy" aria-hidden="true"></i></div><span class="tournament-status">${status}</span></div>
      <h3>${escapeHtml(cup.name)}</h3><p class="tournament-location">${escapeHtml(field.name)}, ${escapeHtml(field.city)}</p>
      <div class="tournament-info"><div class="tournament-info-item"><div><span>Date</span><strong>${escapeHtml(cup.date)}</strong></div></div>
      <div class="tournament-info-item"><div><span>Format</span><strong>${escapeHtml(field.type)}</strong></div></div>
      <div class="tournament-info-item"><div><span>Teams</span><strong>${escapeHtml(cup.teams + " / " + cup.capacity)}</strong></div></div>
      <div class="tournament-info-item"><div><span>Entry fee</span><strong>${escapeHtml(cup.fee + " JD")}</strong></div></div></div>
      <a class="tournament-btn" href="Pages/Tournaments/tournament-details.html?id=${cup.id}">View tournament ↗</a>
    </article></div>`;
  }
  // نختار الأحداث القادمة، ثم نعرض أول ثلاثة منها فقط.
  const upcomingGames = [];
  for (const game of store.list("games")) {
    const kickoff = new Date(game.date + "T" + game.time + ":00+03:00");
    if (kickoff > new Date()) upcomingGames.push(game);
  }
  const upcomingTournaments = [];
  for (const cup of store.list("tournaments")) {
    const kickoff = new Date(cup.date + "T" + cup.time + ":00+03:00");
    if (kickoff > new Date()) upcomingTournaments.push(cup);
  }

  // كل قائمة تجمع HTML الكروت ثم تعرضه مرة واحدة.
  let fieldCards = "";
  for (const field of fields.slice(0, 4)) fieldCards += fieldCard(field);
  if (!fieldCards)
    fieldCards =
      '<p class="home-empty">No fields published yet. Check back soon.</p>';
  document.getElementById("home-fields-grid").innerHTML = fieldCards;

  let gameCards = "";
  for (const game of upcomingGames.slice(0, 3)) gameCards += gameCard(game);
  if (!gameCards)
    gameCards = '<p class="home-empty">No upcoming games yet.</p>';
  document.getElementById("home-open-games-grid").innerHTML = gameCards;

  let tournamentCards = "";
  for (const cup of upcomingTournaments.slice(0, 3))
    tournamentCards += tournamentCard(cup);
  if (!tournamentCards)
    tournamentCards = '<p class="home-empty">No upcoming tournaments yet.</p>';
  document.getElementById("home-tournaments-grid").innerHTML = tournamentCards;
  const contact = document.getElementById("homeContact");
  if (contact && store.settings().contact) {
    contact.textContent = store.settings().contact;
    contact.hidden = false;
  }
}
