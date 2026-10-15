// قسم الاجتماعات مشترك بين لوحات اللاعب وصاحب الملعب والأدمن.
(() => {
  const meetings = KicksMeetings;
  const esc = KicksStore.escape;

  function render() {
    const user = KicksAuth.current();
    if (!user) return;
    const organiser = user.role !== "player";
    const rows = meetings.visible();
    let cards = "";
    for (const row of rows) {
      const cup = KicksStore.find("tournaments", row.tournamentId);
      const status = meetings.state(row);
      const open = status === "Scheduled" || status === "Ready to join";
      cards += `<article class="meeting-card"><div class="meeting-card-top"><span class="meeting-symbol" aria-hidden="true">◉</span><span class="meeting-status">${esc(status)}</span></div>
        <p class="meeting-cup">${esc(cup.name)}</p><h3>${esc(row.title)}</h3>
        <p>${esc(meetings.dateLabel(row))} · Amman</p><p>${row.duration} minutes · Organiser & team captains</p>
        <div class="meeting-actions"><a class="meeting-primary" href="${KicksAuth.url("Pages/Meetings/meeting.html?id=" + row.id)}">${status === "Ready to join" ? "Join meeting" : "View meeting"}</a>
        ${meetings.canManage(row.tournamentId) && open ? `<button type="button" class="meeting-secondary" data-meeting-edit="${row.id}">Edit</button><button type="button" class="meeting-text" data-meeting-close="${row.id}" data-status="Cancelled">Cancel</button><button type="button" class="meeting-text" data-meeting-close="${row.id}" data-status="Completed">Mark completed</button>` : ""}</div></article>`;
    }
    document.getElementById("dashboardView").innerHTML = `<div id="meetingBoard"><div class="view-heading"><div><h2>${organiser ? "Bring the captains together" : "Your team, in the loop"}</h2><p>Discuss the draw, match rules and tournament arrangements.</p></div>${organiser ? '<button type="button" class="meeting-primary" data-meeting-new>Schedule meeting</button>' : ""}</div>
      <p class="meeting-note">Times are shown in Amman time. Rooms open 15 minutes before the meeting. Meeting records are saved on this browser.</p>
      <p id="meetingNotice" role="status"></p><div class="meeting-grid">${cards || '<section class="dash-panel meeting-empty"><h3>No meetings yet</h3><p>' + (organiser ? 'Schedule a briefing for the captains in one of your tournaments.' : 'Meetings for tournaments you have registered a team in will appear here.') + '</p></section>'}</div></div>`;
  }

  function openEditor(id) {
    const old = id ? KicksStore.find("meetings", id) : null;
    const cups = KicksStore.list("tournaments").filter(cup => meetings.canManage(cup.id) && new Date(cup.date + "T" + (cup.time || "23:59") + ":00+03:00") > new Date());
    if (!cups.length) {
      document.getElementById("meetingNotice").textContent = "Add an upcoming tournament before scheduling a meeting.";
      return;
    }
    document.getElementById("meetingEditor")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "meetingEditor";
    dialog.className = "meeting-dialog";
    dialog.setAttribute("aria-labelledby", "meetingEditorTitle");
    const localTime = old ? new Date(new Date(old.startsAt).getTime() + 3 * 3600000).toISOString().slice(0, 16) : "";
    let tournamentOptions = "";
    for (const cup of cups) {
      let selected = "";
      if (old && old.tournamentId === cup.id) selected = "selected";
      tournamentOptions += `<option value="${cup.id}" ${selected}>${esc(cup.name)}</option>`;
    }
    let durationOptions = "";
    const selectedDuration = old?.duration || 30;
    for (const minutes of [15, 30, 45, 60, 90, 120]) {
      let selected = "";
      if (minutes === selectedDuration) selected = "selected";
      durationOptions += `<option value="${minutes}" ${selected}>${minutes} minutes</option>`;
    }
    dialog.innerHTML = `<form id="meetingForm"><div class="meeting-dialog-heading"><h2 id="meetingEditorTitle">${old ? "Edit" : "Schedule"} meeting</h2><button type="button" class="meeting-secondary" data-meeting-dismiss aria-label="Close meeting form">×</button></div>
      <label for="meetingCup">Tournament</label><select id="meetingCup" name="tournamentId" required>${tournamentOptions}</select>
      <label for="meetingTitle">Meeting title</label><input id="meetingTitle" name="title" minlength="3" maxlength="80" value="${esc(old?.title || "Captains’ briefing")}" required>
      <div class="meeting-form-row"><div><label for="meetingStart">Date & time (Amman)</label><input id="meetingStart" name="start" type="datetime-local" value="${localTime}" required></div><div><label for="meetingDuration">Duration</label><select id="meetingDuration" name="duration">${durationOptions}</select></div></div>
      <label for="meetingAgenda">Agenda (optional)</label><textarea id="meetingAgenda" name="agenda" maxlength="600" rows="3">${esc(old?.agenda || "")}</textarea>
      <p class="meeting-note">Registered captains can find this meeting in My Meetings. No email invitations are sent.</p><p id="meetingError" role="alert"></p>
      <button class="meeting-primary" type="submit">Save meeting</button></form>`;
    document.body.append(dialog);
    dialog.querySelector("[data-meeting-dismiss]").onclick = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.querySelector("form").onsubmit = event => {
      event.preventDefault();
      const values = {};
      for (const [name, value] of new FormData(event.target)) {
        values[name] = value;
      }
      values.startsAt = values.start + ":00+03:00";
      try {
        meetings.save(values, old?.id);
        dialog.close();
        render();
        document.getElementById("meetingNotice").textContent = "Meeting saved. Registered captains can view it on this browser.";
      } catch (error) { dialog.querySelector("#meetingError").textContent = error.message; }
    };
    dialog.showModal();
  }

  document.addEventListener("click", event => {
    if (!document.getElementById("meetingBoard")) return;
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-meeting-new")) openEditor();
    if (button.dataset.meetingEdit) openEditor(Number(button.dataset.meetingEdit));
    if (button.dataset.meetingClose) {
      const status = button.dataset.status;
      const dialog = document.createElement("dialog");
      dialog.className = "meeting-dialog";
      dialog.setAttribute("aria-label", status === "Cancelled" ? "Cancel meeting" : "Mark meeting completed");
      dialog.innerHTML = `<h2>${status === "Cancelled" ? "Cancel this meeting?" : "Mark this meeting completed?"}</h2><p>${status === "Cancelled" ? "Captains will no longer be able to join from KICKS." : "This closes the KICKS entry. It does not end an ongoing Jitsi call for everyone."}</p><div class="meeting-actions"><button class="meeting-secondary" data-keep>Keep meeting</button><button class="meeting-primary" data-confirm>Confirm</button></div><p role="alert"></p>`;
      document.body.append(dialog);
      dialog.querySelector("[data-keep]").onclick = () => dialog.close();
      dialog.querySelector("[data-confirm]").onclick = () => {
        try { meetings.close(Number(button.dataset.meetingClose), status); dialog.close(); render(); }
        catch (error) { dialog.querySelector('[role="alert"]').textContent = error.message; }
      };
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      dialog.showModal();
    }
  });
  function refresh() {
    if (document.getElementById("meetingBoard") && !document.querySelector(".meeting-dialog[open]")) render();
  }
  window.addEventListener("storage", refresh);
  window.addEventListener("kicks-data-change", refresh);
  window.addEventListener("hashchange", () => {
    document.querySelectorAll(".meeting-dialog[open]").forEach(dialog => dialog.close());
  });
  setInterval(refresh, 30000);
  window.KicksMeetingUI = { render };
})();
