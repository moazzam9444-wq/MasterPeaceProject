// دليل الملف: لوحات الأدوار: تحديد الأقسام، عرض الجداول، نماذج التعديل، ثم البروفايل. schemas تصف حقول كل نموذج.
(() => {
  "use strict";
  const role = document.body.dataset.dashboard;
  const account = KicksAuth.requireRole(role);
  if (!account) return;
  document.body.classList.remove("account-loading");
  const store = KicksStore,
    escapeHtml = store.escape,
    getElement = (id) => document.getElementById(id),
    currentUserId = account.id;
  // أسماء الأقسام التي تظهر في القائمة الجانبية.
  const labels = {
    overview: "Overview",
    fields: "Fields",
    bookings: "Bookings",
    games: "Open games",
    tournaments: "Tournaments",
    users: "Users",
    memberships: role === "player" ? "My games" : "Match players",
    registrations: role === "player" ? "My tournaments" : "Team registrations",
    profile: "My profile",
    settings: "Site settings",
    revenue: "Revenue",
    feedback: "Feedback",
    messages: "Messages",
  };
  const viewsByRole = {
    player: [
      "overview",
      "bookings",
      "memberships",
      "registrations",
      "messages",
      "profile",
    ],
    owner: ["overview", "fields", "bookings", "games", "memberships", "tournaments", "messages", "profile"],
    admin: [
      "overview",
      "fields",
      "bookings",
      "games",
      "tournaments",
      "memberships",
      "users",
      "registrations",
      "revenue",
      "feedback",
      "messages",
      "profile",
      "settings",
    ],
  };
  const views = viewsByRole[role];
  // أيقونة ثابتة لكل قسم بدل رموز تتغير حسب ترتيب القائمة.
  const sidebarIcons = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    fields: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3"/>',
    bookings: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5"/>',
    games: '<circle cx="12" cy="12" r="9"/><path d="m9 8 7 4-7 4z"/>',
    tournaments: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  };
  sidebarIcons.messages = '<rect x="3" y="4" width="18" height="14" rx="3"/><path d="m4 6 8 6 8-6M7 18v3l4-3"/>';
  sidebarIcons.memberships = sidebarIcons.games;
  sidebarIcons.registrations = sidebarIcons.tournaments;
  sidebarIcons.revenue = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-6 5h3"/>';
  sidebarIcons.feedback = '<path d="M21 11a8 8 0 0 1-8 8H8l-5 3V11a9 9 0 0 1 18 0Z"/><path d="M8 10h8m-8 4h5"/>';
  let view = "overview",
    editing = null,
    profileEditing = false,
    confirmTask = null,
    timer;
  const getCurrentUser = () =>
    store.list("users").find((x) => x.id === currentUserId);
  const getOwnedFieldIds = () =>
    store
      .list("fields", { includeArchived: true })
      .filter((x) => x.ownerId === currentUserId)
      .map((x) => x.id);
  const getRecord = (kind, id) => store.find(kind, id);
  function getVisibleRecords(kind) {
    let rows = store.list(kind).map(record => ({ ...record, ...(store.activityStatus(kind, record) ? { status: store.activityStatus(kind, record) } : {}) }));
    if (role === "admin") return rows;
    if (role === "player")
      return rows.filter((x) => x.userId === currentUserId || (kind==='registrations' && ['Registered','Completed'].includes(x.status) && (x.roster?.some(m=>m.userId===currentUserId) || (!x.roster && store.list('teams').find(t=>t.id===x.teamId)?.members.some(m=>m.userId===currentUserId)))) || (kind==='bookings' && x.captainIds?.includes(currentUserId)));
    if (kind === "fields")
      return rows.filter((x) => x.ownerId === currentUserId);
    if (kind === "memberships")
      return rows.filter((x) =>
        getVisibleRecords("games").some((g) => g.id === x.gameId),
      );
    if (kind === "registrations")
      return rows.filter((x) =>
        getVisibleRecords("tournaments").some((t) => t.id === x.tournamentId),
      );
    return rows.filter((x) => getOwnedFieldIds().includes(x.fieldId));
  }
  function showToast(msg) {
    getElement("dashToast").textContent = msg;
    getElement("dashToast").hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => (getElement("dashToast").hidden = true), 4000);
    getElement("storageWarning").hidden = store.persistent();
  }
  const createButton = (text, attrs = "", secondary = false) =>
    `<button class="dash-btn ${secondary ? "secondary" : ""}" ${attrs}>${text}</button>`;
  function renderDashboard() {
    if (!KicksAuth.requireRole(role)) return;
    view = location.hash.slice(1) || "overview";
    if(view==='meetings'){view='messages';history.replaceState(null,'',location.pathname+location.search+'#messages');}
    if (!views.includes(view)) view = "overview";
    if (view !== "profile") profileEditing = false;
    const u = getCurrentUser();
    getElement("roleLabel").textContent = role + " workspace";
    getElement("accountName").textContent = u.name;
    getElement("accountRole").textContent =
      role === "owner" ? "Field owner" : role;
    getElement("avatarLetters").textContent = u.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
    if (u.avatar)
      getElement("avatarLetters").innerHTML =
        '<img src="' + escapeHtml(u.avatar) + '" alt="">';
    getElement("viewTitle").textContent = labels[view];
    // نبني روابط السايدبار بالتسلسل حتى تبقى سهلة القراءة.
    let navigation = '';
    for (const section of views) {
      let active = '';
      if (view === section) active = 'aria-current="page"';
      navigation += '<a href="#'+section+'" '+active+'><span class="sidebar-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+sidebarIcons[section]+'</svg></span><span class="sidebar-link-label">'+labels[section]+'</span></a>';
    }
    getElement('dashNav').innerHTML = navigation;
    const sidebarProfile = getElement('sidebarProfile');
    if (sidebarProfile) {
      const photo = u.avatar ? '<img src="'+escapeHtml(u.avatar)+'" alt="">' : '<span class="sidebar-initial" aria-hidden="true">'+escapeHtml(u.name.charAt(0).toUpperCase())+'</span>';
      sidebarProfile.innerHTML = photo + '<span><strong>'+escapeHtml(u.name)+'</strong><small>'+escapeHtml(role === 'owner' ? 'Field owner' : role)+' account</small></span><b aria-hidden="true">↗</b>';
    }
    getElement("storageWarning").hidden = store.persistent();
    if (view === "overview") {
      // نعرض الملخص مباشرة، دون دالة وسيطة تستخدم مرة واحدة.
      KicksDashboardOverview.render({
        role: role,
        user: getCurrentUser(),
        views: views,
        labels: labels,
        getRecords: getVisibleRecords,
        getRecord: getRecord,
      });
    } else if (view === "messages") KicksDashboardMessages.render();
    else if (view === "feedback") renderFeedback();
    else if (view === "revenue") renderRevenue();
    else if (view === "profile" || view === "settings")
      renderProfileOrSettings();
    else renderTable(view);
    decorateDashboardTables();
  }
  function decorateDashboardTables() {
    getElement("dashboardView").querySelectorAll("table").forEach(table => {
      if (table.classList.contains("reservations-table")) return;
      table.classList.add("dashboard-table");
      table.closest(".table-wrap")?.classList.add("dashboard-table-wrap");
      const headings = [...table.querySelectorAll("thead th")].map(th => {
        th.scope = "col";
        return th.textContent.trim();
      });
      table.querySelectorAll("tbody tr").forEach(row => [...row.cells].forEach((cell, index) => {
        if (cell.colSpan === 1) {
          cell.dataset.label = headings[index] || "";
          if (headings[index] === "Status" && !cell.children.length) cell.innerHTML = tableBadge(cell.textContent.trim());
        }
      }));
    });
  }
  // كل مصفوفة تحدد الأعمدة المعروضة في جدول واحد.
  const columns = {
    fields: ["name", "type", "price", "rating", "today"],
    games: ["title", "schedule", "places", "price", "status"],
    tournaments: ["name", "schedule", "places", "fee", "status"],
    users: ["name", "role", "city", "status"],
    bookings: ["bookingInfo", "schedule", "price", "split", "payment", "status"],
    memberships: [...(role === "player" ? [] : ["userId"]), "gameId", "position", "schedule", "payment", "status"],
    registrations: ["tournamentId", "teamName", "schedule", "payment", "status"],
  };
  const getFieldLabel = (k) =>
    ({
      fieldId: "Field",
      userId: "Player",
      gameId: "Match",
      tournamentId: "Tournament",
      today: "Available today",
      teamName: "Team",
      ownerId: "Owner",
      amenities: "Facilities (one per line)",
      address: "Residential address",
      phone: "Phone number",
      now: "Available now",
      commission: "KICKS share (demo)",
      ownerNet: "Owner payout (demo)",
      paymentMethod: "Payment method",
      paymentStatus: "Payment status",
      durationMinutes: "Duration (minutes)",
      schedule: "Date & time",
      places: "Participation",
      payment: "Payment",
      bookingInfo: "Booking",
      split: "Revenue split",
      commissionRate: "Booking commission (%)",
      listingFee: "One-time field listing fee (JD)",
    })[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  function getCellText(fieldName, value) {
    const relatedCollections = {
      fieldId: "fields",
      userId: "users",
      gameId: "games",
      tournamentId: "tournaments",
      ownerId: "users",
    };
    const collectionName = relatedCollections[fieldName];
    if (collectionName) {
      const record = getRecord(collectionName, value);
      return escapeHtml(record?.name || record?.title || "—");
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return escapeHtml(value);
  }

  function renderRowActions(collectionName, record) {
    if (collectionName === 'registrations') return record.status === 'Registered' && !store.find('tournaments',record.tournamentId)?.bracket?.started
      ? `<button class="record-delete" data-withdraw-registration="${record.id}">Withdraw & refund</button>` : '<span class="table-secondary">'+(store.find('tournaments',record.tournamentId)?.bracket?.started ? 'Draw locked' : 'History retained')+'</span>';
    if(collectionName==='tournaments' && !store.tournamentAccess(record.id).manage)return '';
    if (collectionName === "memberships") return "";
    if (role === "player" || (collectionName === "bookings" && role === "owner")) return "";
    if (collectionName === "users") {
      const toggle = record.id !== currentUserId && ["Active", "Inactive"].includes(record.status)
        ? '<button class="' + (record.status === "Active" ? 'record-delete' : 'record-edit') + '" data-account-access="' + record.id + '">' + (record.status === "Active" ? 'Deactivate' : 'Reactivate') + '</button>' : '';
      return '<button class="record-edit" data-edit="users" data-id="' + record.id + '">' + (record.status === "Pending" ? 'Review request' : 'Edit') + ' <span aria-hidden="true">↗</span></button>' + toggle;
    }
    return `${collectionName==='tournaments' && role==='admin' && !['Cancelled','Ended'].includes(record.status)?`<button class="record-delete" data-cancel-tournament="${record.id}">Cancel & refund</button>`:''}<button class="record-edit" data-edit="${collectionName}" data-id="${record.id}">${collectionName === "users" && record.status === "Pending" ? "Review request" : "Edit"} <span aria-hidden="true">↗</span></button>
            <button class="record-delete" data-delete="${collectionName}" data-id="${record.id}">Delete</button>`;
  }
  function tableBadge(value) {
    const text = String(value || "Not recorded");
    let tone = "neutral";
    if (["Active", "Confirmed", "Joined", "Registered", "Paid (demo)", "Yes"].includes(text)) tone = "success";
    if (["Completed", "Ended"].includes(text)) tone = "complete";
    if (["Pending", "Set duration", "In progress"].includes(text)) tone = "warning";
    if (["Cancelled", "Withdrawn", "Left", "Inactive", "Archived", "Refunded (demo)"].includes(text)) tone = "muted";
    return `<span class="table-badge table-badge--${tone}">${escapeHtml(text)}</span>`;
  }
  function fieldThumbnail(field) {
    return KicksAuth.fieldImage(field).replace(/assets\/images\/(field[1-4])\.jpg$/, "assets/images/$1-home.webp");
  }
  function renderTableCell(kind, key, record) {
    const event = kind === "memberships" ? getRecord("games", record.gameId) : kind === "registrations" ? getRecord("tournaments", record.tournamentId) : record;
    if (key === "schedule") {
      if (!event?.date) return '<span class="table-secondary">Not scheduled</span>';
      const date = new Date(event.date + "T12:00:00+03:00");
      const label = Number.isNaN(date.getTime()) ? event.date : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Amman" });
      return `<strong class="table-primary">${escapeHtml(label)}</strong><small class="table-secondary">${escapeHtml(event.time || "")} · Amman${event.durationMinutes ? " · " + escapeHtml(event.durationMinutes) + " min" : ""}</small>${["games", "tournaments"].includes(kind) && !event.durationMinutes ? tableBadge("Set duration") : ""}`;
    }
    if (kind === "memberships" && key === "position") return '<span class="table-role">' + escapeHtml(record.position || "Not specified") + '</span>';
    if (kind === "memberships" && key === "userId") return '<strong class="table-primary">' + escapeHtml(getRecord("users", record.userId)?.name || "Player") + '</strong>';
    if (key === "status") return tableBadge(record.status);
    if (key === "today") return tableBadge(record.today ? "Yes" : "No");
    if (key === "role") return `<span class="table-role">${escapeHtml(record.role === "owner" ? "Field owner" : record.role)}</span>`;
    if (key === "payment") return `${tableBadge(record.paymentStatus)}<small class="table-secondary">${escapeHtml(record.paymentMethod || "No method recorded")}</small>`;
    if (key === "durationMinutes") return record.durationMinutes ? `${escapeHtml(record.durationMinutes)} <span class="table-secondary">min</span>` : tableBadge("Set duration");
    if (key === "places") return `<strong class="table-primary">${Number(record.joined ?? record.teams ?? 0)} <span class="table-secondary">/ ${Number(record.capacity)}</span></strong><small class="table-secondary">${kind === "games" ? "players" : "teams"}</small>`;
    if (key === "split") return `<strong class="table-primary">KICKS ${Number(record.commission || 0).toFixed(2)} JD</strong><small class="table-secondary">Owner ${Number(record.ownerNet || 0).toFixed(2)} JD</small>`;
    if (key === "bookingInfo") {
      const field = getRecord("fields", record.fieldId);
      const player = getRecord("users", record.userId);
      return `<div class="table-venue"><img src="${escapeHtml(fieldThumbnail(field))}" alt="" loading="lazy"><div><strong class="table-primary" dir="auto">${escapeHtml(field?.name || "Unavailable field")}</strong><small class="table-secondary">${escapeHtml(player?.name || "Player")} · #${record.id}${record.challengeId ? `<br><a href="../Challenges/challenges.html?id=${record.challengeId}">${escapeHtml(record.teamNames?.join(" vs ") || "Team challenge")} ↗</a>` : ""}</small></div></div>`;
    }
    if (["price", "fee", "commission", "ownerNet"].includes(key)) return `<strong class="table-money">${Number(record[key] || 0).toFixed(2)} <small>JD</small></strong>`;
    if (key === "name" && kind === "users") return `<div class="table-person"><span class="table-initial" aria-hidden="true">${escapeHtml(record.name?.charAt(0) || "?")}</span><div><strong class="table-primary" dir="auto">${escapeHtml(record.name)}</strong><small class="table-secondary">${escapeHtml(record.email)}</small></div></div>`;
    if (key === "fieldId" || (kind === "fields" && key === "name")) {
      const field = key === "fieldId" ? getRecord("fields", record.fieldId) : record;
      return `<div class="table-venue"><img src="${escapeHtml(fieldThumbnail(field))}" alt="" loading="lazy"><div><strong class="table-primary" dir="auto">${escapeHtml(field?.name || "Unavailable field")}</strong><small class="table-secondary">${escapeHtml(field?.city || "")}</small></div></div>`;
    }
    if(key==='tournamentId')return `<a class="table-primary" href="../Tournaments/tournament-details.html?id=${record.tournamentId}" dir="auto">${escapeHtml(event?.name||"Tournament")} ↗</a><small class="table-secondary">${escapeHtml(getRecord("fields",event?.fieldId)?.name||"")}</small>`;
    if (["gameId", "tournamentId"].includes(key)) return `<strong class="table-primary" dir="auto">${escapeHtml(event?.title || event?.name || "Unavailable activity")}</strong><small class="table-secondary">${escapeHtml(getRecord("fields", event?.fieldId)?.name || "")}</small>`;
    if (["games", "tournaments"].includes(kind) && ["name", "title"].includes(key)) {
      const field = getRecord("fields", record.fieldId);
      return `<div class="table-venue"><img src="${escapeHtml(fieldThumbnail(field))}" alt="" loading="lazy"><div><strong class="table-primary" dir="auto">${kind==='tournaments'?`<a href="../Tournaments/tournament-details.html?id=${record.id}">${escapeHtml(record[key])} ↗</a>`:escapeHtml(record[key])}</strong><small class="table-secondary">${escapeHtml(field?.name || "Unavailable field")}</small></div></div>`;
    }
    if (["name", "title", "teamName"].includes(key)) return `<strong class="table-primary" dir="auto">${escapeHtml(record[key])}</strong>`;
    return getCellText(key, record[key]) || '<span class="table-secondary">—</span>';
  }

  function renderTableRows(collectionName, records) {
    return records
      .map((record) => {
        const cells = columns[collectionName].map((fieldName) =>
          renderTableCell(collectionName, fieldName, record),
        );
        const searchText = (
          Object.values(record).join(" ") +
          " " +
          cells.join(" ").replace(/<[^>]*>/g, " ")
        ).toLowerCase();
        return `
        <tr data-search="${escapeHtml(searchText)}">
          ${cells.map((text) => "<td>" + text + "</td>").join("")}
          ${role !== "player" ? `<td><div class="row-actions">${collectionName==='tournaments'?`<a class="dash-btn" href="../Tournaments/tournament-details.html?id=${record.id}">Details & bracket ↗</a>`:''}${renderRowActions(collectionName, record)}</div></td>` : ""}
        </tr>`;
      })
      .join("");
  }

  function filterTableRows(searchText) {
    let visibleCount = 0;
    for(const table of document.querySelectorAll('#dashboardView table')){
      if(window.KicksTablePagination){visibleCount+=KicksTablePagination.filter(table,searchText);}
      else for(const row of table.querySelectorAll('tr[data-search]')){row.hidden=!row.dataset.search.includes(searchText.toLowerCase());if(!row.hidden)visibleCount++;}
    }
    getElement("emptySearch").hidden = visibleCount > 0;
    const count = getElement("tableResults");
    if (count) count.textContent = `${visibleCount} record${visibleCount === 1 ? "" : "s"} shown`;
    return visibleCount;
  }

  function renderFeedback() {
    if (role !== "admin") return;
    const feedback = store.list("feedback").reverse();
    let rows = "";
    for (const item of feedback) {
      rows += `<tr><td>${escapeHtml(item.name)}</td><td><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></td><td>${item.rating} / 5</td><td style="min-width:240px;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(item.message)}</td><td>${escapeHtml(item.createdAt.slice(0,10))}</td></tr>`;
    }
    getElement("dashboardView").innerHTML = `<div class="view-heading"><div><h2>Community feedback</h2><p>${feedback.length} responses saved on this browser. Email delivery is separate.</p></div></div><section class="dash-panel"><div class="table-wrap"><table class="records-table"><thead><tr><th>Name</th><th>Email</th><th>Rating</th><th>Message</th><th>Date</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No feedback yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function renderRevenue() {
    if (role !== "admin") return;
    const payments = store.list("payments").filter(row => row.adminId === currentUserId);
    let balance = 0;
    let listingRevenue = 0;
    let commissions = 0;
    let rows = "";
    for (const paid of [...payments].reverse()) {
      if (paid.status === "Paid (demo)") {
        balance += paid.commission;
        if (paid.kind === "Field listing") listingRevenue += paid.commission;
        else commissions += paid.commission;
      }
      const payer = getRecord("users", paid.userId);
      rows += `<tr><td>${escapeHtml(paid.kind)} #${paid.recordId}</td><td>${escapeHtml(payer?.name || "Removed account")}</td><td>${escapeHtml(paid.createdAt.slice(0,10))}</td><td>${paid.amount.toFixed(2)} JD</td><td>${paid.commission.toFixed(2)} JD</td><td>${paid.ownerNet.toFixed(2)} JD</td><td>${escapeHtml(paid.status)}</td></tr>`;
    }
    getElement("dashboardView").innerHTML = `<div class="view-heading"><div><h2>Platform revenue</h2><p>Credited to ${escapeHtml(getCurrentUser().name)} · local simulation, no bank transfers.</p></div></div>
      <section class="dash-panel"><h2>Account balance: ${balance.toFixed(2)} JD</h2><p>Booking commissions: ${commissions.toFixed(2)} JD · Field listing fees: ${listingRevenue.toFixed(2)} JD</p><p>Current policy: ${Number(store.settings().commissionRate)}% deducted from the organizer, plus ${Number(store.settings().listingFee).toFixed(2)} JD once when an owner publishes a new field. Refunded payments are excluded from this balance.</p></section>
      <section class="dash-panel"><h2>Payment history</h2><div class="table-wrap"><table class="records-table"><thead><tr><th>Source</th><th>Paid by</th><th>Date</th><th>Total</th><th>KICKS share</th><th>Organizer net</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No payments yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function renderTable(collectionName) {
    const records = getVisibleRecords(collectionName);
    if (["player", "owner"].includes(role) && collectionName === "bookings") {
      renderBookingsHistory(records);
      return;
    }
    const ownerCanAdd =
      role === "owner" &&
      ["fields", "games"].includes(collectionName);
    const canAdd =
      (role === "admin" && !["users", "memberships", "registrations"].includes(collectionName)) || ownerCanAdd;
    const singularNames = {
      fields: "field",
      games: "game",
      tournaments: "tournament",
    };
    let addButton = "";
    if (canAdd) {
      const buttonLabel =
        "Add " + (singularNames[collectionName] || "record") + " +";
      addButton = createButton(
        buttonLabel,
        'data-add="' + collectionName + '"',
      );
    }
    const tableColumns = columns[collectionName];
    const headings = tableColumns
      .map((fieldName) => "<th>" + (fieldName === "price" ? collectionName === "fields" ? "Price / hour" : collectionName === "games" ? "Player fee" : "Amount" : fieldName === "fee" ? "Team fee" : getFieldLabel(fieldName)) + "</th>")
      .join("");
    const heading = role === "player" ? collectionName === "memberships" ? "Your match history" : "Your team entries" : "Manage " + labels[collectionName].toLowerCase();
    getElement("dashboardView").innerHTML = `
      <div class="view-heading">
        <div><h2>${heading}</h2><p>${records.length} records${role === "player" ? " · Current and past participation" : ""}${["games", "tournaments"].includes(collectionName) ? " · Set a duration to publish older activities. Ended activities stay here as history." : ""}</p></div>
        ${addButton}
      </div>
      <section class="dash-panel dashboard-records-panel">
        <div class="table-tools"><label for="tableSearch"><span>Search ${labels[collectionName].toLowerCase()}</span><input id="tableSearch" type="search" placeholder="Search by name, date or status"></label><span id="tableResults" class="table-results" role="status">${records.length} record${records.length === 1 ? "" : "s"}</span></div>
        <div class="table-wrap"><table class="records-table" aria-label="${labels[collectionName]}">
          <thead><tr>${headings}${role !== "player" ? "<th>Actions</th>" : ""}</tr></thead>
          <tbody>${renderTableRows(collectionName, records)}</tbody>
        </table></div>
        <p id="emptySearch" class="empty-dashboard" ${records.length ? "hidden" : ""}>No records found.</p>
      </section>`;
    getElement("tableSearch").addEventListener("input", (event) =>
      filterTableRows(event.target.value),
    );
  }
  function renderBookingsHistory(records) {
    const ownerView = role === "owner";
    const statusStyles = { Confirmed: "confirmed", Pending: "pending", Completed: "completed", Cancelled: "cancelled" };
    const rows = records.map((booking) => {
      const field = getRecord("fields", booking.fieldId);
      const fieldName = field?.name || "Unavailable field";
      const date = new Date(booking.date + "T12:00:00");
      const dateLabel = Number.isNaN(date.getTime()) ? booking.date : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const payment = booking.paymentStatus || "Not recorded";
      const paymentStyle = payment === "Paid (demo)" ? "paid" : payment === "Refunded (demo)" ? "refunded" : "unrecorded";
      const playerName = ownerView ? getRecord("users", booking.userId)?.name || "Player" : "";
      const search = Object.values(booking).join(" ") + " " + fieldName + " " + dateLabel + " " + playerName;
      return `<tr data-search="${escapeHtml(search.toLowerCase())}">
        <td data-label="Field"><div class="reservation-field"><img src="${escapeHtml(fieldThumbnail(field))}" alt="" loading="lazy"><div><strong dir="auto">${escapeHtml(fieldName)}</strong><small>Booking #${escapeHtml(String(booking.id))}${ownerView ? " · " + escapeHtml(playerName) : ""}</small>${booking.challengeId ? `<small><a href="../Challenges/challenges.html?id=${booking.challengeId}">${escapeHtml(booking.teamNames?.join(" vs ") || "Team match")} ↗</a></small>` : ""}</div></div></td>
        <td data-label="Date & time"><div class="reservation-schedule"><strong>${escapeHtml(dateLabel)}</strong><small>${escapeHtml(booking.time)} <span>· 1 hour</span></small></div></td>
        <td data-label="Amount"><strong class="reservation-price">${Number(booking.price || 0).toFixed(2)} <small>JD total</small></strong>${booking.splitPayment?`<small>${ownerView?'Two captain payments':('Your half: '+Number(booking.shares?.find(s=>s.userId===currentUserId)?.amount||0).toFixed(2)+' JD')}</small>`:''}</td>
        <td data-label="Payment"><div class="reservation-payment"><span class="payment-label payment-label--${paymentStyle}">${escapeHtml(payment)}</span><small>${escapeHtml(booking.splitPayment ? 'Split between both captains' : booking.challengeId ? "Booked by " + (getRecord("users", booking.userId)?.name || "Posting captain") : booking.paymentMethod || "No method recorded")}</small>${booking.splitPayment?`<small>${booking.shares.filter(s=>s.paid).length}/2 halves received${booking.status==='Pending'?' · Not confirmed yet':''}</small>`:''}</div></td>
        <td data-label="Status"><span class="reservation-status reservation-status--${statusStyles[booking.status] || "pending"}">${escapeHtml(booking.status || "Unknown")}</span></td>
      </tr>`;
    }).join("");
    getElement("dashboardView").innerHTML = `<section class="dash-panel reservations-panel" aria-label="Your bookings">
      <div class="reservations-heading"><div><p class="reservation-eyebrow">YOUR TIME ON THE PITCH</p><h2>${ownerView ? "Your field bookings" : "Your reservations"}</h2><p>Keep track of current bookings and completed booking history.</p></div><a class="dash-btn" href="${ownerView ? "#fields" : "../Fields/fields.html"}">${ownerView ? "Manage fields" : "Book a field"} <span aria-hidden="true">↗</span></a></div>
      <div class="reservations-tools"><label class="reservation-search" for="tableSearch"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><span class="visually-hidden">Search your bookings</span><input id="tableSearch" type="search" placeholder="Search by field, date or status"></label><span id="bookingResults" class="reservation-count">${records.length} booking${records.length === 1 ? "" : "s"}</span></div>
      <div class="table-wrap reservations-table-wrap"><table class="reservations-table" aria-label="Booking history"><thead><tr><th scope="col">Field</th><th scope="col">Date & time</th><th scope="col">Amount</th><th scope="col">Payment</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div id="emptySearch" class="reservations-empty" ${records.length ? "hidden" : ""}><h3>No bookings to show</h3><p>${records.length ? "Try a different field name, date or status." : "Your next game starts with the right pitch. Book a field to see it here."}</p></div>
    </section>`;
    getElement("tableSearch").addEventListener("input", (event) => {
      const count = filterTableRows(event.target.value);
      getElement("bookingResults").textContent = `${count} of ${records.length} booking${records.length === 1 ? "" : "s"}`;
    });
  }
  const select = (...options) => ({ type: "select", options });
  // وصف حقول النماذج: الاسم، نوع الإدخال، وخيارات القائمة.
  const schemas = {
    fields: {
      name: "text",
      city: select(
        "Amman",
        "Irbid",
        "Zarqa",
        "Ajloun",
        "Jerash",
        "Mafraq",
        "Balqa",
        "Madaba",
        "Karak",
        "Tafilah",
        "Ma'an",
        "Aqaba",
      ),
      area: "text",
      description: "textarea",
      amenities: "textarea",
      type: select("5v5", "6v6", "7v7"),
      price: "number",
      rating: "number",
      image: select(1, 2, 3, 4),
      ownerId: {
        ref: "users",
        filter: (x) => ["owner", "admin"].includes(x.role),
      },
      now: "checkbox",
      today: "checkbox",
    },
    games: {
      title: "text",
      fieldId: { ref: "fields" },
      date: "date",
      time: "time",
      durationMinutes: "number",
      joined: "number",
      capacity: "number",
      price: "number",
      level: select("All levels", "Intermediate", "Competitive"),
    },
    tournaments: {
      name: "text",
      fieldId: { ref: "fields" },
      date: "date",
      time: "time",
      durationMinutes: "number",
      fee: "number",
      teams: "number",
      capacity: "number",
      prize: "text",
      system: select("Group stage + knockout", "Single elimination"),
      level: select("All levels", "Intermediate", "Competitive"),
    },
    users: {
      name: "text",
      email: "email",
      role: select("player", "owner", "admin"),
      city: "text",
      status: select("Pending", "Active", "Rejected", "Inactive"),
    },
    bookings: {
      userId: { ref: "users", filter: (x) => x.role === "player" },
      fieldId: { ref: "fields" },
      date: "date",
      time: "time",
      price: "number",
      status: select("Pending", "Confirmed", "Completed", "Cancelled"),
    },
    memberships: {
      userId: { ref: "users", filter: (x) => x.role === "player" },
      gameId: { ref: "games" },
      position: select("Goalkeeper", "Defender", "Midfielder", "Forward"),
      status: select("Joined", "Left"),
    },
    registrations: {
      userId: { ref: "users", filter: (x) => x.role === "player" },
      tournamentId: { ref: "tournaments" },
      teamName: "text",
      captain: "text",
      email: "email",
      status: select("Registered", "Withdrawn"),
    },
  };
  function shouldShowField(fieldName) {
    if (['joined','teams'].includes(fieldName)) return false;
    if (role === "owner" && ["ownerId", "rating"].includes(fieldName))
      return false;
    if (role === "player" && ["userId", "status", "price"].includes(fieldName))
      return false;
    return true;
  }

  // القوائم المرتبطة تعرض الأسماء، لكنها تحفظ أرقام السجلات.
  function getFieldOptions(definition) {
    if (!definition.ref) return definition.options;
    let records = store.list(definition.ref);
    if (definition.ref === "fields" && editing?.old?.fieldId) {
      const previousField = store.find("fields", editing.old.fieldId);
      if (previousField && !records.some(field => field.id === previousField.id)) records.push({ ...previousField, name: previousField.name + " (archived)" });
    }
    if (role === "player" && ["games", "tournaments"].includes(definition.ref)) {
      records = store.publicActivities(definition.ref).filter(record => Date.parse(record.date + "T" + record.time + ":00+03:00") > Date.now());
    }
    if (definition.filter) records = records.filter(definition.filter);
    if (role === "owner") {
      if (definition.ref === "fields") {
        records = records.filter((record) => record.ownerId === currentUserId);
      } else if (["games", "tournaments"].includes(definition.ref)) {
        const fieldIds = getOwnedFieldIds();
        records = records.filter((record) => fieldIds.includes(record.fieldId));
      }
    }
    return records.map((record) => [record.id, record.name || record.title]);
  }

  function renderSelectInput(fieldName, options, value, disabled) {
    const optionHtml = options
      .map((option) => {
        let optionValue = option;
        let optionLabel = option;
        if (Array.isArray(option)) {
          optionValue = option[0];
          optionLabel = option[1];
        }
        const selected =
          String(optionValue) === String(value) ? "selected" : "";
        return `<option value="${escapeHtml(optionValue)}" ${selected}>${escapeHtml(optionLabel)}</option>`;
      })
      .join("");
    return `<select id="edit-${fieldName}" name="${fieldName}" ${disabled ? "disabled" : ""} required>${optionHtml}</select>`;
  }

  function renderInput(fieldName, inputType, value) {
    if (inputType === "textarea")
      return `<textarea id="edit-${fieldName}" name="${fieldName}" rows="4" maxlength="2000" required>${escapeHtml(value)}</textarea>`;
    if (inputType === "checkbox") {
      return `<input id="edit-${fieldName}" name="${fieldName}" type="checkbox" ${value ? "checked" : ""}>`;
    }
    let numberRules = "";
    if (inputType === "number") {
      numberRules = 'min="0" step="1"';
      if (fieldName === "rating") numberRules = 'min="0" max="5" step="0.1"';
      if (fieldName === "durationMinutes") numberRules = 'min="1" step="1"';
    }
    return `<input id="edit-${fieldName}" name="${fieldName}" type="${inputType}" value="${escapeHtml(value)}" ${editing?.kind === "users" && fieldName === "city" ? "" : "required"} maxlength="160" ${numberRules}>`;
  }

  // نفس نافذة الإدخال تستخدم للإضافة والتعديل.
  function openEditor(kind, id, defaults = {}) {
    if(kind==='tournaments'&&!id&&role!=='admin'){showToast('Only an administrator can create a tournament.');return;}
    if(kind==='registrations' && !id){location.assign(KicksAuth.url('Pages/Tournaments/tournaments.html'));return;}

    const old = id ? getRecord(kind, id) : {};
    editing = { kind, old, defaults };
    const initialValues = {
      capacity: kind === "tournaments" ? 8 : 10,
      joined: 0,
      teams: 0,
      rating: 0,
      image: 1,
      price: 0,
      fee: 0,
    };
    const fieldsHtml = [];
    for (const [fieldName, fieldDefinition] of Object.entries(schemas[kind])) {
      if (!shouldShowField(fieldName)) continue;
      let definition = fieldDefinition;
      if (typeof definition === "string") definition = { type: definition };
      const value =
        old[fieldName] ?? defaults[fieldName] ?? initialValues[fieldName] ?? "";
      const options = getFieldOptions(definition);
      const disabled =
        kind === "users" && fieldName === "role" && id === currentUserId;
      let inputHtml;
      if (options) {
        inputHtml = renderSelectInput(fieldName, options, value, disabled);
      } else {
        inputHtml = renderInput(fieldName, definition.type, value);
      }
      fieldsHtml.push(`
        <div class="form-field">
          <label for="edit-${fieldName}">${getFieldLabel(fieldName)}</label>
          ${inputHtml}${fieldName === "durationMinutes" ? '<small>The activity ends and leaves public listings after this many minutes from kickoff (Amman time).</small>' : ""}
        </div>`);
    }
    getElement("editorTitle").textContent =
      (id ? "Edit " : "Add ") + labels[kind];
    getElement("editorError").textContent = "";
    getElement("editorFields").innerHTML =
      '<div class="form-grid">' + fieldsHtml.join("") + "</div>";
    if (kind === "users" && role === "admin") {
      const proof = old.ownershipProof;
      getElement("editorFields").insertAdjacentHTML("beforeend", '<section class="account-review"><h3>Registration review</h3><p>Requested role: ' + escapeHtml(old.requestedRole || old.role) + '</p><p>Choose the assigned role above. Set status to Active to approve, or Rejected to decline.</p>' + (KicksAuth.validOwnershipProof(proof) ? '<a class="dash-btn secondary" href="' + escapeHtml(proof.data) + '" download="' + escapeHtml(proof.name) + '">Download ownership proof: ' + escapeHtml(proof.name) + '</a>' : '<p>No ownership document submitted.</p>') + '</section>');
    }
    if (["games", "tournaments"].includes(kind)) {
      getElement("editorFields").insertAdjacentHTML("beforeend", '<p id="activityEndPreview" class="activity-end-preview" role="status"></p>');
      const updateEndPreview = () => {
        const record = { date: getElement("edit-date").value, time: getElement("edit-time").value, durationMinutes: Number(getElement("edit-durationMinutes").value) };
        const end = store.endsAt(kind, record);
        getElement("activityEndPreview").textContent = Number.isFinite(end) ? "Ends " + new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Amman" }).format(new Date(end)) + " · Amman. It will then disappear from public listings." : "Set the start date, kickoff and duration to calculate the end time.";
      };
      ["date", "time", "durationMinutes"].forEach(key => getElement("edit-" + key).addEventListener("input", updateEndPreview));
      updateEndPreview();
    }
    if (kind === "fields") {
      getElement("editorFields").insertAdjacentHTML("beforeend", '<div class="field-location-editor"><strong>Location from your area</strong><p>Choose the city and enter the area above. Nearby results use an approximate area location automatically — no coordinates needed. Place data: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p><p id="fieldLocationStatus" role="status"></p></div>');
      const updatePlacePreview = () => {
        const place = window.KicksPlaces?.resolve({city:getElement("edit-city").value,area:getElement("edit-area").value});
        getElement("fieldLocationStatus").textContent = place ? (place.precision === "area" ? "Area found: " : "Area not identified; using city estimate: ") + place.label : "This location is not recognized yet. The field can still be saved and found by city.";
      };
      getElement("edit-city").addEventListener("change", updatePlacePreview);
      getElement("edit-area").addEventListener("input", updatePlacePreview);
      updatePlacePreview();
      editing.photo = old.photo || "";
      editing.readingPhoto = false;
      getElement("editorFields").insertAdjacentHTML(
        "beforeend",
        '<div class="field-photo-editor"><label for="fieldPhotoUpload">Upload your field photo</label><input id="fieldPhotoUpload" type="file" accept="image/jpeg,image/png,image/webp"><small>Optional · JPG, PNG or WebP · up to 5 MB. Your existing image stays until you save.</small><img id="fieldPhotoPreview" alt="Field photo preview"></div>',
      );
      getElement("fieldPhotoPreview").src = KicksAuth.fieldImage({
        ...old,
        image: old.image || 1,
      });
      getElement("fieldPhotoUpload").addEventListener(
        "change",
        async (event) => {
          const file = event.target.files[0];
          if (!file) return;
          const draft = editing;
          const error = getElement("editorError");
          error.textContent = "";
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
          ) {
            error.textContent = "Choose a JPG, PNG or WebP image under 5 MB.";
            event.target.value = "";
            return;
          }
          draft.readingPhoto = true;
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const image = new Image();
            image.src = dataUrl;
            await image.decode();
            // Keep browser storage small while preserving the photo's proportions.
            const scale = Math.min(
              1,
              1200 / Math.max(image.width, image.height),
            );
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext("2d");
            context.fillStyle = "#fff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const photo = canvas.toDataURL("image/jpeg", 0.8);
            if (photo.length > 800000)
              throw Error("Choose a smaller photo to fit browser storage.");
            if (editing === draft) {
              draft.photo = photo;
              getElement("fieldPhotoPreview").src = photo;
            }
          } catch (problem) {
            if (editing === draft)
              error.textContent =
                problem.message || "This image could not be opened.";
          } finally {
            draft.readingPhoto = false;
          }
        },
      );
    }
    KicksDialogs.open(getElement("editorDialog"));
  }
  function validate(kind, r) {
    if (
      kind === "users" &&
      r.id === currentUserId &&
      (r.role !== role || r.status !== "Active")
    )
      throw Error(
        "You cannot disable or change the role of your signed-in account.",
      );
    if (
      kind === "users" &&
      r.role !== "admin" &&
      store
        .list("users")
        .filter((user) => user.role === "admin" && user.status === "Active")
        .length === 1 &&
      getRecord("users", r.id)?.role === "admin"
    )
      throw Error("Keep at least one active administrator.");
    if (
      kind === "users" &&
      r.role !== "owner" &&
      store.list("fields").some((x) => x.ownerId === r.id)
    )
      throw Error("Reassign this owner's fields before changing their role.");
    for (const [k, def] of Object.entries(schemas[kind])) {
      if (typeof r[k] === "string") {
        r[k] = r[k].trim();
        if (!r[k] && !(kind === "users" && k === "city"))
          throw Error("Please complete " + getFieldLabel(k) + ".");
      }
      if (def.ref && !getRecord(def.ref, r[k]))
        throw Error("Choose an existing " + getFieldLabel(k) + ".");
    }
    if (kind === "fields" && r.now) r.today = true;
    if (["games", "tournaments"].includes(kind)) {
      if (!(store.endsAt(kind, r) > Date.parse(r.date + "T" + r.time + ":00+03:00")))
        throw Error("Enter the activity duration in minutes so its end time can be calculated.");
      const count = kind === "games" ? "joined" : "teams";
      r[count] = store.list(kind === 'games' ? 'memberships' : 'registrations').filter(x => x[kind === 'games' ? 'gameId' : 'tournamentId'] === r.id && x.status === (kind === 'games' ? 'Joined' : 'Registered')).length;
      if (r.capacity < 2 || r[count] > r.capacity)
        throw Error(
          "Capacity must be at least 2 and cannot be less than the current entries.",
        );
      if (kind === "tournaments" && (!Number.isInteger(r.capacity) || r.capacity > 64))
        throw Error("Set a whole-number tournament capacity from 2 to 64 teams.");
      const linked = kind === "games" ? "memberships" : "registrations";
      const fk = kind === "games" ? "gameId" : "tournamentId";
      const active = kind === "games" ? "Joined" : "Registered";
      if (
        r[count] <
        store.list(linked).filter((x) => x[fk] === r.id && x.status === active)
          .length
      )
        throw Error("Count cannot be lower than active entries.");
    }
    if (
      kind === "users" &&
      store
        .list("users")
        .some(
          (x) =>
            x.id !== r.id && typeof x.email === "string" && x.email.toLowerCase() === r.email.toLowerCase(),
        )
    )
      throw Error("That email is already used by a account.");
    if (
      kind === "bookings" &&
      ["Pending", "Confirmed"].includes(r.status) &&
      store
        .list(kind)
        .some(
          (x) =>
            x.id !== r.id &&
            x.fieldId === r.fieldId &&
            x.date === r.date &&
            x.time === r.time &&
            ["Pending", "Confirmed"].includes(x.status),
        )
    )
      throw Error("This field already has a booking at this date and time.");
  }
  // نتحقق أولاً؛ المتجر يحفظ السجل وعدّاد المشاركين معاً.
  async function saveRecord(kind, r, old = {}, payment = null) {
    const signedIn = KicksAuth.requireRole(role);
    if (!signedIn || signedIn.id !== currentUserId) throw Error("Please sign in again.");
    validate(kind, r);
    if (role === "player" && ["Cancelled", "Left", "Withdrawn"].includes(r.status)) throw Error("Player cancellations are disabled. Contact the organiser.");
    if (role === "player" && kind === "bookings" && !r.id)
      return (await store.book(currentUserId, r.fieldId, r.date, r.time, payment));
    if (role === "player" && kind === "memberships" && r.status === "Joined")
      return (await store.join(currentUserId, "games", r.gameId, { payment, position: r.position }));
    if (
      role === "player" &&
      kind === "registrations" &&
      r.status === "Registered" &&
      old.status !== "Registered"
    )
      return (await store.join(currentUserId, "tournaments", r.tournamentId, { ...r, payment }));
    if (role === "player") {
      const event =
        kind === "memberships"
          ? getRecord("games", r.gameId)
          : kind === "registrations"
            ? getRecord("tournaments", r.tournamentId)
            : null;
      if (
        event &&
        ["Joined", "Registered"].includes(r.status) &&
        new Date(event.date + "T" + event.time + ":00+03:00") <= new Date()
      )
        throw Error("This event has already started.");
      if (
        kind === "bookings" &&
        ["Pending", "Confirmed"].includes(r.status) &&
        new Date(r.date + "T" + r.time + ":00+03:00") <= new Date()
      )
        throw Error("Choose a future date and time.");
    }
    return (await store.save(kind, r, payment, old.id ? old : undefined));
  }
  getElement("editorForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      if (editing.readingPhoto)
        throw Error("Wait for the photo to finish loading.");
      const { kind, old, defaults } = editing,
        r = { ...old, ...defaults };
      for (const [k, def] of Object.entries(schemas[kind])) {
        const input = getElement("editorForm").elements[k];
        if (!input) continue;
        const type = typeof def === "string" ? def : def.type;
        r[k] =
          type === "checkbox"
            ? input.checked
            : type === "number" || def.ref || k === "image"
              ? Number(input.value)
              : input.value;
      }
      if (role === "owner" && kind === "fields") {
        r.ownerId = currentUserId;
        r.rating = old.rating || 0;
      }
      if (role === "player") {
        r.userId = currentUserId;
        if (kind === "bookings") {
          r.price = getRecord("fields", r.fieldId).price;
          r.status = "Confirmed";
        }
        if (kind === "registrations") r.status = "Registered";
      }
      if (kind === "fields") {
        r.photo = editing.photo || "";
        if (r.city !== old.city || r.area !== old.area) {
          r.latitude = null; r.longitude = null;
        }

      }
      if (kind === "users" && role === "admin") {
        if (r.status === "Active" && r.role === "owner" && !KicksAuth.validOwnershipProof(r.ownershipProof) && old.requestedRole) throw Error("An ownership document is required before approving a field owner.");
        if (["Active", "Rejected"].includes(r.status) && old.status === "Pending") { r.reviewedAt = new Date().toISOString(); r.reviewedBy = currentUserId; }
      }
      validate(kind, r);
      let payment = null;
      if (kind === "fields" && !r.id && getRecord("users", r.ownerId)?.role === "owner") {
        payment = await KicksCheckout.open(Number(store.settings().listingFee), "Publish " + r.name + " · One-time listing fee");
        if (!payment) return;
      }
      if (role === "player" && ((!r.id && kind === "bookings") || (kind === "memberships" && r.status === "Joined" && old.status !== "Joined") || (kind === "registrations" && r.status === "Registered" && old.status !== "Registered"))) {
        const amount = kind === "bookings" ? getRecord("fields", r.fieldId).price : kind === "memberships" ? getRecord("games", r.gameId).price : getRecord("tournaments", r.tournamentId).fee;
        payment = await KicksCheckout.open(Number(amount), "Confirm your " + labels[kind]);
        if (!payment) return;
      }
      (await saveRecord(kind, r, old, payment));
      getElement("editorDialog").close();
      renderDashboard();
      showToast("Changes saved.");
    } catch (err) {
      getElement("editorError").textContent = err.message;
    }
  });
  function confirmAction(title, text, action) {
    getElement("confirmAction").textContent = "Confirm";
    getElement("confirmTitle").textContent = title;
    getElement("confirmText").textContent = text;
    getElement("confirmError").textContent = "";
    confirmTask = action;
    KicksDialogs.open(getElement("confirmDialog"));
  }
  getElement("confirmAction").addEventListener("click", async () => {
    try {
      (await confirmTask());
      getElement("confirmDialog").close();
      renderDashboard();
      showToast("Changes saved.");
    } catch (err) {
      getElement("confirmError").textContent = err.message;
    }
  });
  // الأزرار تحمل data-* لتحديد العملية والسجل المطلوب.
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.close) getElement(b.dataset.close).close();
    if (b.dataset.add) openEditor(b.dataset.add);
    if (b.dataset.edit) openEditor(b.dataset.edit, Number(b.dataset.id));
    if (b.dataset.cancelTournament || b.dataset.withdrawRegistration) {
      if (!KicksAuth.requireRole('admin')) return;
      const kind = b.dataset.cancelTournament ? 'tournaments' : 'registrations';
      const old = store.find(kind,Number(b.dataset.cancelTournament || b.dataset.withdrawRegistration));
      if (!old) return;
      confirmAction(kind === 'tournaments' ? 'Cancel tournament & refund all teams?' : 'Withdraw team & refund?',
        kind === 'tournaments' ? 'Registration will close, all active team entries will be withdrawn and their demo payments refunded. The draw and financial history will be kept. This cannot be undone.' : 'This team will leave the tournament and its demo payment will be refunded. The entry and receipt will be kept.',
        () => store.save(kind,{...old,status:kind === 'tournaments' ? 'Cancelled' : 'Withdrawn'},null,old));
      getElement('confirmAction').textContent = 'Confirm & refund';
    }
    if (b.dataset.accountAccess) {
      if (!KicksAuth.requireRole("admin")) return;
      const user = store.find("users", Number(b.dataset.accountAccess));
      if (!user) return;
      const activate = user.status === "Inactive";
      confirmAction(activate ? "Reactivate account?" : "Deactivate account?",
        activate ? user.name + " will be able to log in again." : user.name + " will no longer be able to log in. Their account and records will be kept.",
        async () => (await KicksAuth.setAccountActive(user.id, activate)));
      getElement("confirmAction").textContent = activate ? "Reactivate" : "Deactivate";
    }
    if (b.dataset.delete) {
      if (b.dataset.delete === "users") return;
      const kind = b.dataset.delete,
        id = Number(b.dataset.id);
      confirmAction(
        "Delete this record?",
        "Unlinked records are permanently removed. Records with payment, participation or historical references must be retained.",
        async () => {
          (await store.remove(kind, id));
        },
      );
    }
  });
  function renderProfileOrSettings() {
    const settings = view === "settings";
    const data = settings ? store.settings() : getCurrentUser();
    if (!settings && !profileEditing) {
      const avatar = data.avatar || KicksAuth.url("assets/images/avatar.svg");
      const roleName = role === "owner" ? "Field owner" : role;
      const details = [
        ["Full name", data.name],
        ["Email address", data.email],
        ["Phone number", data.phone],
        ["City", data.city],
        ["Address", data.address],
      ];
      getElement("dashboardView").innerHTML = `
        <section class="dash-panel profile-view">
          <div class="profile-view-heading">
            <img src="${escapeHtml(avatar)}" alt="${escapeHtml(data.name)}'s profile picture" class="profile-view-avatar">
            <div><span class="profile-role">${escapeHtml(roleName)} account</span><h2>Your profile</h2><p>Your account information</p></div>
          </div>
          <div class="profile-details-grid">
            ${details.map(([label, value]) => `<div class="profile-detail"><span>${label}</span><strong>${escapeHtml(value || "Not added yet")}</strong></div>`).join("")}
          </div>
          <div class="profile-view-actions"><p>Your information is private to your account.</p><button type="button" class="dash-btn" id="editProfile">Edit profile <span aria-hidden="true">↗</span></button></div>
        </section>`;
      getElement("editProfile").addEventListener("click", () => {
        profileEditing = true;
        renderProfileOrSettings();
      });
      return;
    }
    const keys = settings
      ? ["title", "description", "contact", "city", "commissionRate", "listingFee"]
      : ["name", "email", "phone", "city", "address"];
    const avatar = data.avatar || KicksAuth.url("assets/images/avatar.svg");
    const photoEditor = settings
      ? ""
      : `<div class="profile-avatar-editor"><img id="profilePhoto" src="${escapeHtml(avatar)}" alt="Your profile picture"><div><label for="avatarUpload">Profile picture</label><input id="avatarUpload" type="file" accept="image/png,image/jpeg,image/webp"><small>JPG, PNG or WebP · up to 200 KB</small></div></div>`;
    getElement("dashboardView").innerHTML = `
      <section class="dash-panel"><h2>${settings ? "Site settings" : "Edit your profile"}</h2>
      <p>${settings ? "Update public site details, booking commission and field listing fees." : "Update the name and picture shown on your account."}</p>
      <form id="personalForm" class="profile-form">${photoEditor}<div class="form-grid">
      ${keys.map((key) => `<div class="form-field"><label for="personal-${key}">${getFieldLabel(key)}</label><input id="personal-${key}" name="${key}" value="${escapeHtml(data[key] ?? "")}" type="${["commissionRate", "listingFee"].includes(key) ? "number" : key === "email" || key === "contact" ? "email" : key === "phone" ? "tel" : "text"}" ${["commissionRate", "listingFee"].includes(key) ? 'min="0" step="0.01"' : ""} maxlength="300" ${["city", "contact", "phone", "address"].includes(key) ? "" : "required"}></div>`).join("")}
      </div>${settings ? "" : `<fieldset class="password-settings"><legend>Change password</legend><p>Leave these blank to keep your current password.</p><label>Current password<input name="currentPassword" type="password" autocomplete="current-password"></label><label>New password<input name="newPassword" type="password" autocomplete="new-password"></label><label>Confirm new password<input name="confirmPassword" type="password" autocomplete="new-password"></label></fieldset>`}<p id="personalError" role="alert"></p><div class="profile-edit-actions">${createButton("Save changes ↗")}${settings ? "" : '<button type="button" class="dash-btn secondary" id="cancelProfileEdit">Cancel</button>'}</div></form></section>`;
    if (!settings)
      getElement("cancelProfileEdit").addEventListener("click", () => {
        profileEditing = false;
        renderProfileOrSettings();
      });
    let selectedAvatar = data.avatar || "";
    let readingPhoto = false;
    if (!settings)
      getElement("avatarUpload").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        getElement("personalError").textContent = "";
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > 200 * 1024
        ) {
          event.target.value = "";
          getElement("personalError").textContent =
            "Choose a PNG, JPG or WebP image under 200 KB.";
          return;
        }
        readingPhoto = true;
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const image = new Image();
          image.src = dataUrl;
          await image.decode();
          selectedAvatar = dataUrl;
          getElement("profilePhoto").src = dataUrl;
        } catch {
          getElement("personalError").textContent =
            "This image could not be opened.";
        }
        readingPhoto = false;
      });
    getElement("personalForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (readingPhoto) {
        getElement("personalError").textContent =
          "Wait for the picture to finish loading.";
        return;
      }
      const values = {};
      for (const [name, value] of new FormData(event.target)) {
        values[name] = value;
      }
      try {
        Object.keys(values).forEach(
          (key) => (values[key] = values[key].trim()),
        );
        if (settings) {
          if (!values.title || !values.description)
            throw Error("Enter the title and description.");
          values.commissionRate = Number(values.commissionRate);
          values.listingFee = Number(values.listingFee);
          if (!Number.isFinite(values.commissionRate) || values.commissionRate < 0 || values.commissionRate > 100 || !Number.isFinite(values.listingFee) || values.listingFee < 0) throw Error("Commission must be 0–100%; listing fee must be zero or more.");
          (await store.updateSettings(values));
        } else {
          if (values.name.length < 2) throw Error("Enter your full name.");
          const { currentPassword, newPassword, confirmPassword, ...profile } =
            values;
          if (newPassword !== confirmPassword)
            throw Error("New passwords do not match.");
          const credentials =
            currentPassword || newPassword || confirmPassword
              ? await KicksAuth.passwordChanges(currentPassword, newPassword)
              : {};
          (await saveRecord(
            "users",
            {
              ...getCurrentUser(),
              ...profile,
              ...credentials,
              avatar: selectedAvatar,
            },
            getCurrentUser(),
          ));
        }
        if (!settings) profileEditing = false;
        renderDashboard();
        showToast("Changes saved.");
      } catch (error) {
        getElement("personalError").textContent = error.message;
      }
    });
  }
  document
    .querySelectorAll("[data-logout]")
    .forEach((button) => button.addEventListener("click", KicksAuth.logout));
  window.addEventListener("pageshow", () => {
    if (!KicksAuth.requireRole(role)) return;
  });
  window.addEventListener("hashchange", renderDashboard);
  store.watchActivityClock(() => {
    if (["overview", "games", "tournaments", "bookings", "memberships", "registrations"].includes(view)) renderDashboard();
  });
  renderDashboard();
})();
