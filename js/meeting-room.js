// لا يتم تحميل Jitsi أو طلب الكاميرا والمايك إلا بعد الضغط على Join meeting.
(() => {
  if (!KicksAuth.current()) {
    location.replace(KicksAuth.loginUrl());
    return;
  }
  const id = Number(new URLSearchParams(location.search).get("id"));
  const esc = KicksStore.escape;
  const details = document.getElementById("meetingDetails");
  let api = null;
  let loading = false;
  let scriptPromise = null;
  let loadAttempts = 0;
  let pageKey = "";
  let meetingKey = "";
  let generation = 0;
  document.getElementById("meetingBack").href = KicksAuth.dashboard() + "#meetings";
  document.getElementById("meetingBack").textContent = "Back to meetings";

  function dispose() {
    generation++;
    loading = false;
    const previous = api;
    api = null;
    if (previous) previous.dispose();
  }

  function render(force = false) {
    const meeting = KicksStore.find("meetings", id);
    const allowed = KicksMeetings.canAccess(meeting);
    if (!allowed) {
      dispose();
      details.innerHTML = '<section class="meeting-room-panel"><h1>Meeting unavailable</h1><p>This meeting is for the organiser and captains currently registered in its tournament. Check your account or return to your meetings.</p></section>';
      return;
    }
    const status = KicksMeetings.state(meeting);
    const cup = KicksStore.find("tournaments", meeting.tournamentId);
    const captains = KicksStore.list("registrations").filter(row => row.tournamentId === cup.id && row.status === "Registered");
    const key = JSON.stringify([meeting, status, captains]);
    if (!force && key === pageKey) return;
    // تحديث قائمة الكباتن لا يقطع مكالمة جارية؛ الإلغاء أو انتهاء الوقت يغلقان الغرفة هنا.
    if ((api || loading) && status === "Ready to join" && JSON.stringify(meeting) === meetingKey && !force) {
      document.getElementById("meetingRoster").innerHTML = roster(captains);
      pageKey = key;
      return;
    }
    dispose();
    pageKey = key;
    meetingKey = JSON.stringify(meeting);
    const host = KicksStore.find("users", meeting.organizerId);
    details.innerHTML = `<header class="meeting-room-header"><span class="meeting-status">${esc(status)}</span><p class="meeting-cup">${esc(cup.name)}</p><h1>${esc(meeting.title)}</h1><p>${esc(KicksMeetings.dateLabel(meeting))} · Amman time · ${meeting.duration} minutes</p></header>
      <div class="meeting-room-layout"><section class="meeting-stage" aria-label="Video meeting"><div id="meetingStageContent" class="meeting-stage-content"><div class="meeting-symbol" aria-hidden="true">◉</div><h2>Your team. One conversation.</h2>
      <p>${status === "Ready to join" ? "Check your microphone and camera before joining the captains’ briefing." : status === "Scheduled" ? "Your room opens 15 minutes before the scheduled time. This page updates automatically." : "This meeting is closed. You can return to your dashboard for other meetings."}</p>
      <button type="button" class="meeting-primary" id="joinMeeting" ${status === "Ready to join" ? "" : "disabled"}>Join meeting</button>
      <p id="meetingConnection" role="status"></p><a id="meetingDirect" class="meeting-direct" ${status === "Ready to join" ? "" : "hidden"} rel="noopener noreferrer" target="_blank">Open meeting directly on Jitsi</a></div><div id="jitsiContainer" hidden></div></section>
      <aside class="meeting-room-panel"><p class="meeting-cup">MATCHDAY BRIEFING</p><h2>Meeting details</h2><p>Hosted by <strong>${esc(host?.name || "Tournament organiser")}</strong></p><h3>Agenda</h3><p class="meeting-agenda">${esc(meeting.agenda || "Tournament draw, match rules and questions from team captains.")}</p><h3>Registered teams <span>(${captains.length})</span></h3><ul id="meetingRoster">${roster(captains)}</ul><div class="meeting-actions"><a class="meeting-secondary" href="${KicksAuth.url("Pages/Tournaments/tournament-details.html?id=" + cup.id)}">View tournament</a></div></aside></div>
      <div class="meeting-actions"><button type="button" class="meeting-secondary" id="leaveMeeting" hidden>Leave call</button><a class="meeting-secondary" id="meetingExternal" hidden rel="noopener noreferrer" target="_blank">Open with Jitsi instead</a></div>
      <p class="meeting-note meeting-provider-note">Calls are provided by Jitsi. Your browser will ask before using your camera or microphone. The first person to create a room on meet.jit.si may need to sign in. <a href="https://jitsi.org/blog/authentication-on-meet-jit-si/" target="_blank" rel="noopener noreferrer">Jitsi room access</a></p>`;
    document.getElementById("joinMeeting").onclick = join;
    document.getElementById("leaveMeeting").onclick = () => render(true);
    for (const linkId of ["meetingDirect", "meetingExternal"]) {
      const external = document.getElementById(linkId);
      external.href = "https://meet.jit.si/" + encodeURIComponent(meeting.roomId);
      external.onclick = event => {
        const current = KicksStore.find("meetings", id);
        if (!KicksMeetings.canAccess(current) || KicksMeetings.state(current) !== "Ready to join") {
          event.preventDefault(); render(true);
        }
      };
    }
  }

  function roster(captains) {
    return captains.map(row => `<li><strong>${esc(row.teamName)}</strong><span>${esc(row.captain || KicksStore.find("users", row.userId)?.name || "Team captain")}</span></li>`).join("") || '<li>No teams registered yet.</li>';
  }

  function loadJitsi() {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      // المحاولة الثانية تتجنب نسخة فاشلة مخزنة مؤقتاً في المتصفح.
      loadAttempts++;
      script.src = "https://meet.jit.si/external_api.js" + (loadAttempts > 1 ? "?retry=" + Date.now() : "");
      let finished = false;
      const timeout = setTimeout(() => done(Error("Jitsi did not respond in time. Try again or use the direct meeting link below.")), 20000);
      function done(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); }
        else resolve();
      }
      script.onload = () => done(window.JitsiMeetExternalAPI ? null : Error("Jitsi is unavailable. Please try again."));
      script.onerror = () => done(Error("The browser could not load Jitsi. The service or its script may be blocked or temporarily unavailable. Try again or open the meeting directly below."));
      document.head.append(script);
    }).catch(error => {
      scriptPromise = null;
      throw error;
    });
    return scriptPromise;
  }

  async function join() {
    const meeting = KicksStore.find("meetings", id);
    if (!KicksMeetings.canAccess(meeting) || KicksMeetings.state(meeting) !== "Ready to join") { render(true); return; }
    if (loading || api) return;
    loading = true;
    const request = ++generation;
    const button = document.getElementById("joinMeeting");
    button.disabled = true;
    button.textContent = "Connecting…";
    document.getElementById("meetingConnection").textContent = "Connecting to Jitsi…";
    document.getElementById("meetingExternal").hidden = false;
    try {
      await loadJitsi();
      if (request !== generation) return;
      const current = KicksStore.find("meetings", id);
      if (!KicksMeetings.canAccess(current) || KicksMeetings.state(current) !== "Ready to join") { render(true); return; }
      const container = document.getElementById("jitsiContainer");
      container.hidden = false;
      api = new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: current.roomId, width: "100%", height: "100%", parentNode: container, lang: "en",
        userInfo: { displayName: KicksAuth.current().name },
        configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true, prejoinConfig: { enabled: true }, deeplinking: { disabled: true } },
      });
      document.getElementById("meetingStageContent").hidden = true;
      const frame = container.querySelector("iframe");
      if (frame) frame.title = "KICKS tournament meeting — Jitsi";
      document.getElementById("leaveMeeting").hidden = false;
      api.addListener("readyToClose", () => render(true));
    } catch (error) {
      api?.dispose(); api = null;
      if (request !== generation) return;
      document.getElementById("jitsiContainer").hidden = true;
      document.getElementById("meetingStageContent").hidden = false;
      document.getElementById("meetingConnection").textContent = error.message || "Unable to connect. Please try again.";
      button.disabled = false;
      button.textContent = "Try again";
    } finally { if (request === generation) loading = false; }
  }
  render();
  const timer = setInterval(render, 15000);
  window.addEventListener("storage", () => render());
  window.addEventListener("kicks-data-change", () => render());
  window.addEventListener("kicks-account-change", () => render());
  window.addEventListener("pagehide", () => { clearInterval(timer); dispose(); });
})();
