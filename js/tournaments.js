// دليل الملف: عرض البطولات وفلترتها، ثم تسجيل فريق في بطولة.
// قائمة البطولات وتفاصيلها وتسجيل الفريق بعد الدفع المحلي التجريبي.
// Public listings and account-linked team registration.
(() => {
  const fields = KicksStore.list("fields");
  const tournaments = KicksStore.list("tournaments");
  const getElement = (id) => document.getElementById(id);
  const fieldFor = (cup) => fields.find((field) => field.id === cup.fieldId);
  const remaining = (cup) => cup.capacity - cup.teams;
  const upcoming = (cup) =>
    new Date(`${cup.date}T${cup.time}:00+03:00`) > new Date();
  const open = (cup) => upcoming(cup) && remaining(cup) > 0;
  function status(cup) {
    if (!upcoming(cup)) return "Registration closed";
    if (remaining(cup) === 0) return "Fully registered";
    if (remaining(cup) <= 2) return "Few spots left";
    return "Registration open";
  }
  const dateText = (date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Amman",
    }).format(new Date(`${date}T12:00:00+03:00`));
  if (getElement("cupContent")) {
    const cup = tournaments.find(
      (cup) =>
        String(cup.id) === new URLSearchParams(location.search).get("id"),
    );
    if (!cup) {
      getElement("cupMissing").hidden = false;
      return;
    }
    const field = fieldFor(cup);
    getElement("cupContent").hidden = false;
    document.title = `${cup.name} | KICKS`;
    getElement("cupTitle").textContent = cup.name;
    getElement("cupLocation").textContent =
      `${field.name} · ${field.area}, ${field.city}`;
    getElement("cupPhoto").src = `${KicksAuth.fieldImage(field)}`;
    getElement("cupPhoto").alt = `Football pitch at ${field.name}`;
    getElement("cupFacts").innerHTML = [
      ["calendar3", "Date", dateText(cup.date)],
      ["clock", "Kickoff", cup.time + " · Amman"],
      ["people", "Team format", field.type],
      ["bar-chart", "Level", cup.level],
    ]
      .map(
        ([icon, label, value]) =>
          `<div><i class="bi bi-${icon}" aria-hidden="true"></i><span>${label}</span><strong>${KicksStore.escape(value)}</strong></div>`,
      )
      .join("");
    getElement("cupSystem").textContent =
      cup.system === "Single elimination"
        ? "Single elimination: winners advance through quarter-finals, semi-finals and the final."
        : "Two groups of four teams. The top two in each group advance to semi-finals, followed by the final.";
    getElement("cupFieldLink").href =
      `../Fields/field-details.html?id=${field.id}`;
    getElement("cupPrize").textContent = cup.prize;
    getElement("cupFee").textContent = cup.fee;
    getElement("cupAvailability").textContent = status(cup);
    getElement("cupTeamCount").textContent =
      `${cup.teams} / ${cup.capacity} teams · ${remaining(cup)} ${remaining(cup) === 1 ? "spot" : "spots"} left`;
    getElement("cupProgress").max = cup.capacity;
    getElement("cupProgress").value = cup.teams;
    const inputs = ["teamName", "captainName", "captainEmail"];
    const errors = ["teamError", "captainError", "emailError"];
    function closeRegistration() {
      inputs.forEach((id) => (getElement(id).disabled = true));
      getElement("teamSubmit").disabled = true;
      getElement("teamSubmit").textContent = status(cup);
    }
    if (!open(cup)) closeRegistration();
    const account = KicksAuth.current();
    if (account) {
      getElement("captainName").value = account.name;
      getElement("captainEmail").value = account.email;
    }
    const alreadyRegistered =
      account &&
      KicksStore.list("registrations").some(
        (entry) =>
          entry.userId === account.id &&
          entry.tournamentId === cup.id &&
          entry.status === "Registered",
      );
    if (alreadyRegistered) {
      inputs.forEach((id) => (getElement(id).disabled = true));
      getElement("teamSubmit").disabled = true;
      getElement("teamSubmit").textContent = "Registered ✓";
    }
    inputs.forEach((id, index) =>
      getElement(id).addEventListener("input", () => {
        getElement(errors[index]).textContent = "";
        getElement(id).removeAttribute("aria-invalid");
        getElement("teamStatus").textContent = "";
      }),
    );
    getElement("teamForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const account = KicksAuth.requirePlayer();
      if (!account) return;
      if (!open(cup)) {
        closeRegistration();
        return;
      }
      let first;
      inputs.forEach((id, index) => {
        const input = getElement(id);
        input.value = input.value.trim();
        const valid =
          index === 2
            ? input.value && input.validity.valid
            : input.value.length >= 2;
        getElement(errors[index]).textContent = valid
          ? ""
          : index === 2
            ? "Enter a valid email address."
            : "Enter at least 2 characters.";
        if (!valid) {
          input.setAttribute("aria-invalid", "true");
          first ||= input;
        } else input.removeAttribute("aria-invalid");
      });
      if (first) {
        getElement("teamStatus").textContent = "Check the highlighted fields.";
        first.focus();
        return;
      }
      try {
        const payment = await KicksCheckout.open(cup.fee, cup.name + " · One team entry");
        if (!payment) return;
        if (KicksAuth.current()?.id !== account.id) throw Error("Please sign in again.");
        KicksStore.join(account.id, "tournaments", cup.id, {
          payment,
          teamName: getElement("teamName").value,
          captain: getElement("captainName").value,
          email: getElement("captainEmail").value,
        });
        Object.assign(cup, KicksStore.find("tournaments", cup.id));
        getElement("cupTeamCount").textContent =
          cup.teams +
          " / " +
          cup.capacity +
          " teams · " +
          remaining(cup) +
          " spots left";
        getElement("cupProgress").value = cup.teams;
        inputs.forEach((id) => (getElement(id).disabled = true));
        getElement("teamSubmit").disabled = true;
        getElement("teamSubmit").textContent = "Registered ✓";
      } catch (error) {
        getElement("teamStatus").textContent = error.message;
        return;
      }
      getElement("teamStatus").textContent = "";
      getElement("teamPreview").textContent =
        `${getElement("teamName").value} · Captain: ${getElement("captainName").value} · ${cup.name} · ${dateText(cup.date)} at ${cup.time} (Amman) · ${cup.fee} JD per team.`;
      getElement("teamDialog").showModal();
    });
    getElement("teamDialog").addEventListener("click", (event) => {
      if (event.target === getElement("teamDialog"))
        getElement("teamDialog").close();
    });
    getElement("teamDialog").addEventListener("close", () => {
      getElement("teamPreview").textContent = "";
      getElement("teamForm").reset();
    });
    return;
  }
  const form = getElement("cupFilters");
  function render() {
    const values = {};
    for (const [name, value] of new FormData(form)) {
      values[name] = value;
    }
    const query = (values.search || "").trim().toLowerCase();
    const results = [];
    for (const cup of tournaments) {
      const field = fieldFor(cup);
      const searchableText = `${cup.name} ${field.name} ${field.city}`.toLowerCase();
      if (!searchableText.includes(query)) continue;
      if (values.city && field.city !== values.city) continue;
      if (values.format && field.type !== values.format) continue;
      if (values.open && !open(cup)) continue;
      results.push(cup);
    }
    const sortBy = getElement("cupSort").value;
    results.sort(function (firstCup, secondCup) {
      if (sortBy === "fee") return firstCup.fee - secondCup.fee;
      if (sortBy === "spots") return remaining(secondCup) - remaining(firstCup);
      const firstTime = firstCup.date + "T" + firstCup.time;
      const secondTime = secondCup.date + "T" + secondCup.time;
      return firstTime.localeCompare(secondTime);
    });
    getElement("cupCount").textContent =
      `${results.length} ${results.length === 1 ? "tournament" : "tournaments"} found`;
    getElement("cupEmpty").hidden = results.length > 0;
    let tournamentCards = "";
    for (const cup of results) {
      const field = fieldFor(cup);
      let closedClass = "";
      if (!open(cup)) closedClass = "closed";
      tournamentCards += `
        <article class="cup-card">
          <div class="cup-card-image">
            <img src="${KicksAuth.fieldImage(field)}" alt="Football pitch at ${KicksStore.escape(field.name)}" loading="lazy">
            <span class="cup-badge ${closedClass}">${status(cup)}</span>
            <span class="cup-format">${KicksStore.escape(field.type)}</span>
          </div>
          <div class="cup-card-body">
            <p class="cup-level">${KicksStore.escape(cup.level)}</p>
            <h3>${KicksStore.escape(cup.name)}</h3>
            <p class="cup-card-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${KicksStore.escape(field.name)}, ${KicksStore.escape(field.city)}</p>
            <div class="cup-card-date">
              <span><i class="bi bi-calendar3" aria-hidden="true"></i> ${dateText(cup.date)}</span>
              <span>${KicksStore.escape(cup.time)} · Amman</span>
            </div>
            <div class="cup-card-prize">
              <i class="bi bi-trophy" aria-hidden="true"></i>
              <span>${KicksStore.escape(cup.prize)} <small>prize</small></span>
              <strong>${cup.teams}/${cup.capacity} teams</strong>
            </div>
            <progress value="${cup.teams}" max="${cup.capacity}" aria-label="Registered teams"></progress>
            <div class="cup-card-bottom">
              <p><strong>${cup.fee} JD</strong><span> / team</span></p>
              <a href="tournament-details.html?id=${cup.id}">View tournament ↗<span class="visually-hidden">: ${KicksStore.escape(cup.name)}</span></a>
            </div>
          </div>
        </article>`;
    }
    getElement("cupGrid").innerHTML = tournamentCards;
  }
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  getElement("cupSort").addEventListener("change", render);
  document.querySelectorAll("[data-clear-cups]").forEach((button) =>
    button.addEventListener("click", () => {
      form.reset();
      getElement("cupSort").value = "date";
      render();
    }),
  );
  render();
})();
