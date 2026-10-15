// الاجتماعات محفوظة محلياً. صلاحية الكابتن تعتمد على تسجيله الحالي في البطولة.
(() => {
  const store = KicksStore;

  function canManage(cupId, user = KicksAuth.current()) {
    const cup = store.find("tournaments", cupId);
    const field = cup && store.find("fields", cup.fieldId);
    return Boolean(user && cup && field && (user.role === "admin" ||
      (user.role === "owner" && field.ownerId === user.id)));
  }

  function canAccess(meeting, user = KicksAuth.current()) {
    if (!user || !meeting || !store.find("tournaments", meeting.tournamentId)) return false;
    if (canManage(meeting.tournamentId, user)) return true;
    return user.role === "player" && store.list("registrations").some(entry =>
      entry.userId === user.id && entry.tournamentId === meeting.tournamentId && entry.status === "Registered");
  }

  function state(meeting) {
    if (meeting.status !== "Scheduled") return meeting.status;
    const start = new Date(meeting.startsAt).getTime();
    if (Date.now() >= start + meeting.duration * 60000) return "Ended";
    if (Date.now() >= start - 15 * 60000) return "Ready to join";
    return "Scheduled";
  }

  function save(values, id) {
    const old = id ? store.find("meetings", id) : null;
    if (id && (!old || !canManage(old.tournamentId))) throw Error("You cannot edit this meeting.");
    if (old && state(old) !== "Scheduled" && state(old) !== "Ready to join") throw Error("This meeting is closed.");
    const tournamentId = Number(values.tournamentId);
    if (!canManage(tournamentId)) throw Error("Choose a tournament you organise.");
    const cup = store.find("tournaments", tournamentId);
    const title = String(values.title || "").trim();
    const agenda = String(values.agenda || "").trim();
    const start = new Date(values.startsAt).getTime();
    const duration = Number(values.duration);
    const cupStart = new Date(cup.date + "T" + (cup.time || "23:59") + ":00+03:00").getTime();
    if (title.length < 3 || title.length > 80) throw Error("Use a title between 3 and 80 characters.");
    if (agenda.length > 600) throw Error("Keep the agenda under 600 characters.");
    if (!Number.isFinite(start) || start <= Date.now()) throw Error("Choose a future meeting time.");
    if (![15, 30, 45, 60, 90, 120].includes(duration)) throw Error("Choose a valid duration.");
    if (!Number.isFinite(cupStart) || start + duration * 60000 > cupStart) throw Error("The meeting must finish before the tournament starts.");
    const user = KicksAuth.current();
    const organizerId = old?.organizerId || user.id;
    const overlap = store.list("meetings").some(row => row.id !== old?.id && row.status === "Scheduled" &&
      (row.organizerId === organizerId || row.tournamentId === tournamentId) &&
      start < new Date(row.startsAt).getTime() + row.duration * 60000 && start + duration * 60000 > new Date(row.startsAt).getTime());
    if (overlap) throw Error("This time overlaps another meeting for you or this tournament.");
    return store.save("meetings", {
      id: old?.id,
      tournamentId, title, agenda, duration,
      startsAt: new Date(start).toISOString(),
      organizerId,
      roomId: old && old.tournamentId === tournamentId ? old.roomId : "KICKS" + crypto.randomUUID().replaceAll("-", ""),
      status: "Scheduled", createdAt: old?.createdAt || new Date().toISOString(),
    });
  }

  function close(id, status) {
    const meeting = store.find("meetings", id);
    if (!meeting || !canManage(meeting.tournamentId)) throw Error("You cannot manage this meeting.");
    if (!["Cancelled", "Completed"].includes(status)) throw Error("Invalid status.");
    if (["Cancelled", "Completed"].includes(meeting.status)) throw Error("This meeting is already closed.");
    return store.save("meetings", { ...meeting, status });
  }

  function visible() {
    return store.list("meetings").filter(row => canAccess(row)).sort((a, b) => {
      const aOpen = ["Scheduled", "Ready to join"].includes(state(a));
      const bOpen = ["Scheduled", "Ready to join"].includes(state(b));
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return aOpen ? new Date(a.startsAt) - new Date(b.startsAt) : new Date(b.startsAt) - new Date(a.startsAt);
    });
  }

  function dateLabel(meeting) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Amman", dateStyle: "medium", timeStyle: "short" }).format(new Date(meeting.startsAt));
  }

  window.KicksMeetings = { canManage, canAccess, state, save, close, visible, dateLabel };
})();
