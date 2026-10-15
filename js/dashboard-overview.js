// Overview cards and tables. Each account only receives its own records.
{
  const escapeHtml = KicksStore.escape;

  // Count useful records for the signed-in account or admin.
  function getStatistics(role, getRecords) {
    const bookings = getRecords("bookings");
    let bookingValue = 0;
    let platformCommission = 0;

    for (const booking of bookings) {
      if (["Confirmed", "Completed"].includes(booking.status)) {
        bookingValue += Number(booking.price || 0);
      }
    }
    for (const paid of KicksStore.list("payments")) {
      if (paid.status === "Paid (demo)" && paid.adminId === KicksAuth.current()?.id) platformCommission += Number(paid.commission || 0);
    }

    if (role === "player")
      return [
        { title: "Your bookings", value: bookings.length, note: "All statuses", link: "bookings", icon: "◷" },
        { title: "Games joined", value: getRecords("memberships").filter((row) => row.status === "Joined").length, note: "Active match entries", link: "memberships", icon: "◎" },
        { title: "Team entries", value: getRecords("registrations").filter((row) => row.status === "Registered").length, note: "Active tournament entries", link: "registrations", icon: "◇" },
        { title: "Booking value", value: bookingValue + " JD", note: "Confirmed + completed", link: "bookings", icon: "↗" },
      ];

    if (role === "owner") {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
      return [
        { title: "Your fields", value: getRecords("fields").length, note: "Published pitches", link: "fields", icon: "▦" },
        { title: "Upcoming matches", value: getRecords("games").filter((row) => row.date >= today).length, note: "Matches you organized", link: "games", icon: "◎" },
        { title: "Players joined", value: getRecords("memberships").filter((row) => row.status === "Joined").length, note: "Across your matches", link: "games", icon: "○" },
        { title: "Upcoming tournaments", value: getRecords("tournaments").filter((row) => row.date >= today).length, note: "On your pitches", link: "tournaments", icon: "◇" },
      ];
    }

    return [
      { title: "Football fields", value: getRecords("fields").length, note: "Across the platform", link: "fields", icon: "▦" },
      { title: "Bookings", value: bookings.length, note: "All statuses", link: "bookings", icon: "◷" },
      { title: "Competitions", value: getRecords("games").length + getRecords("tournaments").length, note: "Games + tournaments", link: "tournaments", icon: "◇" },
      { title: "Platform revenue", value: platformCommission.toFixed(2) + " JD", note: "Commissions + listing fees (local)", link: "revenue", icon: "↗" },
    ];
  }

  // Show a small booking table. Admins can also see the player's name.
  function renderBookingsTable(bookings, getRecord, getUser, showPlayer, upcoming) {
    if (!bookings.length)
      return '<p class="empty-dashboard">No booking records yet. New bookings will appear here.</p>';

    const sorted = [...bookings];
    sorted.sort((first, second) => {
      const firstDate = first.date + first.time;
      const secondDate = second.date + second.time;
      if (upcoming) return firstDate.localeCompare(secondDate);
      return secondDate.localeCompare(firstDate);
    });

    let rows = "";
    for (const booking of sorted.slice(0, 5)) {
      const field = getRecord("fields", booking.fieldId);
      const player = showPlayer ? getUser(booking.userId) : null;
      let statusClass = "";
      if (["Cancelled", "Withdrawn"].includes(booking.status)) statusClass = "muted";
      rows += `<tr>
        <td><div class="overview-field-cell"><img src="${KicksAuth.fieldImage(field)}" alt=""><strong>${escapeHtml(field?.name || "Football pitch")}</strong></div></td>
        ${showPlayer ? `<td>${escapeHtml(player?.name || "Player")}</td>` : ""}
        <td>${escapeHtml(booking.date)}<small class="overview-time">${escapeHtml(booking.time)}</small></td>
        <td>${escapeHtml(String(booking.price))} JD</td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(booking.status)}</span></td>
      </tr>`;
    }

    let headings = "<th>Field</th>";
    if (showPlayer) headings += "<th>Player</th>";
    headings += "<th>Date & time</th><th>Price</th><th>Status</th>";
    return `<div class="table-wrap overview-table-wrap"><table class="overview-table">
      <thead><tr>${headings}</tr></thead><tbody>${rows}</tbody>
    </table></div>`;
  }

  // Give owners a quick count for each of their pitches.
  function renderOwnerFields(fields, getRecords) {
    if (!fields.length)
      return '<p class="empty-dashboard">Add your first field to see its activity here.</p>';

    let rows = "";
    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
    for (const field of fields) {
      const activeBookings = getRecords("bookings").filter(
        (row) => row.fieldId === field.id && ["Pending", "Confirmed"].includes(row.status) && new Date(row.date + "T" + row.time + ":00+03:00") > now,
      ).length;
      const matches = getRecords("games").filter((row) => row.fieldId === field.id && row.date >= today).length;
      const cups = getRecords("tournaments").filter((row) => row.fieldId === field.id && row.date >= today).length;
      rows += `<tr>
        <td><strong>${escapeHtml(field.name)}</strong><small class="overview-time">${escapeHtml(field.city)} · ${escapeHtml(field.type)}</small></td>
        <td>${activeBookings}</td><td>${matches}</td><td>${cups}</td>
      </tr>`;
    }

    return `<div class="table-wrap overview-table-wrap"><table class="overview-table owner-fields-table">
      <thead><tr><th>Your field</th><th>Active bookings</th><th>Open matches</th><th>Tournaments</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  // Show the latest accounts to help the admin see new activity.
  function renderRecentUsers(users) {
    if (!users.length)
      return '<p class="empty-dashboard">No accounts have been created yet.</p>';
    const latestUsers = [...users].sort((a, b) => b.id - a.id).slice(0, 5);
    let rows = "";
    for (const user of latestUsers) {
      rows += `<tr><td><strong>${escapeHtml(user.name)}</strong><small class="overview-time">${escapeHtml(user.email)}</small></td>
        <td>${escapeHtml(user.role)}</td><td><span class="status-pill ${user.status === "Inactive" ? "muted" : ""}">${escapeHtml(user.status)}</span></td></tr>`;
    }
    return `<div class="table-wrap overview-table-wrap"><table class="overview-table">
      <thead><tr><th>Account</th><th>Role</th><th>Status</th></tr></thead><tbody>${rows}</tbody>
    </table></div>`;
  }

  // Show active games and tournament entries for the player or owner.
  function renderEvents(kind, rows, getRecord, label) {
    let content = "";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
    let shown = 0;
    for (const row of rows) {
      if (kind === "memberships" && row.status !== "Joined") continue;
      if (kind === "registrations" && row.status !== "Registered") continue;
      if (["games", "tournaments"].includes(kind) && row.date < today) continue;
      let item = row;
      if (kind === "memberships") item = getRecord("games", row.gameId);
      if (kind === "registrations") item = getRecord("tournaments", row.tournamentId);
      if (!item) continue;
      const title = item.name || item.title || "Event";
      const detail = kind === "registrations"
        ? "Team: " + (row.teamName || "—")
        : (item.date || "") + " · " + (item.time || "");
      content += `<tr><td><strong>${escapeHtml(title)}</strong></td><td>${escapeHtml(detail)}</td></tr>`;
      shown++;
      if (shown === 5) break;
    }
    if (!content) content = '<tr><td colspan="2" class="empty-dashboard">No upcoming activity yet.</td></tr>';
    return `<section class="dash-panel"><div class="panel-heading"><h2>${escapeHtml(label)}</h2><a href="#${kind}">View all ↗</a></div>
      <div class="table-wrap overview-table-wrap"><table class="overview-table"><thead><tr><th>Event</th><th>Details</th></tr></thead><tbody>${content}</tbody></table></div></section>`;
  }

  // Draw a small bar chart using only the counts passed to this function.
  function renderBarChart(title, summary, items) {
    const colors = ["#16803f", "#36a269", "#78bd8e", "#8ab9d9", "#c3d8c9"];
    let total = 0;
    let max = 0;
    for (const item of items) {
      total += item.value;
      if (item.value > max) max = item.value;
    }

    let bars = "";
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const height = max ? (item.value / max) * 100 : 0;
      bars += `<div class="chart-column" title="${escapeHtml(item.label)}: ${item.value}">
        <div class="chart-track"><span class="chart-bar" style="--bar-height:${height}%;background:${colors[index % colors.length]}"><span>${item.value}</span></span></div>
        <small class="chart-month">${escapeHtml(item.label)}</small>
      </div>`;
    }

    let emptyMessage = "";
    if (!total) emptyMessage = '<p class="chart-empty">Your activity will appear here when records are added.</p>';
    return `<section class="dash-panel overview-chart-panel">
      <div class="panel-heading"><h2>${escapeHtml(title)}</h2><span class="chart-live">LIVE DATA</span></div>
      <div class="chart-summary"><strong>${total}</strong><span>${escapeHtml(summary)}</span></div>
      <div class="booking-chart" role="img" aria-label="${escapeHtml(title)}">${bars}</div>${emptyMessage}
    </section>`;
  }

  // Draw a simple donut and legend for a real status or category breakdown.
  function renderDonut(title, items, centerLabel) {
    const colors = ["#16803f", "#45a36b", "#86bf93", "#9ab6a4"];
    let total = 0;
    for (const item of items) total += item.value;

    let start = 0;
    const colorStops = [];
    let legend = "";
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      let end = start;
      if (total) end += (item.value / total) * 100;
      colorStops.push(`${colors[index % colors.length]} ${start}% ${end}%`);
      start = end;
      legend += `<li><span class="legend-dot" style="background:${colors[index % colors.length]}"></span><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong></li>`;
    }
    let background = "conic-gradient(#e5eee7 0% 100%)";
    if (total) background = `conic-gradient(${colorStops.join(",")})`;

    return `<section class="dash-panel overview-donut-panel"><div class="panel-heading"><h2>${escapeHtml(title)}</h2></div>
      <div class="status-chart"><div class="booking-donut" style="background:${background}" role="img" aria-label="${escapeHtml(title)}: ${total}"><div><strong>${total}</strong><span>${escapeHtml(centerLabel)}</span></div></div>
      <ul class="chart-legend">${legend}</ul></div>
    </section>`;
  }

  function render(options) {
    const role = options.role;
    const labels = options.labels;
    const getRecords = options.getRecords;
    const getRecord = options.getRecord;
    const getUser = (id) => getRecord("users", id);
    const bookings = getRecords("bookings");
    const statistics = getStatistics(role, getRecords);
    let chartTitle = "Your activity";
    let chartSummary = "Your recorded football activity";
    let chartItems = [];
    let donutTitle = "Booking status";
    let donutItems = [];

    if (role === "player") {
      chartItems = [
        { label: "Bookings", value: bookings.length },
        { label: "Games", value: getRecords("memberships").filter((row) => row.status === "Joined").length },
        { label: "Tournaments", value: getRecords("registrations").filter((row) => row.status === "Registered").length },
      ];
      donutItems = ["Pending", "Confirmed", "Completed", "Cancelled"].map((status) => ({
        label: status,
        value: bookings.filter((row) => row.status === status).length,
      }));
    } else if (role === "owner") {
      chartTitle = "Upcoming activity by field";
      chartSummary = "Bookings, matches and tournaments on your pitches";
      const fields = getRecords("fields");
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
      const fieldActivity = [];
      for (const field of fields) {
        const bookingsAtField = bookings.filter((row) => row.fieldId === field.id && ["Pending", "Confirmed"].includes(row.status)).length;
        const gamesAtField = getRecords("games").filter((row) => row.fieldId === field.id && row.date >= today).length;
        const cupsAtField = getRecords("tournaments").filter((row) => row.fieldId === field.id && row.date >= today).length;
        fieldActivity.push({ label: field.name, value: bookingsAtField + gamesAtField + cupsAtField });
      }
      fieldActivity.sort((first, second) => second.value - first.value);
      chartItems = fieldActivity.slice(0, 5);
      donutTitle = "Upcoming activity";
      donutItems = [
        { label: "Bookings", value: bookings.filter((row) => ["Pending", "Confirmed"].includes(row.status) && new Date(row.date + "T" + row.time + ":00+03:00") > new Date()).length },
        { label: "Matches", value: getRecords("games").filter((row) => row.date >= today).length },
        { label: "Tournaments", value: getRecords("tournaments").filter((row) => row.date >= today).length },
      ];
    } else {
      chartTitle = "Platform activity";
      chartSummary = "Current records across KICKS";
      chartItems = [
        { label: "Fields", value: getRecords("fields").length },
        { label: "Games", value: getRecords("games").length },
        { label: "Tournaments", value: getRecords("tournaments").length },
        { label: "Bookings", value: bookings.length },
        { label: "Accounts", value: getRecords("users").length },
      ];
      donutTitle = "Booking status";
      donutItems = ["Pending", "Confirmed", "Completed", "Cancelled"].map((status) => ({
        label: status,
        value: bookings.filter((row) => row.status === status).length,
      }));
    }

    let statisticsCards = "";
    for (const stat of statistics) {
      statisticsCards += `<a class="stat-card statistic-link" href="#${stat.link}">
        <div class="stat-top"><span>${stat.title}</span><span class="stat-icon" aria-hidden="true">${stat.icon}</span></div>
        <strong>${stat.value}</strong><small>${stat.note}</small>
      </a>`;
    }

    let content = "";
    if (role === "player") {
      const upcomingBookings = bookings.filter((booking) => {
        const active = ["Confirmed", "Pending"].includes(booking.status);
        const date = new Date(booking.date + "T" + booking.time + ":00+03:00");
        return active && date > new Date();
      });
      content = `<section class="dash-panel overview-bookings">
        <div class="panel-heading"><h2>Your upcoming bookings</h2><a href="#bookings">View all ↗</a></div>
        ${renderBookingsTable(upcomingBookings, getRecord, getUser, false, true)}
      </section>
      <div class="dash-columns">
        ${renderEvents("memberships", getRecords("memberships"), getRecord, labels.memberships)}
        ${renderEvents("registrations", getRecords("registrations"), getRecord, labels.registrations)}
      </div>`;
    } else if (role === "owner") {
      content = `<section class="dash-panel overview-bookings">
        <div class="panel-heading"><h2>Your field activity</h2><a href="#fields">Manage fields ↗</a></div>
        ${renderOwnerFields(getRecords("fields"), getRecords)}
      </section>
      <div class="dash-columns">
        ${renderEvents("games", getRecords("games"), getRecord, labels.games)}
        ${renderEvents("tournaments", getRecords("tournaments"), getRecord, labels.tournaments)}
      </div>`;
    } else {
      const pendingBookings = bookings.filter((booking) => booking.status === "Pending");
      let pendingRows = "";
      for (const booking of pendingBookings.slice(0, 4)) {
        const field = getRecord("fields", booking.fieldId);
        pendingRows += `<tr><td>${escapeHtml(field?.name || "Football pitch")}</td><td>${escapeHtml(booking.date)} · ${escapeHtml(booking.time)}</td><td><span class="status-pill">Pending</span></td></tr>`;
      }
      if (!pendingRows) pendingRows = '<tr><td colspan="3" class="empty-dashboard">No pending bookings.</td></tr>';
      content = `<section class="dash-panel overview-bookings">
        <div class="panel-heading"><h2>Latest bookings</h2><a href="#bookings">Manage bookings ↗</a></div>
        ${renderBookingsTable(bookings, getRecord, getUser, true, false)}
      </section>
      <div class="dash-columns">
        <section class="dash-panel"><div class="panel-heading"><h2>Needs attention</h2></div>
          <div class="table-wrap overview-table-wrap"><table class="overview-table"><thead><tr><th>Field</th><th>Date</th><th>Status</th></tr></thead><tbody>${pendingRows}</tbody></table></div>
        </section>
        <section class="dash-panel"><div class="panel-heading"><h2>Recent accounts</h2><a href="#users">View all ↗</a></div>
          ${renderRecentUsers(getRecords("users"))}
        </section>
      </div>`;
    }

    document.getElementById("dashboardView").innerHTML = `
      <section class="stats-grid" aria-label="Workspace statistics">${statisticsCards}</section>
      <div class="analytics-grid">
        ${renderBarChart(chartTitle, chartSummary, chartItems)}
        ${renderDonut(donutTitle, donutItems, role === "owner" ? "upcoming" : "total")}
      </div>
      ${content}`;
  }

  window.KicksDashboardOverview = { render: render };
}
