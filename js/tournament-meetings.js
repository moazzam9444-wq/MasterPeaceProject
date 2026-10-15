// لا نعرض رابط الاجتماع للزائر أو لاعب غير مسجل في البطولة.
(() => {
  const panel = document.getElementById("cupMeetings");
  if (!panel) return;
  const cupId = Number(new URLSearchParams(location.search).get("id"));
  const esc = KicksStore.escape;
  function render() {
    const rows = KicksMeetings.visible().filter(row => row.tournamentId === cupId && ["Scheduled", "Ready to join"].includes(KicksMeetings.state(row)));
    const organiser = KicksMeetings.canManage(cupId);
    panel.hidden = !rows.length && !organiser;
    panel.innerHTML = '<h2>Captains’ meetings</h2>' + rows.map(row => `<article class="meeting-card"><span class="meeting-status">${esc(KicksMeetings.state(row))}</span><h3>${esc(row.title)}</h3><p>${esc(KicksMeetings.dateLabel(row))} · Amman · ${row.duration} minutes</p><a class="meeting-primary" href="${KicksAuth.url("Pages/Meetings/meeting.html?id=" + row.id)}">View meeting</a></article>`).join("") + (organiser ? `<div class="meeting-actions"><a class="meeting-secondary" href="${KicksAuth.dashboard()}#meetings">Manage meetings</a></div>` : "");
  }
  render();
  window.addEventListener("kicks-data-change", render);
  window.addEventListener("storage", render);
  window.addEventListener("kicks-account-change", render);
})();
