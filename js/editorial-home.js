/* Homepage club presentation. Read-only catalogue projection; no business mutations. */
(() => {
  function render() {
    const host = document.getElementById('home-team-showcase');
    if (!host || !window.KicksStore) return;
    const esc = KicksStore.escape;
    const teams = KicksStore.list('teams').slice(0, 3);
    host.innerHTML = teams.length ? teams.map(team => {
      const logo = /^data:image\/(png|jpeg|webp);base64,/.test(team.logo || '')
        ? `<img src="${esc(team.logo)}" alt="">` : esc(team.initials || String(team.name || '').slice(0, 2));
      const meta = [team.city, Array.isArray(team.members) ? `${team.members.length} players` : ''].filter(Boolean).join(' / ');
      return `<article class="ed-club"><div class="ed-club-top"><span class="ed-club-shield" aria-hidden="true">${logo}</span><span class="ed-club-format">${esc(team.format || '')}</span></div><div><h3>${esc(team.name)}</h3><p>${esc(meta)}</p></div><a aria-label="Meet the squad: ${esc(team.name)}" href="Pages/Teams/teams.html?team=${encodeURIComponent(team.id)}">Meet the squad <span aria-hidden="true">&#8599;</span></a></article>`;
    }).join('') : '<p class="home-empty">No squads in the directory yet. <a href="Pages/Teams/teams.html">Build your team &#8599;</a></p>';
  }
  document.addEventListener('DOMContentLoaded', render, {once:true});
  window.addEventListener('kicks-data-change', render);
  window.addEventListener('storage', event => {if (event.key === 'kicks-data-v2' || event.key === null) render();});
})();
