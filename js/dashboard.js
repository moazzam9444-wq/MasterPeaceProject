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
    discover: "Find your next game",
    profile: "My profile",
    settings: "Site settings",
    revenue: "Revenue",
    feedback: "Feedback",
    meetings: role === "player" ? "My meetings" : "Meetings",
  };
  const viewsByRole = {
    player: [
      "overview",
      "bookings",
      "memberships",
      "registrations",
      "meetings",
      "discover",
      "profile",
    ],
    owner: ["overview", "fields", "games", "tournaments", "meetings", "profile"],
    admin: [
      "overview",
      "fields",
      "bookings",
      "games",
      "tournaments",
      "users",
      "revenue",
      "feedback",
      "meetings",
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
    discover: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>'
  };
  sidebarIcons.meetings = '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/>';
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
      .list("fields")
      .filter((x) => x.ownerId === currentUserId)
      .map((x) => x.id);
  const getRecord = (kind, id) =>
    store.list(kind).find((x) => x.id === Number(id));
  function getVisibleRecords(kind) {
    let rows = store.list(kind);
    if (role === "admin") return rows;
    if (role === "player")
      return rows.filter((x) => x.userId === currentUserId);
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
    } else if (view === "meetings") KicksMeetingUI.render();
    else if (view === "feedback") renderFeedback();
    else if (view === "revenue") renderRevenue();
    else if (view === "discover") renderDiscover();
    else if (view === "profile" || view === "settings")
      renderProfileOrSettings();
    else renderTable(view);
  }
  // كل مصفوفة تحدد الأعمدة المعروضة في جدول واحد.
  const columns = {
    fields: ["name", "city", "type", "price", "rating", "today"],
    games: ["title", "fieldId", "date", "time", "joined", "capacity", "price"],
    tournaments: ["name", "fieldId", "date", "teams", "capacity", "fee"],
    users: ["name", "email", "role", "city", "status"],
    bookings: ["userId", "fieldId", "date", "time", "price", "commission", "ownerNet", "paymentMethod", "paymentStatus", "status"],
    memberships: ["userId", "gameId", "status"],
    registrations: ["teamName", "userId", "tournamentId", "status"],
  };
  if (role === "player") columns.bookings = columns.bookings.filter(key => !["commission", "ownerNet"].includes(key));
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
    if (role !== "player") {
      return `<button data-edit="${collectionName}" data-id="${record.id}">Edit</button>
              <button data-delete="${collectionName}" data-id="${record.id}">Delete</button>`;
    }
    const finishedStatuses = ["Cancelled", "Completed", "Left", "Withdrawn"];
    if (finishedStatuses.includes(record.status)) return "—";
    const actionLabels = {
      bookings: "Cancel",
      memberships: "Leave",
      registrations: "Withdraw",
    };
    return `<button data-cancel="${collectionName}" data-id="${record.id}">${actionLabels[collectionName]}</button>`;
  }

  function renderTableRows(collectionName, records) {
    return records
      .map((record) => {
        const cells = columns[collectionName].map((fieldName) =>
          getCellText(fieldName, record[fieldName]),
        );
        const searchText = (
          Object.values(record).join(" ") +
          " " +
          cells.join(" ")
        ).toLowerCase();
        return `
        <tr data-search="${escapeHtml(searchText)}">
          ${cells.map((text) => "<td>" + text + "</td>").join("")}
          <td><div class="row-actions">${renderRowActions(collectionName, record)}</div></td>
        </tr>`;
      })
      .join("");
  }

  function filterTableRows(searchText) {
    let visibleCount = 0;
    const rows = document.querySelectorAll("tr[data-search]");
    for (const row of rows) {
      row.hidden = !row.dataset.search.includes(searchText.toLowerCase());
      if (!row.hidden) visibleCount++;
    }
    getElement("emptySearch").hidden = visibleCount > 0;
  }

  function renderFeedback() {
    if (role !== "admin") return;
    const feedback = store.list("feedback").reverse();
    let rows = "";
    for (const item of feedback) {
      rows += `<tr><td>${escapeHtml(item.name)}</td><td><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></td><td>${item.rating} / 5</td><td style="min-width:240px;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(item.message)}</td><td>${escapeHtml(item.createdAt.slice(0,10))}</td></tr>`;
    }
    getElement("dashboardView").innerHTML = `<div class="view-heading"><div><h2>Community feedback</h2><p>${feedback.length} responses saved on this browser. Email delivery is separate.</p></div></div><section class="dash-panel"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Rating</th><th>Message</th><th>Date</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No feedback yet.</td></tr>'}</tbody></table></div></section>`;
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
      <section class="dash-panel"><h2>Payment history</h2><div class="table-wrap"><table><thead><tr><th>Source</th><th>Paid by</th><th>Date</th><th>Total</th><th>KICKS share</th><th>Organizer net</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No payments yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function renderTable(collectionName) {
    const records = getVisibleRecords(collectionName);
    const ownerCanAdd =
      role === "owner" &&
      ["fields", "games", "tournaments"].includes(collectionName);
    const canAdd =
      (role === "admin" && collectionName !== "users") || ownerCanAdd;
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
    const tableColumns = role === "player" ? columns[collectionName].filter(key => !["commission", "ownerNet"].includes(key)) : columns[collectionName];
    const headings = tableColumns
      .map((fieldName) => "<th>" + getFieldLabel(fieldName) + "</th>")
      .join("");
    getElement("dashboardView").innerHTML = `
      <div class="view-heading">
        <div><h2>${labels[collectionName]}</h2><p>${records.length} records in this workspace</p></div>
        ${addButton}
      </div>
      <section class="dash-panel">
        <div class="table-tools"><label>Search <input id="tableSearch" type="search" placeholder="Search these records"></label></div>
        <div class="table-wrap"><table>
          <thead><tr>${headings}<th>Actions</th></tr></thead>
          <tbody>${renderTableRows(collectionName, records)}</tbody>
        </table></div>
        <p id="emptySearch" class="empty-dashboard" ${records.length ? "hidden" : ""}>No records found.</p>
      </section>`;
    getElement("tableSearch").addEventListener("input", (event) =>
      filterTableRows(event.target.value),
    );
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
      status: select("Active", "Inactive"),
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
    }
    return `<input id="edit-${fieldName}" name="${fieldName}" type="${inputType}" value="${escapeHtml(value)}" required maxlength="160" ${numberRules}>`;
  }

  // نفس نافذة الإدخال تستخدم للإضافة والتعديل.
  function openEditor(kind, id, defaults = {}) {
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
          ${inputHtml}
        </div>`);
    }
    getElement("editorTitle").textContent =
      (id ? "Edit " : "Add ") + labels[kind];
    getElement("editorError").textContent = "";
    getElement("editorFields").innerHTML =
      '<div class="form-grid">' + fieldsHtml.join("") + "</div>";
    if (kind === "fields") {
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
    getElement("editorDialog").showModal();
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
      const count = kind === "games" ? "joined" : "teams";
      if (r.capacity < 2 || r[count] > r.capacity)
        throw Error(
          "Capacity must be at least 2 and cannot be less than the current entries.",
        );
      if (kind === "tournaments" && r.capacity !== 8)
        throw Error("This tournament format uses 8 teams.");
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
            x.id !== r.id && x.email.toLowerCase() === r.email.toLowerCase(),
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
  function saveRecord(kind, r, old = {}, payment = null) {
    const signedIn = KicksAuth.requireRole(role);
    if (!signedIn || signedIn.id !== currentUserId) throw Error("Please sign in again.");
    validate(kind, r);
    if (role === 'player' && ['memberships','registrations'].includes(kind) && ['Left','Withdrawn'].includes(r.status)) {
      return store.leave(currentUserId, kind, r.id);
    }
    if (role === "player" && kind === "bookings" && !r.id)
      return store.book(currentUserId, r.fieldId, r.date, r.time, payment);
    if (role === "player" && kind === "memberships" && r.status === "Joined")
      return store.join(currentUserId, "games", r.gameId, { payment });
    if (
      role === "player" &&
      kind === "registrations" &&
      r.status === "Registered" &&
      old.status !== "Registered"
    )
      return store.join(currentUserId, "tournaments", r.tournamentId, { ...r, payment });
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
    return store.save(kind, r, payment);
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
      if (kind === "fields") r.photo = editing.photo || "";
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
      saveRecord(kind, r, old, payment);
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
    getElement("confirmDialog").showModal();
  }
  getElement("confirmAction").addEventListener("click", () => {
    try {
      confirmTask();
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
    if (b.dataset.delete) {
      const kind = b.dataset.delete,
        id = Number(b.dataset.id);
      confirmAction(
        "Delete this record?",
        "This removes this data. Deleting an event also removes its player or team entries.",
        () => {
          store.remove(kind, id);
        },
      );
    }
    if (b.dataset.cancel) {
      const kind = b.dataset.cancel,
        id = Number(b.dataset.id),
        old = getRecord(kind, id);
      confirmAction(
        "Update your entry?",
        "This changes your saved entry.",
        () =>
          saveRecord(
            kind,
            {
              ...old,
              status: {
                bookings: "Cancelled",
                memberships: "Left",
                registrations: "Withdrawn",
              }[kind],
            },
            old,
          ),
      );
    }
    if (b.dataset.join) {
      const kind = b.dataset.join,
        id = Number(b.dataset.id);
      if (kind === "games") {
        try {
          const prior = store
            .list("memberships")
            .find((x) => x.userId === currentUserId && x.gameId === id);
          if (prior?.status === "Joined")
            throw Error("You already joined this match.");
          const payment = await KicksCheckout.open(Number(getRecord("games", id).price), getRecord("games", id).title + " · One player entry");
          if (!payment) return;
          saveRecord(
            "memberships",
            {
              ...prior,
              userId: currentUserId,
              gameId: id,
              status: "Joined",
            },
            prior || {},
            payment,
          );
          renderDashboard();
          showToast("You joined this match.");
        } catch (err) {
          showToast(err.message);
        }
      } else
        openEditor(
          "registrations",
          store
            .list("registrations")
            .find((x) => x.userId === currentUserId && x.tournamentId === id)
            ?.id,
          {
            userId: currentUserId,
            tournamentId: id,
            teamName: "My team",
            captain: getCurrentUser().name,
            email: getCurrentUser().email,
            status: "Registered",
          },
        );
    }
    if (b.id === "newBooking")
      openEditor("bookings", null, {
        userId: currentUserId,
        status: "Pending",
      });
  });
  function renderDiscover() {
    getElement("dashboardView").innerHTML =
      `<div class="view-heading"><div><h2>A spot on the pitch is waiting.</h2><p>Try booking, joining and registering with this data.</p></div>${createButton("Book a field +", 'id="newBooking"')}</div><h2>Open games</h2><div class="discover-grid">${store
        .list("games")
        .map(
          (g) =>
            `<article class="discover-card"><img src="${KicksAuth.fieldImage(getRecord("fields", g.fieldId))}" alt=""><div><h3>${escapeHtml(g.title)}</h3><p>${escapeHtml(g.date)} · ${escapeHtml(g.time)}<br>${g.joined}/${g.capacity} players · ${g.price} JD</p>${createButton("Join game ↗", `data-join="games" data-id="${g.id}" ${g.joined >= g.capacity ? "disabled" : ""}`)}</div></article>`,
        )
        .join(
          "",
        )}</div><h2>Bring your team</h2><div class="discover-grid">${store
        .list("tournaments")
        .map(
          (t) =>
            `<article class="discover-card"><div><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.date)} · ${t.teams}/${t.capacity} teams · ${t.fee} JD</p>${createButton("Register team ↗", `data-join="tournaments" data-id="${t.id}" ${t.teams >= t.capacity ? "disabled" : ""}`)}</div></article>`,
        )
        .join("")}</div>`;
  }
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
          store.updateSettings(values);
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
          saveRecord(
            "users",
            {
              ...getCurrentUser(),
              ...profile,
              ...credentials,
              avatar: selectedAvatar,
            },
            getCurrentUser(),
          );
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
  renderDashboard();
})();
