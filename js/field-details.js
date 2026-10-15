// دليل الملف: تفاصيل ملعب واحد: قراءة id من الرابط، عرض المعلومات، ثم اختيار الموعد والحجز.
(() => {
  const fields = KicksStore.list("fields");
  const fieldId = new URLSearchParams(location.search).get("id");
  const field = fields.find((item) => String(item.id) === fieldId);
  const select = (id) => document.getElementById(id);
  if (!field) {
    select("missingField").hidden = false;
    return;
  }
  select("fieldContent").hidden = false;
  document.title = `${field.name} | KICKS`;
  const place = `${field.area}, ${field.city}`;
  for (const id of ["fieldName", "breadcrumbName"])
    select(id).textContent = field.name;
  for (const id of ["fieldLocation", "mapLocation"])
    select(id).textContent = place;
  select("fieldRating").textContent = Number(field.rating || 0).toFixed(1);
  select("fieldFormat").textContent = field.type;
  select("hourlyPrice").textContent = field.price;
  select("fieldDescription").textContent =
    field.description ||
    `${field.name} is a ${field.type} football pitch in ${place}. A space for friendly games, weekly team sessions and your next kickabout.`;
  const amenities = document.querySelector(".amenity-grid");
  amenities.replaceChildren();
  const features = (field.amenities || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  for (const feature of features) {
    const label = document.createElement("span");
    label.textContent = feature;
    amenities.append(label);
  }
  if (!features.length)
    amenities.textContent = "No facilities listed by the venue yet.";
  for (const id of ["fieldPhoto", "largePhoto"]) {
    select(id).src = `${KicksAuth.fieldImage(field)}`;
    select(id).alt = `Football pitch at ${field.name}`;
  }
  select("mapLink").href =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place + ", Jordan")}`;
  const dateInput = select("bookingDate");
  let selectedHour = null;
  function ammanNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Amman",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const values = {};
    for (const part of parts) {
      values[part.type] = part.value;
    }
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      hour: Number(values.hour),
    };
  }
  function available(hour) {
    const now = ammanNow();
    if (
      !dateInput.value ||
      dateInput.value < now.date ||
      !dateInput.validity.valid
    )
      return false;
    if (dateInput.value === now.date && (!field.today || hour <= now.hour))
      return false;
    return !KicksStore.list("bookings").some(
      (booking) =>
        booking.fieldId === field.id &&
        booking.date === dateInput.value &&
        Number(booking.time.slice(0, 2)) === hour &&
        ["Pending", "Confirmed"].includes(booking.status),
    );
  }
  function updateSummary() {
    const chosen = selectedHour !== null;
    select("selectedTime").textContent = chosen
      ? `${String(selectedHour).padStart(2, "0")}:00–${String(selectedHour + 1).padStart(2, "0")}:00`
      : "—";
    select("bookingTotal").textContent = chosen ? `${field.price} JD` : "—";
    select("bookButton").disabled = KicksAuth.current() ? !chosen : false;
  }
  function renderSlots() {
    dateInput.min = ammanNow().date;
    selectedHour = null;
    const valid = dateInput.value && dateInput.validity.valid;
    let count = 0;
    const fragment = document.createDocumentFragment();
    for (let hour = 10; hour <= 22; hour++) {
      const enabled = valid && available(hour);
      if (enabled) count++;
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "slot";
      input.value = hour;
      input.disabled = !enabled;
      const text = document.createElement("span");
      text.textContent = `${String(hour).padStart(2, "0")}:00`;
      input.setAttribute(
        "aria-label",
        `${text.textContent}${enabled ? "" : ", unavailable"}`,
      );
      label.append(input, text);
      fragment.append(label);
    }
    select("timeSlots").replaceChildren(fragment);
    select("slotStatus").textContent = !valid
      ? "Choose today or a future date."
      : count
        ? `${count} slots available`
        : "No slots left. Try another date.";
    updateSummary();
  }
  dateInput.value = ammanNow().date;
  dateInput.addEventListener("input", renderSlots);
  dateInput.addEventListener("change", renderSlots);
  select("timeSlots").addEventListener("change", (event) => {
    const hour = Number(event.target.value);
    if (!available(hour)) {
      renderSlots();
      return;
    }
    selectedHour = hour;
    updateSummary();
  });
  select("bookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const account = KicksAuth.requirePlayer();
    if (!account) return;
    if (selectedHour === null || !available(selectedHour)) {
      renderSlots();
      return;
    }
    select("paymentAmount").textContent = `${field.price} JD`;
    select("paymentDialog").showModal();
  });
  select("completeDemoPayment").addEventListener("click", () => {
    const account = KicksAuth.current();
    if (!account || selectedHour === null || !available(selectedHour)) {
      select("paymentDialog").close();
      renderSlots();
      KicksAuth.notify(
        "This time is no longer available. Choose another slot.",
      );
      return;
    }
    try {
      KicksStore.book(
        account.id,
        field.id,
        dateInput.value,
        String(selectedHour).padStart(2, "0") + ":00",
        { method: "Visa demo", amount: Number(field.price) },
      );
    } catch (error) {
      select("paymentDialog").close();
      renderSlots();
      KicksAuth.notify(error.message);
      return;
    }
    select("paymentDialog").close();
    const date = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeZone: "Asia/Amman",
    }).format(new Date(`${dateInput.value}T12:00:00+03:00`));
    select("bookingPreview").textContent =
      `${field.name} · ${date} · ${String(selectedHour).padStart(2, "0")}:00–${String(selectedHour + 1).padStart(2, "0")}:00 (Amman) · Total: ${field.price} JD.`;
    select("bookingDialog").showModal();
    renderSlots();
  });
  select("enlargePhoto").addEventListener("click", () =>
    select("photoDialog").showModal(),
  );
  for (const id of ["bookingDialog", "photoDialog", "paymentDialog"])
    select(id).addEventListener("click", (event) => {
      if (event.target === select(id)) select(id).close();
    });
  renderSlots();
})();
