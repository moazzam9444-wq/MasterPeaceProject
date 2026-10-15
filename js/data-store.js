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

  function loadFromBrowser() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (
        saved &&
        collections.every((name) => Array.isArray(saved[name])) &&
        saved.settings
      ) {
        data = { ...saved };
        // الملفات القديمة قد لا تحتوي الأقسام التي أضفناها لاحقاً.
        for (const name of ["payments", "feedback", "meetings"]) {
          if (!Array.isArray(data[name])) data[name] = [];
        }
        data.settings = { commissionRate: 10, listingFee: 5, ...saved.settings };
      }
    } catch {
      storageAvailable = false;
    }
  }
  loadFromBrowser();

  function persist(nextData) {
    // لا نظهر نجاح الحفظ إذا رفض المتصفح تخزينه.
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextData));
    } catch {
      storageAvailable = false;
      throw new Error(
        "Browser storage is unavailable or full. Allow storage and try again.",
      );
    }
    data = nextData;
    storageAvailable = true;
    window.dispatchEvent(new Event("kicks-data-change"));
  }

  // Add the requested starter catalogue once, without replacing existing records.
  function addStarterCatalogue() {
    if (data.catalogueVersion === 1) return;
    const next = structuredClone(data);
    const ownerId = next.users.find((user) => user.role === "admin")?.id;
    if (!ownerId) return;
    const venues = [
      [
        "KICKS Arena",
        "Amman",
        "Khalda",
        "5v5",
        25,
        1,
        "An intimate pitch for quick passing, evening games and weekly meetups.",
        "Artificial turf,Floodlights,Parking,Seating area",
      ],
      [
        "Capital Football Park",
        "Amman",
        "Sport City",
        "7v7",
        40,
        2,
        "A spacious pitch for bigger squads and competitive team sessions.",
        "Artificial turf,Floodlights,Changing rooms,Parking",
      ],
      [
        "Northside Pitch",
        "Irbid",
        "University District",
        "6v6",
        30,
        3,
        "A welcoming spot for university squads and friendly local matches.",
        "Artificial turf,Floodlights,Drinking water",
      ],
      [
        "Zarqa United Ground",
        "Zarqa",
        "New Zarqa",
        "5v5",
        20,
        4,
        "Compact football with room for fast attacks and friendly rivalries.",
        "Artificial turf,Floodlights,Parking",
      ],
      [
        "West Amman Club",
        "Amman",
        "Sweifieh",
        "6v6",
        35,
        2,
        "Bring your regular team for a relaxed evening of six-a-side football.",
        "Artificial turf,Changing rooms,Seating area",
      ],
      [
        "Irbid Green Court",
        "Irbid",
        "Al Husn",
        "7v7",
        32,
        1,
        "A larger playing space for weekend team games and local competitions.",
        "Artificial turf,Floodlights,Parking,Drinking water",
      ],
      [
        "Eastside Football Hub",
        "Zarqa",
        "Al Hashimiyah",
        "6v6",
        24,
        3,
        "A local meeting place for new teammates and after-work football.",
        "Artificial turf,Floodlights,Seating area",
      ],
      [
        "Seventh Circle Pitch",
        "Amman",
        "Seventh Circle",
        "5v5",
        28,
        4,
        "A convenient city pitch for small teams and a quick kickabout.",
        "Artificial turf,Floodlights,Changing rooms",
      ],
      [
        "Northern Lights Arena",
        "Irbid",
        "Al Sareeh",
        "5v5",
        22,
        2,
        "An evening football spot with an easygoing community feel.",
        "Artificial turf,Floodlights,Parking",
      ],
    ];
    const fieldIds = [];
    let fieldId = Math.max(0, ...next.fields.map((field) => field.id));
    for (const [
      name,
      city,
      area,
      type,
      price,
      image,
      description,
      amenities,
    ] of venues) {
      const existing = next.fields.find((field) => field.name === name);
      if (existing) {
        fieldIds.push(existing.id);
        continue;
      }
      const field = {
        id: ++fieldId,
        name,
        city,
        area,
        type,
        price,
        image,
        description,
        amenities,
        ownerId,
        rating: 0,
        now: true,
        today: true,
      };
      next.fields.push(field);
      fieldIds.push(field.id);
    }
    function futureDate(days) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + days);
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Amman",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    }
    let gameId = Math.max(0, ...next.games.map((game) => game.id));
    [
      "Friday Kickabout",
      "After Work Football",
      "Northside Friendly",
      "Weekend Five-a-Side",
      "Evening Team-Up",
      "Seven-a-Side Social",
    ].forEach((title, index) => {
      if (next.games.some((game) => game.title === title)) return;
      const field = next.fields.find((field) => field.id === fieldIds[index]);
      const capacity = Number(field.type[0]) * 2;
      next.games.push({
        id: ++gameId,
        title,
        fieldId: field.id,
        date: futureDate(index + 2),
        time: index % 2 ? "20:00" : "18:00",
        joined: 0,
        capacity,
        price: 4,
        level: index === 4 ? "Intermediate" : "All levels",
      });
    });
    let cupId = Math.max(0, ...next.tournaments.map((cup) => cup.id));
    [
      "KICKS Community Cup",
      "Northern Football Challenge",
      "Capital Weekend Cup",
    ].forEach((name, index) => {
      if (next.tournaments.some((cup) => cup.name === name)) return;
      next.tournaments.push({
        id: ++cupId,
        name,
        fieldId: fieldIds[index * 2],
        date: futureDate(14 + index * 7),
        time: "17:00",
        fee: 60 + index * 10,
        teams: 0,
        capacity: 8,
        prize: "Community trophy",
        system: "Group stage + knockout",
        level: "All levels",
      });
    });
    next.catalogueVersion = 1;
    persist(next);
  }
  try {
    addStarterCatalogue();
  } catch {
    // Browsing remains available when storage is blocked; writes still fail explicitly.
  }
  // Preserve previous Visa booking history when adding the revenue ledger.
  const legacyPayments = data.bookings.filter(booking => booking.paymentStatus === "Paid (demo)" && !data.payments.some(paid => paid.collection === "bookings" && paid.recordId === booking.id));
  if (legacyPayments.length) {
    const next = structuredClone(data);
    for (const booking of legacyPayments) {
      next.payments.push({ id: Math.max(0, ...next.payments.map(row => row.id)) + 1, kind: "Field booking", collection: "bookings", recordId: booking.id, userId: booking.userId, ownerId: next.fields.find(field => field.id === booking.fieldId)?.ownerId, adminId: next.users.find(user => user.role === "admin")?.id, amount: Number(booking.price), commission: Number(booking.commission || 0), ownerNet: Number(booking.ownerNet ?? booking.price), rate: 10, status: "Paid (demo)", createdAt: booking.date + "T" + booking.time + ":00+03:00" });
    }
    try { persist(next); } catch { /* Retry migration on the next page load. */ }
  }

  function list(name) {
    loadFromBrowser();
    return structuredClone(data[name] || []);
  }
  function find(name, id) {
    return list(name).find((record) => record.id === Number(id));
  }
  function save(name, record, payment = null) {
    loadFromBrowser();
    const nextData = structuredClone(data);
    const records = nextData[name];
    if (!Array.isArray(records)) throw new Error("Unknown collection.");
    const item = structuredClone(record);
    const previous = records.find(existing => existing.id === item.id);
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
        if (paid.collection === name && paid.recordId === item.id && paid.status === "Paid (demo)") paid.status = "Refunded (demo)";
      }
      if (item.paymentStatus === "Paid (demo)") item.paymentStatus = "Refunded (demo)";
    }
    persist(nextData);
    return item;
  }

  function remove(name, id) {
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
      const account = next.users.find((user) => user.id === id);
      if (
        account?.role === "admin" &&
        next.users.filter(
          (user) => user.role === "admin" && user.status === "Active",
        ).length <= 1
      )
        throw new Error("Keep at least one active administrator.");
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

  function isFuture(date, time) {
    return new Date(date + "T" + time + ":00+03:00") > new Date();
  }
  // Record the split in the same browser save as the booking. No real money moves.
  function recordPayment(next, kind, collection, record, amount, userId, ownerId, listing = false) {
    const admin = next.users.find(user => user.role === "admin" && user.status === "Active");
    if (!admin) throw Error("No active administrator is available to receive platform revenue.");
    if (!Number.isFinite(amount) || amount < 0) throw Error("Invalid payment amount.");
    const rate = listing ? 100 : Number(next.settings.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw Error("Invalid commission rate.");
    const commission = Math.round(amount * rate) / 100;
    const ownerNet = Math.round((amount - commission) * 100) / 100;
    if (listing) record.listingFeePaid = amount;
    else Object.assign(record, { price: amount, paymentMethod: amount ? "Visa (demo)" : "Free", paymentStatus: amount ? "Paid (demo)" : "Free", commission, ownerNet });
    if (!amount) return;
    next.payments.push({ id: Math.max(0, ...next.payments.map(row => row.id)) + 1, kind, collection, recordId: record.id, userId, ownerId, adminId: admin.id, amount, commission, ownerNet, rate, status: "Paid (demo)", createdAt: new Date().toISOString() });
  }
  function book(userId, fieldId, date, time, payment = null) {
    const user = find("users", userId);
    const field = find("fields", fieldId);
    if (!user || user.status !== "Active" || user.role !== "player")
      throw new Error("Sign in with a player account to book.");
    if (!field) throw new Error("This field is no longer available.");
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
    next.bookings.push(booking);
    persist(next);
    return structuredClone(booking);
  }

  function join(userId, kind, eventId, details = {}) {
    if (!["games", "tournaments"].includes(kind)) throw Error("Unknown event type.");
    loadFromBrowser();
    const user = find("users", userId);
    if (!user || user.status !== "Active" || user.role !== "player")
      throw new Error("Sign in with a player account to join.");
    const isGame = kind === "games";
    const event = find(kind, eventId);
    if (!event || !isFuture(event.date, event.time))
      throw new Error("This event is no longer open.");
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
    if (!isGame) {
      entry.teamName = String(details.teamName || "").trim();
      entry.captain = String(details.captain || user.name).trim();
      entry.email = String(details.email || user.email).trim();
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
    recordPayment(next, isGame ? "Open game" : "Tournament", collection, entry, amount, user.id, field?.ownerId);
    persist(next);
    return structuredClone(entry);
  }

  // انسحاب اللاعب وتحديث عدد المشاركين في عملية حفظ واحدة.
  function leave(userId, collection, entryId) {
    if (!["memberships", "registrations"].includes(collection))
      throw Error("Unknown entry type.");
    loadFromBrowser();
    const user = data.users.find((item) => item.id === userId);
    if (!user || user.role !== "player" || user.status !== "Active")
      throw Error("Sign in with a player account.");
    const next = structuredClone(data);
    const entry = next[collection].find(
      (item) => item.id === entryId && item.userId === userId,
    );
    if (!entry) throw Error("This entry does not belong to your account.");
    let eventCollection = "games",
      reference = "gameId",
      counter = "joined",
      active = "Joined",
      inactive = "Left";
    if (collection === "registrations") {
      eventCollection = "tournaments";
      reference = "tournamentId";
      counter = "teams";
      active = "Registered";
      inactive = "Withdrawn";
    }
    if (entry.status !== active) throw Error("This entry is already inactive.");
    const event = next[eventCollection].find(
      (item) => item.id === entry[reference],
    );
    if (event) event[counter] = Math.max(0, event[counter] - 1);
    entry.status = inactive;
    for (const paid of next.payments) {
      if (paid.collection === collection && paid.recordId === entry.id && paid.status === "Paid (demo)") paid.status = "Refunded (demo)";
    }
    if (entry.paymentStatus === "Paid (demo)") entry.paymentStatus = "Refunded (demo)";
    persist(next);
    return structuredClone(entry);
  }

  window.KicksStore = {
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
      const next = structuredClone(data);
      next.settings = { ...next.settings, ...changes };
      persist(next);
    },
    persistent: () => storageAvailable,
  };
}
