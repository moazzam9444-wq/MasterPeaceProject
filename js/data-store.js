// دليل الملف: تخزين البيانات محلياً: القراءة والحفظ والحذف، ثم الحجز والانضمام. لا تحذف التحقق قبل الحفظ.
// بيانات الموقع محفوظة على هذا المتصفح. لا توجد قاعدة بيانات مشتركة بين الأجهزة.
{
  const storageKey = "kicks-data-v2";
  const collections = [
    "fields",
    "games",
    "tournaments",
    "users",
    "bookings",
    "memberships",
    "registrations",
  ];
  const initialData = {
    fields: [],
    games: [],
    tournaments: [],
    bookings: [],
    memberships: [],
    registrations: [],
    payments: [],
    feedback: [],
    meetings: [],
    teams: [],
    teamRequests: [],
    challenges: [],
    challengeRequests: [],
    users: [structuredClone(window.KicksAdminAccount)],
    settings: {
      title: "Football brings us together.",
      description:
        "Find your pitch, meet your team and make your next match happen.",
      contact: "",
      city: "Jordan",
      commissionRate: 10,
      listingFee: 5,
    },
  };
  let data = structuredClone(initialData);
  let storageAvailable = true;
  let writing = false;
  let writeBaseRaw;
  let batching = false, staged = false;
  let committing = false, pendingCommit = false;
  // IndexedDB is the authoritative handoff between renderers. localStorage is
  // retained as the synchronous UI/export mirror, never as the write arbiter.
  let database;
  function storageDatabase() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('kicks-coordinated-storage', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {database = undefined; reject(request.error);};
    });
    return database;
  }
  async function snapshot(value, key = storageKey) {
    const db = await storageDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', value === undefined ? 'readonly' : 'readwrite');
      const request = value === undefined ? tx.objectStore('snapshots').get(key) : tx.objectStore('snapshots').put(value, key);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error || Error('Storage transaction failed.'));
    });
  }
  const lockName = 'kicks-storage-v2';
  // Messages use the same renderer handoff as catalogue writes. Keep the
  // existing array mirror/exports intact; never merge from a stale tab cache.
  function updateMessages(change) {
    return coordinate(async () => {
      const key = 'kicks-messages-v1';
      let before, canonical, rows;
      try {
        const catalogue = await snapshot();
        const mirror = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (catalogue && Number(mirror?._storageRevision || 0) !== catalogue.revision) localStorage.setItem(storageKey,catalogue.raw);
        loadFromBrowser();
        before = localStorage.getItem(key);
        const local = JSON.parse(before || '[]');
        if (!Array.isArray(local)) throw Error('Unreadable message history.');
        canonical = await snapshot(undefined,key);
        rows = JSON.parse(canonical?.raw || before || '[]');
      } catch (error) {throw Error('Messages could not be loaded safely. ' + error.message);}
      const original = JSON.stringify(rows), result = change(rows);
      if (result && typeof result.then === 'function') throw Error('Message changes must be synchronous.');
      const raw = JSON.stringify(rows);
      if (raw === original) {
        if (canonical && before !== raw) localStorage.setItem(key,raw);
        return result;
      }
      let written = false;
      try {
        localStorage.setItem(key,raw); written = true;
        await snapshot({raw},key);
      } catch (error) {
        if (written) {if (before == null) localStorage.removeItem(key); else localStorage.setItem(key,before);}
        throw Error('Messages could not be saved. ' + error.message);
      }
      return result;
    });
  }
  async function coordinate(task) {
    if (typeof globalThis.navigator?.locks?.request !== 'function')
      return Promise.reject(Error('Safe storage coordination is unavailable. Open KICKS in a browser with Web Locks over HTTPS or localhost. No changes were saved.'));
    let entered = false;
    try {
      return await navigator.locks.request(lockName, {mode: 'exclusive'}, lock => {
        entered = true;
        return task(lock);
      });
    } catch (error) {
      if (!entered) throw Error('Storage coordination failed. No changes were saved. ' + error.message);
      throw error;
    }
  }
  function write(task) {
    return coordinate(async () => {
      let canonical, mirror, local;
      try { canonical = await snapshot(); mirror = localStorage.getItem(storageKey); local = JSON.parse(mirror || 'null'); }
      catch (error) { storageAvailable = false; throw Error('Browser storage could not be read safely. No changes were saved. ' + error.message); }
      // A stale renderer can still hold an older mirror after acquiring a lock.
      // Restore the committed revision before running ANY domain validation.
      if (canonical && Number(local?._storageRevision || 0) !== canonical.revision) {
        try { localStorage.setItem(storageKey, canonical.raw); }
        catch (error) { throw Error('Browser storage could not be refreshed safely. ' + error.message); }
      }
      writing = true;
      committing = true; pendingCommit = false;
      writeBaseRaw = undefined;
      try {
        loadFromBrowser();
        const result = task();
        if (pendingCommit) {
          data._storageRevision = Math.max(Number(data._storageRevision || 0), canonical?.revision || 0) + 1;
          const serialized = JSON.stringify(data), before = writeBaseRaw;
          if (localStorage.getItem(storageKey) !== before) throw Error('Stored data changed during this operation. Reload and retry; no changes were saved.');
          let mirrorWritten = false;
          try {
            localStorage.setItem(storageKey, serialized);
            mirrorWritten = true;
            await snapshot({raw: serialized, revision: data._storageRevision});
          } catch (error) {
            storageAvailable = false;
            if (mirrorWritten) {if (before == null) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, before);}
            throw Error('Browser storage commit failed. No changes were saved. ' + error.message);
          }
          storageAvailable = true;
          window.dispatchEvent(new Event('kicks-data-change'));
        }
        return result;
      } finally { writing = false; committing = false; pendingCommit = false; writeBaseRaw = undefined; loadFromBrowser(); }
    });
  }

  function loadFromBrowser() {
    if (batching || pendingCommit) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = JSON.parse(raw || "null");
      if (raw != null && (!saved || !collections.every(name => Array.isArray(saved[name])) || !saved.settings))
        throw Error('Stored data is unreadable. Export it for recovery; nothing was overwritten.');
      if (saved) {
        const optional = ["payments","feedback","meetings","teams","teamRequests","challenges","challengeRequests"];
        const rowsValid = rows => Array.isArray(rows) && rows.every(row => row !== null && typeof row === "object" && !Array.isArray(row));
        if (typeof saved.settings !== "object" || Array.isArray(saved.settings) ||
            !collections.every(name => rowsValid(saved[name])) ||
            optional.some(name => Object.hasOwn(saved,name) && !rowsValid(saved[name])))
          throw Error("Stored record shapes are unreadable. Nothing was overwritten.");
      }
      if (writing && writeBaseRaw === undefined) writeBaseRaw = raw;
      if (raw == null) data = structuredClone(initialData);
      if (
        saved &&
        collections.every((name) => Array.isArray(saved[name])) &&
        saved.settings
      ) {
        data = { ...saved };
        // الملفات القديمة قد لا تحتوي الأقسام التي أضفناها لاحقاً.
        for (const name of ["payments", "feedback", "meetings", "teams", "teamRequests", "challenges", "challengeRequests"]) {
          if (!Array.isArray(data[name])) data[name] = [];
        }
        data.settings = { commissionRate: 10, listingFee: 5, ...saved.settings };
        expireSplitHolds(data);
        // Legacy tournaments predate explicit creator identity. Freeze their existing organiser.
        for(const cup of data.tournaments)if(cup.createdBy==null)cup.createdBy=data.fields.find(f=>f.id===cup.fieldId)?.ownerId;
        refreshParticipation(data);
      }
    } catch (error) {
      storageAvailable = false;
      if (writing) throw Error('Browser storage could not be read safely. No changes were saved. ' + error.message);
    }
  }
  loadFromBrowser();

  function persist(nextData) {
    if (!writing) throw Error('A coordinated storage transaction is required.');
    refreshParticipation(nextData);
    if (batching) { data = nextData; staged = true; return; }
    let currentRaw;
    try { currentRaw = localStorage.getItem(storageKey); }
    catch { throw Error("Browser storage could not be checked safely. No changes were saved."); }
    if (currentRaw !== writeBaseRaw)
      throw Error("Stored data changed during this operation. Reload and retry; no changes were saved.");
    if (committing) { data = nextData; pendingCommit = true; return; }
    // لا نظهر نجاح الحفظ إذا رفض المتصفح تخزينه.
    const serialized = JSON.stringify(nextData);
    try {
      localStorage.setItem(storageKey, serialized);
    } catch {
      storageAvailable = false;
      throw new Error(
        "Browser storage is unavailable or full. Allow storage and try again.",
      );
    }
    // A second persist in this same locked operation compares with our own commit.
    writeBaseRaw = serialized;
    data = nextData;
    storageAvailable = true;
    window.dispatchEvent(new Event("kicks-data-change"));
  }

  // Identify the old built-in catalogue conservatively; never seed new venues.
  // Keep retired records for existing booking/payment history instead of deleting them.
  const legacyVenueDescriptions = {
    "KICKS Arena": "An intimate pitch for quick passing, evening games and weekly meetups.",
    "Capital Football Park": "A spacious pitch for bigger squads and competitive team sessions.",
    "Northside Pitch": "A welcoming spot for university squads and friendly local matches.",
    "Zarqa United Ground": "Compact football with room for fast attacks and friendly rivalries.",
    "West Amman Club": "Bring your regular team for a relaxed evening of six-a-side football.",
    "Irbid Green Court": "A larger playing space for weekend team games and local competitions.",
    "Eastside Football Hub": "A local meeting place for new teammates and after-work football.",
    "Seventh Circle Pitch": "A convenient city pitch for small teams and a quick kickabout.",
    "Northern Lights Arena": "An evening football spot with an easygoing community feel.",
  };
  function isLegacyVenue(field) {
    return data.catalogueVersion === 1 &&
      legacyVenueDescriptions[field.name] === field.description &&
      Object.hasOwn(legacyVenueDescriptions, field.name) &&
      data.users.some(user => user.id === field.ownerId && user.role === "admin");
  }
  function isArchivedField(field) {
    return Boolean(field && (field.retiredDemo || (!data.catalogueRetiredVersion && isLegacyVenue(field))));
  }
  function migrateLegacy() {
  if (data.catalogueVersion === 1 && !data.catalogueRetiredVersion) {
    const next = structuredClone(data);
    for (const field of next.fields) {
      if (isLegacyVenue(field)) field.retiredDemo = true;
    }
    next.catalogueRetiredVersion = 1;
    try { persist(next); } catch (error) {
      // Read-time retirement remains available, but ready reports failed persistence.
      throw error;
    }
  }
  // Preserve previous Visa booking history when adding the revenue ledger.
  const legacyPayments = data.bookings.filter(booking => booking.paymentStatus === "Paid (demo)" && !data.payments.some(paid => paid.collection === "bookings" && paid.recordId === booking.id));
  if (legacyPayments.length) {
    const next = structuredClone(data);
    for (const booking of legacyPayments) {
      next.payments.push({ id: Math.max(0, ...next.payments.map(row => row.id)) + 1, kind: "Field booking", collection: "bookings", recordId: booking.id, userId: booking.userId, ownerId: next.fields.find(field => field.id === booking.fieldId)?.ownerId, adminId: next.users.find(user => user.role === "admin")?.id, amount: Number(booking.price), commission: Number(booking.commission || 0), ownerNet: Number(booking.ownerNet ?? booking.price), rate: 10, status: "Paid (demo)", createdAt: booking.date + "T" + booking.time + ":00+03:00" });
    }
    persist(next); // A failed backfill is reported by ready and retried on a later load.
  }

  }
  // Startup migration is coordinated; read-only pages remain usable without Web Locks.
  const needsMigration = () => (data.catalogueVersion === 1 && !data.catalogueRetiredVersion) || data.bookings.some(b => b.paymentStatus === 'Paid (demo)' && !data.payments.some(p => p.collection === 'bookings' && p.recordId === b.id));
  const ready = needsMigration() ? write(migrateLegacy).then(() => null, error => error.message) : Promise.resolve(null);

  function list(name, options = {}) {
    loadFromBrowser();
    const records = data[name] || [];
    return structuredClone(name === "fields" && !options.includeArchived ? records.filter(field => !isArchivedField(field)) : records);
  }
  function refreshParticipation(state) {
    for (const [kind, linked, fk, active, counter] of [
      ['games','memberships','gameId','Joined','joined'],
      ['tournaments','registrations','tournamentId','Registered','teams']
    ]) for (const event of state[kind]) event[counter] = state[linked].filter(row => row[fk] === event.id && row.status === active).length;
  }
  function find(name, id) {
    return list(name, { includeArchived: true }).find((record) => record.id === Number(id));
  }
  function mutationActor() {
    const session = window.KicksAuth?.current();
    return data.users.find(user => user.id === session?.id && user.status === "Active") || null;
  }
  function authorizeMutation(name, item, previous, deleting = false) {
    const actor = mutationActor();
    // Public registration remains pending. It cannot supply privileges or balances.
    if (name === "users" && !previous && !deleting && actor?.role !== "admin") {
      const allowed = new Set(["name","email","role","city","status","requestedRole","ownershipProof","submittedAt","salt","passwordHash","avatar"]);
      if (item.status !== "Pending" || !["player","owner"].includes(item.role) || item.requestedRole !== item.role ||
          Object.keys(item).some(key => !allowed.has(key)) || !/^[a-f0-9]{32}$/.test(item.salt || "") || !/^[a-f0-9]{64}$/.test(item.passwordHash || ""))
        throw Error("Administrator permission is required to create privileged accounts.");
      if (item.role === "owner" && !window.KicksAuth?.validOwnershipProof?.(item.ownershipProof))
        throw Error("Upload a valid ownership document before registration.");
      return;
    }
    if (name === "feedback" && !previous && !deleting) return;
    if (!actor) throw Error("Sign in with an active account before changing records.");
    if(name==='tournaments' && !previous && !deleting && actor.role!=='admin')
      throw Error('Only an administrator can create a tournament.');
    if (!["users","fields","games","tournaments","bookings","memberships","registrations","feedback","meetings"].includes(name))
      throw Error("Use the protected workflow for this collection.");
    if (actor.role === "player" && ["bookings","memberships","registrations"].includes(name) && (deleting || ["Cancelled","Left","Withdrawn"].includes(item.status)))
      throw Error("Player cancellations are disabled. Contact the organiser.");
    if (actor.role === "admin") return;
    if (name === "users" && previous?.id === actor.id && !deleting) {
      const editable = new Set(["name","email","phone","city","address","avatar","salt","passwordHash"]);
      for (const key of new Set([...Object.keys(previous), ...Object.keys(item)]))
        if (!editable.has(key) && JSON.stringify(previous[key]) !== JSON.stringify(item[key]))
          throw Error("Account permissions and balances cannot be changed through your profile.");
      return;
    }
    if (actor.role === "owner") {
      const owned = row => data.fields.some(field => field.id === row?.fieldId && field.ownerId === actor.id);
      if (name === "fields" && (!previous || previous.ownerId === actor.id) && item.ownerId === actor.id) return;
      if (["games","tournaments"].includes(name) && (!previous || owned(previous)) && owned(item)) return;
      if (["memberships","registrations"].includes(name)) {
        const event = row => data[name === "memberships" ? "games" : "tournaments"].find(e => e.id === row?.[name === "memberships" ? "gameId" : "tournamentId"]);
        if ((!previous || owned(event(previous))) && owned(event(item))) return;
      }
      if (name === "meetings") {
        const ownMeeting = row => owned(data.tournaments.find(cup => cup.id === row?.tournamentId));
        if ((!previous || ownMeeting(previous)) && ownMeeting(item)) return;
      }
    }
    throw Error("You do not have permission to change this record.");
  }
  function save(name, record, payment = null) {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw Error("Enter a valid record.");
    if (["teams", "teamRequests"].includes(name))
      throw Error("Use the team directory's authorized team transaction instead of generic save.");
    loadFromBrowser();
    const nextData = structuredClone(data);
    const records = nextData[name];
    if (!Array.isArray(records)) throw new Error("Unknown collection.");
    const item = structuredClone(record);
    const existing = records.find(row => row.id === item.id);
    if (item.id != null && !existing) throw Error("This record no longer exists.");
    authorizeMutation(name, item, existing);
    if (name === 'bookings' && (existing?.splitPayment || item.splitPayment)) {
      if (!existing?.splitPayment || Object.keys({...existing,...item}).some(k => k !== 'status' && JSON.stringify(existing[k]) !== JSON.stringify(item[k])) ||
          (item.status !== existing.status && item.status !== 'Cancelled' && !(existing.status === 'Confirmed' && item.status === 'Completed' && hasEnded('bookings',existing))))
        throw Error('Split bookings are managed through the challenge payments. Only cancellation or completion is allowed here.');
    }
    if (name === "users") {
      if (typeof item.name !== "string" || item.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email || "") ||
          !["player","owner","admin"].includes(item.role) || !["Pending","Active","Inactive","Rejected"].includes(item.status)) throw Error("Invalid account details.");
      if (records.some(user => user.id !== item.id && typeof user.email === "string" && user.email.toLowerCase() === item.email.toLowerCase())) throw Error("This email is already registered.");
      if (existing?.role === "admin" && existing.status === "Active" && (item.role !== "admin" || item.status !== "Active") &&
          records.filter(user => user.role === "admin" && user.status === "Active").length <= 1) throw Error("Keep at least one active administrator.");
    }
    if (name === "fields" && !nextData.users.some(user => user.id === item.ownerId && ["owner","admin"].includes(user.role)))
      throw Error("Choose a valid field owner.");
    if (name === "bookings") {
      if (!nextData.users.some(user => user.id === item.userId && user.role === "player") || !nextData.fields.some(field => field.id === item.fieldId)) throw Error("Invalid booking player or field.");
      if (!validSchedule(item.date, item.time) || !/^((1[0-9])|(2[0-2])):00$/.test(item.time)) throw Error("Choose a valid booking date and hourly slot from 10:00 to 22:00.");
      if (item.price === undefined) item.price = nextData.fields.find(field => field.id === item.fieldId).price;
      if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) throw Error("Invalid booking amount.");
      if (!["Pending","Confirmed","Completed","Cancelled"].includes(item.status)) throw Error("Invalid booking status.");
      if (existing?.status === "Cancelled" && item.status !== "Cancelled") throw Error("Create a new booking instead of restoring a cancelled/refunded booking.");
      if (existing?.status === "Completed" && ["Pending","Confirmed"].includes(item.status)) throw Error("A completed booking cannot be restored to an active status.");
      if (item.status === "Completed" && existing?.status !== "Completed" && !hasEnded("bookings",item)) throw Error("A booking cannot be completed before its end time.");
    }
    if (["games","tournaments"].includes(name)) {
      if (!nextData.fields.some(field => field.id === Number(item.fieldId))) throw Error("Choose a valid activity field.");
      if (!existing || existing.fieldId !== item.fieldId) item.fieldId = Number(item.fieldId);
      if (item.createdBy != null && !nextData.users.some(user => user.id === item.createdBy && ["owner","admin"].includes(user.role))) throw Error("Choose a valid activity organiser.");
      if (!validSchedule(item.date,item.time)) throw Error("Choose a valid activity date and time.");
      // Legacy records without duration remain readable; a new activity must have an end.
      if (item.durationMinutes == null && !existing) throw Error("Enter an activity duration.");
      if (!(existing && existing.capacity == null && item.capacity == null) && (!Number.isInteger(Number(item.capacity)) || Number(item.capacity) < 1 || (name === "tournaments" && Number(item.capacity) > 64))) throw Error("Invalid activity capacity.");
      const counter = name === "games" ? "joined" : "teams";
      item[counter] = nextData[name === 'games' ? 'memberships' : 'registrations'].filter(row => row[name === 'games' ? 'gameId' : 'tournamentId'] === item.id && row.status === (name === 'games' ? 'Joined' : 'Registered')).length;
      if (item[counter] > Number(item.capacity)) throw Error('Capacity cannot be lower than active entries.');
      if (!Number.isFinite(Number(item[name === "games" ? "price" : "fee"] ?? 0)) || Number(item[name === "games" ? "price" : "fee"] ?? 0) < 0) throw Error("Invalid activity amount.");
    }
    if (["memberships","registrations"].includes(name)) {
      const game = name === "memberships", reference = game ? "gameId" : "tournamentId";
      if (!nextData.users.some(user => user.id === item.userId && user.role === "player") || !nextData[game ? "games" : "tournaments"].some(event => event.id === item[reference])) throw Error("Invalid participation user or activity reference.");
      if (!(game ? ["Joined","Left"] : ["Registered","Withdrawn"]).includes(item.status)) throw Error("Invalid participation status.");
      if (game && item.status === "Joined" && !["Goalkeeper","Defender","Midfielder","Forward"].includes(item.position)) throw Error("Choose a playing position.");
    }
    if (name === "meetings") {
      if (!nextData.tournaments.some(cup => cup.id === item.tournamentId) || !nextData.users.some(user => user.id === item.organizerId && ["owner","admin"].includes(user.role))) throw Error("Invalid meeting organiser or tournament reference.");
      if (!validCalendarDate(String(item.startsAt).slice(0,10)) || !Number.isFinite(Date.parse(item.startsAt)) || ![15,30,45,60,90,120].includes(Number(item.duration)) || !["Scheduled","Cancelled","Completed"].includes(item.status)) throw Error("Invalid meeting schedule or status.");
    }
    if(name==='bookings' && item.id){const previous=records.find(b=>b.id===item.id);if(previous?.challengeId){
      if(['userId','fieldId','date','time'].some(k=>previous[k]!==item[k]))throw Error('An agreed team booking cannot be reassigned. Cancel it and arrange a new challenge.');
      for(const k of ['challengeId','teamIds','teamNames','captainIds'])item[k]=structuredClone(previous[k]);
    }}

    if (name==='registrations' && !item.id) throw Error('Register a team through its tournament page.');
    if (name==='registrations' && item.id) {
      const prior=records.find(r=>r.id===item.id);
      if(prior?.teamId){
        if(item.teamId!==prior.teamId || item.userId!==prior.userId || item.tournamentId!==prior.tournamentId) throw Error('A registered team cannot be reassigned.');
        item.roster=structuredClone(prior.roster); item.teamName=prior.teamName; item.captain=prior.captain; item.email=prior.email;
      }
    }
    if (window.KicksAuth?.current()?.role === "player" && ["bookings", "memberships", "registrations"].includes(name) && ["Cancelled", "Left", "Withdrawn"].includes(item.status)) throw Error("Player cancellations are disabled. Contact the organiser.");
    if (["games", "tournaments"].includes(name) && item.durationMinutes !== undefined && (!Number.isInteger(Number(item.durationMinutes)) || Number(item.durationMinutes) <= 0)) throw Error("Enter a positive whole-number duration in minutes.");
    if(name==='tournaments') {
      const prior=records.find(t=>t.id===item.id), actor=window.KicksAuth?.current();
      if(prior && window.KicksAuth && !tournamentAccess(prior.id).manage)throw Error('Only the tournament creator can edit this tournament.');
      item.createdBy=prior?.createdBy ?? (prior ? nextData.fields.find(f=>f.id===prior.fieldId)?.ownerId : actor.id);
      if(item.id)item.bracket=structuredClone(prior?.bracket);
      if (prior?.status === 'Cancelled' && item.status !== 'Cancelled') throw Error('A cancelled tournament cannot be reopened. Create a new tournament.');
      if (item.status === 'Cancelled' && prior?.status !== 'Cancelled') {
        if (actor?.role !== 'admin') throw Error('Only an administrator can cancel a tournament.');
        if (hasEnded('tournaments', item)) throw Error('An ended tournament must retain its results.');
        item.cancelledAt = new Date().toISOString();
        for (const entry of nextData.registrations.filter(r => r.tournamentId === item.id && r.status === 'Registered')) {
          entry.status = 'Withdrawn'; entry.cancelledAt = item.cancelledAt;
          for (const paid of nextData.payments.filter(p => p.collection === 'registrations' && p.recordId === entry.id && p.status === 'Paid (demo)')) paid.status = 'Refunded (demo)';
          if (entry.paymentStatus === 'Paid (demo)') entry.paymentStatus = 'Refunded (demo)';
        }
        item.teams = 0;
      }
    }
    if(name==='registrations' && data.tournaments.find(t=>t.id===item.tournamentId)?.bracket?.started && records.find(r=>r.id===item.id)?.status!==item.status) throw Error('The tournament draw has started. Registrations are locked.');
    const previous = records.find(existing => existing.id === item.id);
    if (name === 'tournaments' && holdsFieldTime(name,item) && (!previous || ['date','time','durationMinutes'].some(k => item[k] !== previous[k]))) {
      for (const entry of data.registrations.filter(r => r.tournamentId === item.id && r.status === 'Registered'))
        if (teamScheduleConflict(entry.teamId,item.date,item.time,item.durationMinutes,{tournament:item.id})) throw Error('A registered team already has an overlapping tournament or challenge.');
    }
    // KICKS-004: guard new/changed occupancy, without rewriting legacy conflicts
    // or preventing unrelated metadata edits and cancellations.
    if (["bookings", "games", "tournaments"].includes(name) && holdsFieldTime(name, item)) {
      const scheduleChanged = !previous ||
        ["fieldId", "date", "time"].some(key => previous[key] !== item[key]) ||
        !holdsFieldTime(name, previous) ||
        (name === "bookings" ? previous.status !== item.status : Number(previous.durationMinutes) !== Number(item.durationMinutes));
      const counterparts = ["bookings", "games", "tournaments"];
      if (scheduleChanged && conflictsWithFieldTime(name, item, counterparts))
        throw Error("This field has an overlapping booking or scheduled event. Choose another time.");
    }
    if (["memberships", "registrations"].includes(name)) {
      const isGame = name === "memberships";
      const reference = isGame ? "gameId" : "tournamentId";
      const eventCollection = isGame ? "games" : "tournaments";
      const active = isGame ? "Joined" : "Registered";
      const counter = isGame ? "joined" : "teams";
      if (records.some(row => row.id !== item.id && row.userId === item.userId && row[reference] === item[reference]))
        throw Error("This player already has an entry. Edit the existing record.");
      const before = previous?.status === active ? nextData[eventCollection].find(event => event.id === previous[reference]) : null;
      const after = item.status === active ? nextData[eventCollection].find(event => event.id === item[reference]) : null;
      if (item.status === active && !after) throw Error("This event no longer exists.");
      if (after && ['Cancelled','Archived'].includes(after.status)) throw Error('This event is no longer open.');
      if (!isGame && after && previous?.status !== active) tournamentRoster(item.userId,item.tournamentId,item.teamId,item.id);
      if (after && before?.id !== after.id && after[counter] >= after.capacity) throw Error("This event is full.");
      if (before && before.id !== after?.id) before[counter] = Math.max(0, before[counter] - 1);
      if (after && after.id !== before?.id) after[counter]++;
    }
    const owner = nextData.users.find(user => user.id === item.ownerId);
    const paidListing = name === "fields" && !item.id && owner?.role === "owner";
    if (paidListing && payment?.amount !== undefined && Number(payment.amount) !== Number(nextData.settings.listingFee)) throw Error("The listing fee changed. Open checkout again.");
    if (paidListing && Number(nextData.settings.listingFee) > 0 && payment?.method !== "Visa demo")
      throw Error("Complete the listing payment before publishing your field.");
    if (item.id) {
      const index = records.findIndex((existing) => existing.id === item.id);
      if (index < 0) throw new Error("This record no longer exists.");
      const old = records[index];
      if (old.paymentStatus === "Paid (demo)" && ["price", "userId", "fieldId", "gameId", "tournamentId"].some(key => old[key] !== item[key])) throw Error("Cancel the paid entry and create a new one to change its player, event or amount.");
      if (old.paymentStatus === "Refunded (demo)" && ["Joined", "Registered", "Confirmed", "Completed"].includes(item.status)) throw Error("Create a new paid entry instead of restoring a refunded record.");
      records[index] = item;
    } else {
      item.id = Math.max(0, ...records.map((existing) => existing.id)) + 1;
      records.push(item);
    }
    if (paidListing) recordPayment(nextData, "Field listing", name, item, Number(nextData.settings.listingFee), owner.id, owner.id, true);
    if (["Cancelled", "Left", "Withdrawn"].includes(item.status)) {
      for (const paid of nextData.payments) {
        if (paid.collection === name && paid.recordId === item.id && ["Paid (demo)","Held (demo)"].includes(paid.status)) paid.status = "Refunded (demo)";
      }
      if (item.paymentStatus === "Paid (demo)") item.paymentStatus = "Refunded (demo)";
      if (item.splitPayment) item.paymentStatus = 'Refunded (demo)';
    }
    persist(nextData);
    return item;
  }

  function remove(name, id) {
    if (["teams", "teamRequests"].includes(name))
      throw Error("Team/request deletion is not supported. Use the authorized team workflow.");
    loadFromBrowser();
    const target = data[name]?.find(row => row.id === id);
    if (!target) throw Error("This record no longer exists.");
    authorizeMutation(name, target, target, true);
    if(name==='tournaments' && window.KicksAuth && !tournamentAccess(id).manage)throw Error('Only the tournament creator can delete this tournament.');
    // Financial and relationship history must never become a dangling ID.
    const linkedPayment = data.payments.some(p => (p.collection === name && p.recordId === id) ||
      (name === "games" && p.collection === "memberships" && data.memberships.some(m => m.id === p.recordId && m.gameId === id)) ||
      (name === "tournaments" && p.collection === "registrations" && data.registrations.some(r => r.id === p.recordId && r.tournamentId === id)));
    const linkedHistory = (name === "games" && data.memberships.some(m => m.gameId === id)) ||
      (name === "tournaments" && (data.registrations.some(r => r.tournamentId === id) || data.meetings.some(m => m.tournamentId === id))) ||
      (name === "bookings" && data.challenges.some(c => c.bookingId === id));
    if (linkedPayment || linkedHistory) throw Error("This record has linked history (bookings, payments or events). Keep it to preserve its existing bookings, entries and payments.");

    if(name==='registrations' && data.tournaments.find(t=>t.id===data.registrations.find(r=>r.id===id)?.tournamentId)?.bracket?.started) throw Error('The tournament draw has started. Registrations are locked.');
    if (window.KicksAuth?.current()?.role === "player" && ["bookings", "memberships", "registrations", "games", "tournaments"].includes(name)) throw Error("Player cancellations are disabled. Contact the organiser.");
    loadFromBrowser();
    const next = structuredClone(data);
    if (["memberships", "registrations"].includes(name)) {
      const isGame = name === "memberships";
      const entry = next[name].find(row => row.id === id);
      if (entry?.status === (isGame ? "Joined" : "Registered")) {
        const event = next[isGame ? "games" : "tournaments"].find(row => row.id === entry[isGame ? "gameId" : "tournamentId"]);
        const counter = isGame ? "joined" : "teams";
        if (event) event[counter] = Math.max(0, event[counter] - 1);
      }
    }
    for (const paid of next.payments) {
      let linkedEntry = null;
      if (name === "games" && paid.collection === "memberships") {
        linkedEntry = next.memberships.find(row => row.id === paid.recordId && row.gameId === id);
      } else if (name === "tournaments" && paid.collection === "registrations") {
        linkedEntry = next.registrations.find(row => row.id === paid.recordId && row.tournamentId === id);
      }
      const directPayment = paid.collection === name && paid.recordId === id && name !== "fields";
      if (paid.status === "Paid (demo)" && (directPayment || linkedEntry)) {
        paid.status = "Refunded (demo)";
      }
    }
    if (
      name === "fields" &&
      ["games", "tournaments", "bookings"].some((key) =>
        next[key].some((record) => record.fieldId === id),
      )
    )
      throw new Error(
        "Remove or reassign this field’s bookings and events first.",
      );
    if (name === "users") {
      if (next.teams.some(t=>t.members.some(m=>m.userId===id))) throw Error("Remove this player from their team before deleting the account.");
      const account = next.users.find((user) => user.id === id);
      if (
        account?.role === "admin" &&
        next.users.filter(
          (user) => user.role === "admin" && user.status === "Active",
        ).length <= 1
      )
        throw new Error("Keep at least one active administrator.");
      if (next.payments.some(p => [p.userId,p.ownerId,p.adminId].includes(id)) ||
          next.games.some(g => g.createdBy === id) || next.tournaments.some(t => t.createdBy === id) ||
          next.meetings.some(m => m.createdBy === id || m.organizerId === id) || next.teamRequests.some(r => r.userId === id) ||
          next.registrations.some(r => r.roster?.some(member => member.userId === id)))
        throw Error("This account has linked history. Deactivate it instead of deleting it.");
      if (
        ["fields", "bookings", "memberships", "registrations"].some((key) =>
          next[key].some(
            (record) => record.ownerId === id || record.userId === id,
          ),
        )
      )
        throw new Error(
          "This account has linked records. Reassign or remove them first.",
        );
      let messages;
      try {
        messages = JSON.parse(localStorage.getItem("kicks-messages-v1") || "[]");
        if (!Array.isArray(messages)) throw Error("Invalid messages");
      } catch { throw Error("Message history cannot be read safely. No account was deleted."); }
      if (messages.some(message => message.senderId === id || message.recipientId === id))
        throw Error("This account has message history. Deactivate it instead of deleting it.");
    }
    if (name === "games")
      next.memberships = next.memberships.filter(
        (entry) => entry.gameId !== id,
      );
    if (name === "tournaments") {
      next.registrations = next.registrations.filter(
        (entry) => entry.tournamentId !== id,
      );
      for (const meeting of next.meetings) {
        if (meeting.tournamentId === id) meeting.status = "Cancelled";
      }
    }
    next[name] = next[name].filter((record) => record.id !== id);
    persist(next);
  }

  function escapeHtml(value) {
    const symbols = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return String(value ?? "").replace(/[&<>"']/g, (symbol) => symbols[symbol]);
  }

  // Reject calendar normalization (e.g. February 30 -> March 2) before
  // interpreting an Amman kickoff. This never rewrites legacy records.
  function validCalendarDate(date) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + "T00:00:00Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }
  function validSchedule(date, time) {
    return validCalendarDate(date) && typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  }
  function isFuture(date, time) {
    return validSchedule(date, time) && new Date(date + "T" + time + ":00+03:00") > new Date();
  }
  function endsAt(kind, record) {
    if (!record || !validSchedule(record.date, record.time)) return NaN;
    if (kind === "bookings") return Date.parse(record.date + "T" + record.time + ":00+03:00") + 60 * 60 * 1000;
    if (!["games", "tournaments"].includes(kind) || !Number.isFinite(Number(record.durationMinutes)) || Number(record.durationMinutes) <= 0) return NaN;
    return Date.parse(record.date + "T" + record.time + ":00+03:00") + Number(record.durationMinutes) * 60 * 1000;
  }
  function holdsFieldTime(kind, record) {
    if (!record) return false;
    if (kind === "bookings") return ["Pending", "Confirmed"].includes(record.status);
    return ["games", "tournaments"].includes(kind) &&
      !["Cancelled", "Archived"].includes(record.status) && Number.isFinite(endsAt(kind, record));
  }
  function conflictsWithFieldTime(kind, record, counterparts) {
    if (!holdsFieldTime(kind, record)) return false;
    const start = Date.parse(record.date + "T" + record.time + ":00+03:00");
    const end = endsAt(kind, record);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return counterparts.some(collection => data[collection].some(other => {
      if (Number(other.fieldId) !== Number(record.fieldId) || !holdsFieldTime(collection, other) ||
          (collection === kind && other.id === record.id)) return false;
      const otherStart = Date.parse(other.date + "T" + other.time + ":00+03:00");
      // Half-open intervals allow an arrival exactly at the previous end time.
      return start < endsAt(collection, other) && otherStart < end;
    }));
  }
  // Shared occupancy query; callers retain their existing future/today rules.
  function isFieldSlotAvailable(fieldId, date, time) {
    loadFromBrowser();
    const field = data.fields.find(item => item.id === Number(fieldId));
    if (!field || isArchivedField(field) || !validCalendarDate(date) || !/^((1[0-9])|(2[0-2])):00$/.test(time) ||
        !Number.isFinite(Date.parse(date + "T" + time + ":00+03:00"))) return false;
    return !conflictsWithFieldTime("bookings", {fieldId: field.id, date, time, status: "Confirmed"}, ["bookings", "games", "tournaments"]);
  }
  function hasEnded(kind, record, now = Date.now()) {
    const end = endsAt(kind, record);
    return Number.isFinite(end) && now >= end;
  }
  function publicActivities(kind) {
    if (!["games", "tournaments"].includes(kind)) return [];
    const activeFields = new Set(list("fields").map(field => field.id));
    return list(kind).filter(record => !['Cancelled','Archived'].includes(record.status) && activeFields.has(record.fieldId) && Number.isFinite(endsAt(kind, record)) && !hasEnded(kind, record));
  }
  function activityStatus(kind, record) {
    if (["games", "tournaments"].includes(kind)) {
      if (['Cancelled','Archived'].includes(record.status)) return record.status;
      if (isArchivedField(data.fields.find(field => field.id === record.fieldId))) return "Archived";
      if (!Number.isFinite(endsAt(kind, record))) return "Set duration";
      if (hasEnded(kind, record)) return "Ended";
      return isFuture(record.date, record.time) ? "Upcoming" : "In progress";
    }
    if (kind === "bookings" && ["Pending", "Confirmed"].includes(record.status) && hasEnded(kind, record)) return "Completed";
    if (["memberships", "registrations"].includes(kind) && ["Joined", "Registered"].includes(record.status)) {
      const eventKind = kind === "memberships" ? "games" : "tournaments";
      const event = data[eventKind].find(item => item.id === record[kind === "memberships" ? "gameId" : "tournamentId"]);
      if (event && isArchivedField(data.fields.find(field => field.id === event.fieldId))) return "Archived";
      if (hasEnded(eventKind, event)) return "Completed";
    }
    return record.status;
  }
  // Re-render only when a start/end boundary is crossed, including after a suspended tab resumes.
  function watchActivityClock(render) {
    let previous;
    function tick() {
      const signature = ["games", "tournaments", "bookings"].map(kind => list(kind).map(record => `${record.id}:${endsAt(kind, record)}:${isFuture(record.date, record.time)}:${hasEnded(kind, record)}:${record.status}:${record.paymentStatus||''}`).join(",")).join("|");
      if (previous !== undefined && signature !== previous) render();
      previous = signature;
    }
    tick();
    window.setInterval(tick, 1000);
    window.addEventListener("pageshow", tick);
    document.addEventListener("visibilitychange", tick);
  }
  // Record the split in the same browser save as the booking. No real money moves.
  function recordPayment(next, kind, collection, record, amount, userId, ownerId, listing = false, platformOnly = false) {
    const admin = next.users.find(user => user.role === "admin" && user.status === "Active");
    if (!admin) throw Error("No active administrator is available to receive platform revenue.");
    if (!Number.isFinite(amount) || amount < 0) throw Error("Invalid payment amount.");
    const rate = listing || platformOnly ? 100 : Number(next.settings.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw Error("Invalid commission rate.");
    const commission = Math.round(amount * rate) / 100;
    const ownerNet = Math.round((amount - commission) * 100) / 100;
    if (listing) record.listingFeePaid = amount;
    else Object.assign(record, { price: amount, paymentMethod: amount ? "Visa (demo)" : "Free", paymentStatus: amount ? "Paid (demo)" : "Free", commission, ownerNet });
    if (!amount) return;
    next.payments.push({ id: Math.max(0, ...next.payments.map(row => row.id)) + 1, kind, collection, recordId: record.id, userId, ownerId, adminId: admin.id, amount, commission, ownerNet, rate, status: "Paid (demo)", createdAt: new Date().toISOString() });
  }
  function book(userId, fieldId, date, time, payment = null, challengeId = null) {
    const actor = mutationActor();
    if (!actor || (actor.role !== "admin" && actor.id !== userId)) throw Error("Sign in as this player; another identity cannot be supplied.");
    const user = find("users", userId);
    const field = find("fields", fieldId);
    if (!user || user.status !== "Active" || user.role !== "player")
      throw new Error("Sign in with a player account to book.");
    if (!field || isArchivedField(field)) throw new Error("This field is no longer available.");
    if (!isFuture(date, time))
      throw new Error("Choose a future date and time.");
    if (!/^((1[0-9])|(2[0-2])):00$/.test(time))
      throw new Error("Choose an hourly slot between 10:00 and 22:00.");
    const taken = list("bookings").some(
      (booking) =>
        booking.fieldId === field.id &&
        booking.date === date &&
        booking.time === time &&
        ["Pending", "Confirmed"].includes(booking.status),
    );
    if (taken)
      throw new Error("This slot was just booked. Choose another time.");
    if (conflictsWithFieldTime("bookings", {fieldId: field.id, date, time, status: "Confirmed"}, ["games", "tournaments"]))
      throw Error("This slot overlaps a scheduled game or tournament. Choose another time.");
    const challenge = challengeId ? validateChallengeBooking(userId, challengeId, field, date, time) : null;
    const booking = {
      userId: user.id,
      fieldId: field.id,
      date,
      time,
      price: field.price,
      status: "Confirmed",
    };
    if (Number(field.price) > 0 && payment?.method !== "Visa demo") throw Error("Complete Visa checkout before booking.");
    if (payment?.amount !== undefined && Number(payment.amount) !== Number(field.price)) throw Error("The price changed. Open checkout again.");
    const next = structuredClone(data);
    booking.id = Math.max(0, ...next.bookings.map(row => row.id)) + 1;
    recordPayment(next, "Field booking", "bookings", booking, Number(field.price), user.id, field.ownerId);
    if (challenge) {
      const item=next.challenges.find(c=>c.id===challenge.id);item.status="Booked";item.bookingId=booking.id;
      booking.challengeId=item.id;booking.teamIds=[item.teamId,item.opponentId];
      booking.teamNames=booking.teamIds.map(id=>next.teams.find(t=>t.id===id).name);
      booking.captainIds=booking.teamIds.map(id=>next.teams.find(t=>t.id===id).captainId);
    }
    next.bookings.push(booking);
    persist(next);
    return structuredClone(booking);
  }

  function join(userId, kind, eventId, details = {}) {
    if (!["games", "tournaments"].includes(kind)) throw Error("Unknown event type.");
    loadFromBrowser();
    const actor = mutationActor();
    if (!actor || (actor.role !== "admin" && actor.id !== userId)) throw Error("Sign in as this player; another identity cannot be supplied.");
    const user = find("users", userId);
    if (!user || user.status !== "Active" || user.role !== "player")
      throw new Error("Sign in with a player account to join.");
    const isGame = kind === "games";
    const event = find(kind, eventId);
    if (!event || ['Cancelled','Archived'].includes(event.status) || isArchivedField(data.fields.find(field => field.id === event.fieldId)) || !Number.isFinite(endsAt(kind, event)) || !isFuture(event.date, event.time))
      throw new Error("This event is no longer open.");
    if(!isGame && event.bracket?.started) throw Error('Registration is closed: tournament draw has started.');
    const collection = isGame ? "memberships" : "registrations";
    const reference = isGame ? "gameId" : "tournamentId";
    const counter = isGame ? "joined" : "teams";
    const active = isGame ? "Joined" : "Registered";
    const previous = list(collection).find(
      (entry) => entry.userId === user.id && entry[reference] === event.id,
    );
    if (previous?.status === active)
      throw new Error("You already joined this event.");
    if (event[counter] >= event.capacity)
      throw new Error("This event is full.");
    const entry = {
      ...previous,
      userId: user.id,
      [reference]: event.id,
      status: active,
    };
    if (isGame) {
      if (!["Goalkeeper", "Defender", "Midfielder", "Forward"].includes(details.position)) throw Error("Choose your playing position before joining.");
      entry.position = details.position;
    }
    if (!isGame) {
      const {team,roster} = tournamentRoster(user.id,event.id,details.teamId,previous?.id);
      entry.teamId = team.id;
      entry.roster = structuredClone(roster);
      entry.teamName = team.name;
      entry.captain = user.name;
      entry.email = user.email;
      if (
        entry.teamName.length < 2 ||
        entry.captain.length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)
      )
        throw new Error("Enter your team, captain and a valid email.");
    }
    const amount = Number(isGame ? event.price : event.fee);
    if (amount > 0 && details.payment?.method !== "Visa demo") throw Error("Complete Visa checkout before joining.");
    if (details.payment?.amount !== undefined && Number(details.payment.amount) !== amount) throw Error("The entry fee changed. Open checkout again.");
    // العدّاد والتسجيل يحفظان معاً؛ لا يحدث حفظ جزئي.
    const next = structuredClone(data);
    const target = next[collection];
    if (entry.id)
      target[target.findIndex((item) => item.id === entry.id)] = entry;
    else {
      entry.id = Math.max(0, ...target.map((item) => item.id)) + 1;
      target.push(entry);
    }
    next[kind].find((item) => item.id === event.id)[counter]++;
    const field = next.fields.find(item => item.id === event.fieldId);
    recordPayment(next, isGame ? "Open game" : "Tournament", collection, entry, amount, user.id, field?.ownerId, false, !isGame);
    persist(next);
    return structuredClone(entry);
  }

  // Keep old integrations from silently allowing a player withdrawal.
  function leave() {
    throw Error("Player cancellations are disabled. Contact the organiser.");
  }


  // Holds are projected on reads; the next successful coordinated write stores the
  // same expiry/refund state. No browser timer or open tab is required to release a slot.
  function expireSplitHolds(snapshot, now = Date.now()) {
    for (const b of snapshot.bookings || []) if (b.splitPayment && b.status === 'Pending' && Date.parse(b.paymentDeadline) <= now) {
      b.status='Cancelled'; b.paymentStatus='Refunded (demo)'; b.expired=true;
      const c=(snapshot.challenges||[]).find(c=>c.id===b.challengeId);if(c)c.status='Expired';
      for(const p of snapshot.payments||[])if(p.collection==='bookings'&&p.recordId===b.id&&p.status==='Held (demo)')p.status='Refunded (demo)';
    }
  }
  function splitTerms(fieldId, format, city, date, time, quotedPrice) {
    const f=data.fields.find(f=>f.id===Number(fieldId));
    if(!f || isArchivedField(f) || f.city!==city || f.type!==format)throw Error('Choose a pitch matching the challenge city and team format.');
    const cents=Math.round(Number(f.price)*100);
    if(!Number.isSafeInteger(cents)||cents<0)throw Error('Invalid pitch price.');
    if(quotedPrice!==undefined && cents!==Math.round(Number(quotedPrice)*100))throw Error('The pitch price changed. Cancel and post a new challenge with the updated terms.');
    if(!isFuture(date,time)||!isFieldSlotAvailable(f.id,date,time))throw Error('This pitch is no longer available at the agreed kickoff. Choose another slot.');
    return {field:f,totalCents:cents,hostCents:Math.ceil(cents/2),awayCents:Math.floor(cents/2)};
  }
  function reserveSplitChallenge(next,c,host,away) {
    const terms=splitTerms(c.fieldId,c.format,c.city,c.date,c.time,c.price);
    const rate=Number(next.settings.commissionRate);
    if(!Number.isFinite(rate)||rate<0||rate>100)throw Error('Invalid commission rate.');
    const commissionCents=Math.round(terms.totalCents*rate/100),hostCommission=Math.round(commissionCents/2);
    const booking={id:Math.max(0,...next.bookings.map(b=>b.id))+1,userId:host.captainId,fieldId:c.fieldId,date:c.date,time:c.time,price:c.price,status:terms.totalCents?'Pending':'Confirmed',paymentMethod:'Split Visa (demo)',paymentStatus:terms.totalCents?'Awaiting shares':'Free',splitPayment:true,challengeId:c.id,teamIds:[host.id,away.id],teamNames:[host.name,away.name],captainIds:[host.captainId,away.captainId],ownerId:terms.field.ownerId,commissionRate:rate,commission:commissionCents/100,ownerNet:(terms.totalCents-commissionCents)/100,paymentDeadline:new Date(Math.min(Date.now()+15*60000,Date.parse(c.date+'T'+c.time+':00+03:00'))).toISOString(),shares:[{userId:host.captainId,teamId:host.id,amount:terms.hostCents/100,commission:hostCommission/100,paid:terms.hostCents===0},{userId:away.captainId,teamId:away.id,amount:terms.awayCents/100,commission:(commissionCents-hostCommission)/100,paid:terms.awayCents===0}]};
    next.bookings.push(booking);c.bookingId=booking.id;c.status=terms.totalCents?'Awaiting payment':'Booked';
  }
  function payChallengeShare(id,payment) {
    loadFromBrowser();const user=mutationActor();
    if(!user||user.role!=='player')throw Error('Sign in as a team captain to pay.');
    const c=data.challenges.find(c=>c.id===Number(id)),b=c&&data.bookings.find(b=>b.id===c.bookingId);
    if(!b?.splitPayment || challengeStatus(c)!=='Awaiting payment' || b.status!=='Pending')throw Error('This challenge is not awaiting payment. It may have expired or been cancelled.');
    const share=b.shares.find(s=>s.userId===user.id);
    if(!share||!data.teams.some(t=>t.id===share.teamId&&t.captainId===user.id))throw Error('Only the agreed captain can pay their own share.');
    if(share.paid)throw Error('Your share has already been paid.');
    activeSquad(c.teamId,b.captainIds[0],c.format);activeSquad(c.opponentId,b.captainIds[1],c.format);
    if (challengeConflict(c.teamId,c.date,c.time,c.id) || challengeConflict(c.opponentId,c.date,c.time,c.id)) throw Error('A team already has an overlapping tournament or challenge.');
    const field=data.fields.find(f=>f.id===b.fieldId);
    if(!field||isArchivedField(field)||field.ownerId!==b.ownerId)throw Error('The pitch ownership changed. Cancel this match for a simulated refund.');
    if(conflictsWithFieldTime('bookings',b,['bookings','games','tournaments']))throw Error('The reserved slot conflicts with another event. Cancel for a simulated refund.');
    if(payment?.method!=='Visa demo'||Number(payment.amount)!==share.amount)throw Error('Pay exactly your displayed half through Visa demo checkout.');
    const admin=data.users.find(u=>u.role==='admin'&&u.status==='Active');if(!admin)throw Error('No active administrator is available to receive platform revenue.');
    const next=structuredClone(data),paidBooking=next.bookings.find(x=>x.id===b.id),own=paidBooking.shares.find(s=>s.userId===user.id);
    own.paid=true;own.paidAt=new Date().toISOString();
    next.payments.push({id:Math.max(0,...next.payments.map(p=>p.id))+1,kind:'Challenge share',collection:'bookings',recordId:b.id,challengeId:c.id,userId:user.id,ownerId:b.ownerId,adminId:admin.id,amount:share.amount,commission:share.commission,ownerNet:Math.round((share.amount-share.commission)*100)/100,rate:b.commissionRate,status:'Held (demo)',createdAt:own.paidAt});
    if(paidBooking.shares.every(s=>s.paid)){
      paidBooking.status='Confirmed';paidBooking.paymentStatus='Paid (demo)';next.challenges.find(x=>x.id===c.id).status='Booked';
      for(const p of next.payments)if(p.collection==='bookings'&&p.recordId===b.id&&p.status==='Held (demo)')p.status='Paid (demo)';
    } else paidBooking.paymentStatus='Partially paid (demo)';
    persist(next);return structuredClone(paidBooking);
  }
  function challengeStatus(c, now = Date.now()) {
    if (c.status==='Cancelled') return 'Cancelled';
    if(c.status==='Expired')return 'Expired';
    if(c.bookingId){const b=data.bookings.find(b=>b.id===c.bookingId);if(b?.splitPayment&&b.status==='Pending')return Date.parse(b.paymentDeadline)<=now?'Expired':'Awaiting payment';if(!b || b.status==='Cancelled')return b?.expired?'Expired':'Cancelled';return new Date(b.date+'T'+b.time+':00+03:00').getTime()+3600000<=now?'Completed':'Booked';}
    if(new Date(c.date+'T'+c.time+':00+03:00').getTime()<=now)return 'Expired';
    return c.status;
  }
  function activeSquad(id, userId, format) {
    const t=data.teams.find(t=>t.id===id);
    if(!t || t.captainId!==userId)throw Error('Choose a team you captain.');
    if(format && t.format!==format)throw Error('Both teams must play the same format.');
    const count=t.members.filter(m=>data.users.some(u=>u.id===m.userId && u.role==='player' && u.status==='Active')).length;
    if(count<Number(t.format[0]))throw Error('Your team needs at least '+t.format[0]+' active players.');
    return t;
  }
  function challengeConflict(teamId,date,time,except) {
    return teamScheduleConflict(teamId, date, time, 60, {challenge: except});
  }
  function teamScheduleConflict(teamId, date, time, minutes, except = {}) {
    const start = Date.parse(date+'T'+time+':00+03:00'), end = start + Number(minutes)*60000;
    const overlaps = (date,time,minutes) => {const other = Date.parse(date+'T'+time+':00+03:00'); return start < other+Number(minutes)*60000 && other < end;};
    return data.registrations.some(r => r.teamId === teamId && r.status === 'Registered' && r.tournamentId !== except.tournament && data.tournaments.some(t => t.id === r.tournamentId && holdsFieldTime('tournaments',t) && overlaps(t.date,t.time,t.durationMinutes))) ||
      data.challenges.some(c => c.id !== except.challenge && [c.teamId,c.opponentId].includes(teamId) && ['Agreed','Awaiting payment','Booked'].includes(challengeStatus(c)) && overlaps(c.date,c.time,60));
  }
  function challengeAction(action, values={}) {
    loadFromBrowser();const user=window.KicksAuth?.current();
    if(!user || user.role!=='player')throw Error('Sign in with an active player account.');
    const next=structuredClone(data);let result;
    if(action==='create'){
      const team=activeSquad(values.teamId,user.id);const date=String(values.date||''),time=String(values.time||'');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!isFuture(date,time)||!/^((1[0-9])|(2[0-2])):00$/.test(time))throw Error('Choose a future hourly slot from 10:00 to 22:00 (Amman).');
      const city=String(values.city||'').trim(),note=String(values.note||'').trim();
      if(!['Amman','Irbid','Zarqa','Ajloun','Jerash','Mafraq','Balqa','Madaba','Karak','Tafilah',"Ma'an",'Aqaba'].includes(city)||note.length>300)throw Error('Choose a city and keep the note under 300 characters.');
      if(values.split!=='Half each')throw Error('New challenges require half payment from each captain.');
      if(challengeConflict(team.id,date,time)||data.challenges.some(c=>c.teamId===team.id&&c.date===date&&c.time===time&&challengeStatus(c)==='Open'))throw Error('Your team already has an overlapping challenge or tournament at this time.');
      const terms=splitTerms(values.fieldId,team.format,city,date,time);
      if(values.price===undefined||Math.round(Number(values.price)*100)!==terms.totalCents)throw Error('The pitch price changed. Review the displayed price before posting.');
      result={id:Math.max(0,...next.challenges.map(c=>c.id))+1,teamId:team.id,format:team.format,level:team.level,city,date,time,split:'Half each',paymentMode:'Split checkout',fieldId:terms.field.id,price:terms.totalCents/100,note,status:'Open',createdAt:new Date().toISOString()};next.challenges.push(result);
    }else{
      const c=next.challenges.find(c=>c.id===Number(values.id));if(!c)throw Error('This challenge is unavailable.');
      const host=data.teams.find(t=>t.id===c.teamId),status=challengeStatus(c);result=c;
      if(action==='request'){
        if(status!=='Open')throw Error('This challenge is no longer open.');
        const team=activeSquad(values.teamId,user.id,c.format);
        if(team.id===host.id)throw Error('You cannot challenge your own team.');
        if(c.paymentMode)splitTerms(c.fieldId,c.format,c.city,c.date,c.time,c.price);
        if(challengeConflict(team.id,c.date,c.time))throw Error('Your team already has a match at this time.');
        if(next.challengeRequests.some(r=>r.challengeId===c.id&&r.teamId===team.id&&r.status==='Pending'))throw Error('Your request is already pending.');
        next.challengeRequests.push({id:Math.max(0,...next.challengeRequests.map(r=>r.id))+1,challengeId:c.id,teamId:team.id,note:String(values.note||'').trim().slice(0,300),status:'Pending',createdAt:new Date().toISOString()});
      }else if(action==='accept'||action==='decline'){
        if(host?.captainId!==user.id || status!=='Open')throw Error('Only the posting captain can review open requests.');
        const req=next.challengeRequests.find(r=>r.id===Number(values.requestId)&&r.challengeId===c.id&&r.status==='Pending');if(!req)throw Error('This request is no longer pending.');
        if(action==='accept'){
          activeSquad(host.id,user.id,c.format);const away=data.teams.find(t=>t.id===req.teamId);activeSquad(away?.id,away?.captainId,c.format);
          if(challengeConflict(host.id,c.date,c.time,c.id)||challengeConflict(away.id,c.date,c.time,c.id))throw Error('One of the teams already has a match at this time.');
          c.opponentId=away.id;c.status='Agreed';req.status='Accepted';
          if(c.paymentMode)reserveSplitChallenge(next,c,host,away);
          for(const other of next.challenges.filter(o=>o.id!==c.id&&o.date===c.date&&o.time===c.time&&o.status==='Open'&&[host.id,away.id].includes(o.teamId))){other.status='Cancelled';next.challengeRequests.filter(r=>r.challengeId===other.id&&r.status==='Pending').forEach(r=>r.status='Declined');}
          next.challengeRequests.filter(r=>r.challengeId!==c.id&&r.status==='Pending'&&[host.id,away.id].includes(r.teamId)&&next.challenges.some(o=>o.id===r.challengeId&&o.date===c.date&&o.time===c.time)).forEach(r=>r.status='Withdrawn');next.challengeRequests.filter(r=>r.challengeId===c.id&&r.id!==req.id&&r.status==='Pending').forEach(r=>r.status='Declined');
        }else req.status='Declined';
      }else if(action==='withdraw'){
        const req=next.challengeRequests.find(r=>r.id===Number(values.requestId)&&r.challengeId===c.id&&r.status==='Pending');if(!req||data.teams.find(t=>t.id===req.teamId)?.captainId!==user.id)throw Error('Only the requesting captain can withdraw this request.');req.status='Withdrawn';
      }else if(action==='cancel'){
        if(!['Open','Agreed','Awaiting payment'].includes(status)||![host?.captainId,data.teams.find(t=>t.id===c.opponentId)?.captainId].includes(user.id))throw Error('Only the captains can cancel an unbooked challenge. Contact the organiser for booked matches.');
        if(c.bookingId){const b=next.bookings.find(b=>b.id===c.bookingId);if(b?.splitPayment&&b.status==='Pending'){b.status='Cancelled';b.paymentStatus='Refunded (demo)';for(const p of next.payments)if(p.collection==='bookings'&&p.recordId===b.id&&p.status==='Held (demo)')p.status='Refunded (demo)';}}
        c.status='Cancelled';next.challengeRequests.filter(r=>r.challengeId===c.id&&r.status==='Pending').forEach(r=>r.status='Declined');
      }else throw Error('Unknown challenge action.');
    }
    persist(next);return structuredClone(result);
  }
  function validateChallengeBooking(userId,id,field,date,time) {
    loadFromBrowser();const c=data.challenges.find(c=>c.id===Number(id));
    if(c?.paymentMode)throw Error('Both captains must pay their own half through the challenge checkout.');
    if(!c||challengeStatus(c)!=='Agreed')throw Error('Accept an opponent before booking this challenge.');
    const host=activeSquad(c.teamId,userId,c.format),away=data.teams.find(t=>t.id===c.opponentId);activeSquad(away?.id,away?.captainId,c.format);
    if(date!==c.date||time!==c.time||field.type!==c.format||field.city!==c.city)throw Error('Choose a pitch matching the agreed city, format and kickoff.');
    if(challengeConflict(host.id,date,time,c.id)||challengeConflict(away.id,date,time,c.id))throw Error('One of the teams already has another match.');
    return c;
  }

  function tournamentRoster(userId,eventId,teamId,previousId) {
    loadFromBrowser();
    const user=data.users.find(u=>u.id===userId && u.status==='Active' && u.role==='player');
    const event=data.tournaments.find(t=>t.id===eventId);
    const team=data.teams.find(t=>t.id===teamId);
    if (!user || !event || !team || team.captainId!==user.id) throw Error('Choose a team you captain from the Teams page.');
    if (['Cancelled','Archived'].includes(event.status)) throw Error('This tournament is no longer open.');
    if (teamScheduleConflict(team.id,event.date,event.time,event.durationMinutes,{tournament:event.id})) throw Error('Your team already has an overlapping tournament or challenge. Choose another time.');
    if (team.format!==data.fields.find(f=>f.id===event.fieldId)?.type) throw Error('Your team format must match the tournament.');
    const roster=team.members.filter(m=>data.users.some(u=>u.id===m.userId && u.status==='Active' && u.role==='player')).map(m=>({...m,name:data.users.find(u=>u.id===m.userId).name}));
    const minimum=Number(team.format[0]);
    if (roster.length<minimum) throw Error('Your team needs at least '+minimum+' active players to register.');
    if(data.registrations.some(r=>r.id!==previousId && r.tournamentId===event.id && r.teamId===team.id && r.status==='Registered')) throw Error('This team is already registered.');
    return {team:structuredClone(team),roster:structuredClone(roster)};
  }


  function tournamentAccess(id) {
    loadFromBrowser();
    const cup=data.tournaments.find(t=>t.id===Number(id)),user=window.KicksAuth?.current();
    if(!cup || !user || user.status!=='Active')return {view:false,manage:false};
    const creator=cup.createdBy ?? data.fields.find(f=>f.id===cup.fieldId)?.ownerId;
    const manage=user.role==='admin' || (user.id===creator && user.role==='owner');
    const participant=user.role==='player' && data.registrations.some(r=>r.tournamentId===cup.id && (r.status==='Registered' || cup.status==='Cancelled') &&
      (r.userId===user.id || (Array.isArray(r.roster)?r.roster.some(m=>m.userId===user.id):data.teams.find(t=>t.id===r.teamId)?.members.some(m=>m.userId===user.id))));
    return {view:manage||participant,manage};
  }
  function tournamentBracket(id, action='read', values={}) {
    loadFromBrowser();
    const cup=data.tournaments.find(t=>t.id===Number(id));
    if(!cup) throw Error('Tournament no longer exists.');
    if (action !== 'read' && cup.status === 'Cancelled') throw Error('This tournament was cancelled. Its draw is retained as history.');
    const {view,manage}=tournamentAccess(id);
    if(action!=='read' && !manage)throw Error('Only this tournament organiser can manage the bracket.');
    if(!view)throw Error('Tournament progress is only available to registered participants and its organiser.');
    const entries=data.registrations.filter(r=>r.tournamentId===cup.id&&(r.status==='Registered'||cup.status==='Cancelled'));
    const ids=entries.map(r=>r.id);
    let bracket=structuredClone(cup.bracket||{slots:window.KicksBracketCore.seed(ids),winners:{},started:false});
    if(!bracket.started && JSON.stringify(bracket.slots.filter(Boolean).slice().sort((a,b)=>a-b))!==JSON.stringify(ids.slice().sort((a,b)=>a-b))) bracket={slots:window.KicksBracketCore.seed(ids),winners:{},started:false};
    if(action!=='read') {
      if(!manage)throw Error('Only this tournament organiser can manage the bracket.');
      if(action==='shuffle') {
        if(bracket.started)throw Error('The draw is locked after the tournament starts.');
        const shuffled=ids.slice();
        for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
        bracket={slots:window.KicksBracketCore.seed(shuffled),winners:{},started:false};
      } else if(action==='start') {
        if(bracket.started)throw Error('Tournament already started.');
        if(ids.length<2)throw Error('At least two registered teams are needed.');
        bracket.started=true;
      } else if(action==='advance') {
        if(!bracket.started)throw Error('Start the tournament before advancing teams.');
        const rounds=window.KicksBracketCore.rounds(bracket),match=rounds.flat().find(m=>m.key===values.match);
        if(!match || !match.ready || match.bye || ![match.a.id,match.b.id].includes(values.entryId))throw Error('Advance a team only from its own completed pairing.');
        bracket.winners[match.key]=values.entryId;
        let [r,m]=match.key.split(':').map(Number);
        while(++r<rounds.length){m=Math.floor(m/2);delete bracket.winners[r+':'+m];}
      } else throw Error('Unknown bracket action.');
      const next=structuredClone(data);next.tournaments.find(t=>t.id===cup.id).bracket=bracket;persist(next);
    }
    return {bracket,entries,manage,rounds:window.KicksBracketCore.rounds(bracket)};
  }

  // KICKS-007: the current session identifies the actor; draft fields never do.
  function teamActor() {
    const session = window.KicksAuth?.current();
    const user = session && data.users.find(row => row.id === session.id);
    if (!user || user.role !== 'player' || user.status !== 'Active')
      throw Error('Sign in with an active player account.');
    return user;
  }
  const sameTeamValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function authorizeTeamDraft(before, draft, actor) {
    const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    const profile = ['name', 'city', 'area', 'level', 'format', 'capacity', 'schedule', 'bio', 'color', 'initials', 'open', 'positions', 'logo'];
    const oldTeam = id => before.teams.find(t => t.id === id);
    const team = id => draft.teams.find(t => t.id === id);
    const member = (t, id) => t?.members?.find(m => m.userId === id);
    const activePlayer = id => before.users.some(u => u.id === id && u.role === 'player' && u.status === 'Active');
    const joining = new Set(), departing = new Set();
    const idOK = id => (typeof id === 'string' && id.length > 0) || (Number.isInteger(id) && id > 0);
    for (const kind of ['teams', 'requests']) {
      const rows = draft[kind];
      if (!Array.isArray(rows) || rows.some(r => !r || !idOK(r.id)) || new Set(rows.map(r => r.id)).size !== rows.length)
        throw Error('Invalid or duplicate team/request identity.');
    }
    const oldTeamIds = before.teams.map(t => t.id), oldRequestIds = before.teamRequests.map(r => r.id);
    if (!sameTeamValue(draft.teams.filter(t => oldTeam(t.id)).map(t => t.id), oldTeamIds))
      throw Error('Team deletion/reordering is not supported.');
    if (!sameTeamValue(draft.requests.filter(r => oldRequestIds.includes(r.id)).map(r => r.id), oldRequestIds))
      throw Error('Request deletion/reordering is not supported.');
    for (const t of draft.teams) {
      if (!Array.isArray(t.members)) throw Error('Invalid team roster.');
      const old = oldTeam(t.id);
      if (!old) {
        if (before.teams.some(s => member(s, actor.id))) throw Error('A player can belong to only one team.');
        if (t.captainId !== actor.id || t.members.length !== 1 || t.members[0].userId !== actor.id || !positions.includes(t.members[0].position))
          throw Error('Create a team only for yourself as its sole founding captain.');
        joining.add(actor.id);
        continue;
      }
      if (sameTeamValue(old, t)) continue;
      if (old.captainId !== actor.id) throw Error('Only the captain can change this team or its roster.');
      for (const key of new Set([...Object.keys(old), ...Object.keys(t)])) {
        if (key !== 'members' && !profile.includes(key) && !sameTeamValue(old[key], t[key]))
          throw Error('Team identity, captain and immutable metadata cannot be reassigned.');
      }
      for (const m of old.members) {
        const next = member(t, m.userId);
        if (!next) {
          if (m.userId === old.captainId) throw Error('The captain cannot leave or transfer this team.');
          departing.add(String(t.id) + ':' + m.userId);
        } else {
          for (const key of new Set([...Object.keys(m), ...Object.keys(next)]))
            if (key !== 'position' && !sameTeamValue(m[key], next[key])) throw Error('Team member identity cannot be changed.');
          if (m.position !== next.position && !positions.includes(next.position)) throw Error('Choose a valid roster position.');
        }
      }
      for (const m of t.members.filter(m => !member(old, m.userId))) {
        const pending = before.teamRequests.find(r => r.teamId === t.id && r.userId === m.userId && r.type !== 'leave' && r.status === 'pending');
        const accepted = pending && draft.requests.find(r => r.id === pending.id && r.status === 'accepted');
        if (!activePlayer(m.userId) || !pending || !accepted || m.position !== pending.position || !positions.includes(m.position))
          throw Error('Add a player only by accepting their existing pending join request.');
        if (before.teams.some(s => member(s, m.userId))) throw Error('A player can belong to only one team.');
        joining.add(m.userId);
      }
    }
    // Derived updates are owned by the transaction, not by the caller's identity fields.
    for (const r of draft.requests) {
      const old = before.teamRequests.find(item => item.id === r.id);
      if (!old || old.status !== 'pending' || r.status !== 'pending') continue;
      if (old.type === 'leave' && departing.has(String(old.teamId) + ':' + old.userId)) r.status = 'accepted';
      else if (joining.has(old.userId)) r.status = 'cancelled';
    }
    const pendingKeys = new Set();
    for (const r of draft.requests) {
      const old = before.teamRequests.find(item => item.id === r.id), target = oldTeam(r.teamId);
      if (!old) {
        if (!target || r.userId !== actor.id || r.status !== 'pending' || ![undefined, 'join', 'leave'].includes(r.type))
          throw Error('Create only your own pending request for an existing team.');
        if (typeof r.message !== 'string' || r.message.trim().length < 10 || r.message.trim().length > 300)
          throw Error('Write a team request message of 10-300 characters.');
        if (r.type === 'leave') {
          const current = member(target, actor.id);
          if (!current || target.captainId === actor.id || r.position !== current.position)
            throw Error('Only a non-captain member can request to leave.');
        } else if (before.teams.some(t => member(t, actor.id)) || joining.has(actor.id) || !target.open || target.members.length >= target.capacity || !positions.includes(r.position)) {
          throw Error('Join requests require a free player and a recruiting team with space.');
        }
      } else if (!sameTeamValue(old, r)) {
        for (const key of new Set([...Object.keys(old), ...Object.keys(r)]))
          if (key !== 'status' && !sameTeamValue(old[key], r[key])) throw Error('Request identity and submitted details cannot be reassigned.');
        if (old.status !== 'pending') throw Error('This team request is already closed.');
        const captain = target?.captainId === actor.id;
        if (r.status === 'cancelled') {
          if (old.userId !== actor.id && !joining.has(old.userId)) throw Error('Only the requesting player can cancel this request.');
        } else if (r.status === 'declined') {
          if (!captain) throw Error('Only the captain can review this request.');
        } else if (r.status === 'accepted') {
          if (!captain) throw Error('Only the captain can accept this request.');
          if (old.type === 'leave') {
            if (!member(target, old.userId) || member(team(old.teamId), old.userId) || old.userId === target.captainId)
              throw Error('Approve departure only by removing the requesting non-captain member.');
          } else if (!joining.has(old.userId) || !member(team(old.teamId), old.userId)) {
            throw Error('Accept a join request together with its authorized roster addition.');
          }
        } else throw Error('Unsupported team request transition.');
      }
      if (r.status === 'pending') {
        const key = String(r.teamId) + ':' + r.userId + ':' + (r.type === 'leave' ? 'leave' : 'join');
        if (pendingKeys.has(key)) throw Error('This player already has a pending team request.');
        pendingKeys.add(key);
      }
    }
    const seen = new Set(), names = new Set();
    for (const t of draft.teams) {
      const name = String(t.name || '').trim().toLowerCase();
      if (!name || names.has(name)) throw Error('Choose a unique team name.');
      names.add(name);
      if (!t.members.some(m => m.userId === t.captainId) || t.members.length > t.capacity) throw Error('Invalid team roster.');
      for (const m of t.members) {
        const player = before.users.find(u => u.id === m.userId);
        if (!player || player.role !== 'player' || seen.has(m.userId)) throw Error('A player can belong to only one team.');
        seen.add(m.userId);
      }
    }
  }
  function updateTeams(change) {
    loadFromBrowser();
    const actor = teamActor(), before = structuredClone(data), baseline = JSON.stringify(data);
    const view = {teams: structuredClone(before.teams), requests: structuredClone(before.teamRequests), users: before.users.map(({id, name}) => ({id, name})), currentUserId: actor.id};
    const users = JSON.stringify(view.users), teams = view.teams, requests = view.requests;
    if (typeof change !== 'function') throw Error('Provide a synchronous team transaction.');
    const result = change(view);
    if (result && typeof result.then === 'function') throw Error('Team transactions must be synchronous.');
    if (view.currentUserId !== actor.id || JSON.stringify(view.users) !== users || view.teams !== teams || view.requests !== requests)
      throw Error('Team transaction actor and user projections are read-only.');
    // Detach callback-owned references before validation/persistence.
    const draft = structuredClone({teams: view.teams, requests: view.requests});
    authorizeTeamDraft(before, draft, actor);
    loadFromBrowser();
    if (teamActor().id !== actor.id || JSON.stringify(data) !== baseline) throw Error('Team/session data changed during the transaction. Reload and retry.');
    if (sameTeamValue(draft.teams, before.teams) && sameTeamValue(draft.requests, before.teamRequests)) return;
    const next = structuredClone(before);
    next.teams = draft.teams;
    next.teamRequests = draft.requests;
    persist(next);
  }
  function teamLeave(action, teamId, requestId) {
    loadFromBrowser();
    const actor = teamActor();
    return updateTeams(view => {
      const team = view.teams.find(t => t.id === teamId);
      if (!team) throw Error('This team is unavailable.');
      if (action === 'request') {
        if (team.captainId === actor.id || !team.members.some(m => m.userId === actor.id)) throw Error('Only a non-captain member can request to leave.');
        if (view.requests.some(r => r.teamId === teamId && r.userId === actor.id && r.type === 'leave' && r.status === 'pending')) throw Error('Your leave request is awaiting captain approval.');
        view.requests.push({id:'leave-' + crypto.randomUUID(),type:'leave',teamId,userId:actor.id,position:team.members.find(m => m.userId === actor.id).position,message:'Requests captain approval to leave the team.',status:'pending',createdAt:new Date().toISOString()});
      } else {
        const request = view.requests.find(r => r.id === requestId && r.teamId === teamId && r.type === 'leave' && r.status === 'pending');
        if (team.captainId !== actor.id || !request || !['accept', 'decline'].includes(action)) throw Error('Only the captain can review this leave request.');
        if (action === 'accept') team.members = team.members.filter(m => m.userId !== request.userId);
        request.status = action === 'accept' ? 'accepted' : 'declined';
      }
    });
  }

  const api = {
    payChallengeShare,
    isFieldSlotAvailable,
    teamLeave,
    tournamentBracket,
    tournamentAccess,
    challengeAction,
    challengeStatus,
    validateChallengeBooking,
    updateTeams,
    tournamentRoster,
    endsAt,
    hasEnded,
    activityStatus,
    watchActivityClock,
    publicActivities,
    list,
    save,
    remove,
    find,
    book,
    join,
    leave,
    escape: escapeHtml,
    submitFeedback(details) {
      const name = String(details.name || "").trim();
      const email = String(details.email || "").trim();
      const message = String(details.message || "").trim();
      const rating = Number(details.rating);
      if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 1500 || !Number.isInteger(rating) || rating < 1 || rating > 5) throw Error("Enter your name, a valid email, a rating and a message of 10–1500 characters.");
      return save("feedback", { name, email, message, rating, createdAt: new Date().toISOString() });
    },
    settings() {
      loadFromBrowser();
      return structuredClone(data.settings);
    },
    updateSettings(changes) {
      loadFromBrowser();
      if (mutationActor()?.role !== "admin") throw Error("Administrator permission is required to change settings.");
      if (!changes || typeof changes !== "object" || Array.isArray(changes)) throw Error("Enter valid settings changes.");
      changes = { ...changes };
      for (const key of ["commissionRate", "listingFee"]) {
        if (!Object.hasOwn(changes, key)) continue;
        const value = Number(changes[key]);
        if (!Number.isFinite(value) || value < 0 || (key === "commissionRate" && value > 100))
          throw Error("Commission must be 0–100%; listing fee must be zero or more.");
        changes[key] = value;
      }
      const next = structuredClone(data);
      next.settings = { ...next.settings, ...changes };
      persist(next);
    },
    persistent: () => storageAvailable,
  };
  // The synchronous facade exists only during this synchronous callback. Never
  // expose it after lock release, and never run async UI/network work inside it.
  function transaction(change) {
    return write(() => {
      let active = true;
      const before = structuredClone(data), view = {};
      batching = true; staged = false;
      for (const [name, method] of Object.entries(api)) if (typeof method === 'function')
        view[name] = (...args) => { if (!active) throw Error('Transaction is closed.'); return method(...args); };
      try {
        const result = change(Object.freeze(view));
        if (result && typeof result.then === 'function') {
          Promise.resolve(result).catch(() => {});
          throw Error('Storage transaction callbacks must be synchronous.');
        }
        batching = false;
        if (staged) persist(data);
        return result;
      } catch (error) { data = before; throw error; }
      finally { active = false; batching = false; staged = false; }
    });
  }
  const mutations = ['save','remove','book','join','leave','teamLeave','updateTeams','challengeAction','payChallengeShare','submitFeedback','updateSettings'];
  const exported = {...api, coordinate, updateMessages, transaction, ready};
  for (const name of mutations) exported[name] = async (...args) => {
    // Freeze caller-owned records/options while waiting; capture the record
    // version now so a queued replacement cannot overwrite another edit.
    const input = name === 'updateTeams' ? args : structuredClone(args);
    const collection = name === 'save' || name === 'remove' ? input[0] : null;
    const id = name === 'save' ? input[1]?.id : name === 'remove' ? input[1] : null;
    const expected = id == null ? undefined : JSON.stringify(name === 'save' && args[3] !== undefined ? args[3] : data[collection]?.find(row => row.id === id));
    return write(() => {
      if (id != null && JSON.stringify(data[collection]?.find(row => row.id === id)) !== expected)
        throw Error('This record changed in another operation. Reload and retry; no changes were saved.');
      return api[name](...input);
    });
  };
  exported.tournamentBracket = (id, action = 'read', values = {}) => action === 'read'
    ? api.tournamentBracket(id) : write(() => api.tournamentBracket(id, action, structuredClone(values)));
  window.KicksStore = exported;

}
