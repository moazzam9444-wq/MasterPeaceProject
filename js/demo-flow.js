(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const teams = [
    ["صقور عمّان", "أحمد", ["يزن", "زيد", "ليث", "آدم", "حمزة", "علي"]],
    ["نجوم الزرقاء", "عمر", ["عمر", "كرم", "أنس", "رامي", "سيف", "بلال"]],
    ["فرسان إربد", "خالد", ["خالد", "هاشم", "مالك", "سامر", "محمد", "جواد"]],
    ["أسود السلط", "محمود", ["محمود", "يوسف", "أمير", "حسن", "قيس", "إياد"]],
  ];
  let tab = "teams",
    role = "a",
    challenge = 0,
    cup = 0,
    entries = [],
    result = [3, 1];
  const roles = {
    a: "كوتش أحمد",
    b: "كوتش عمر",
    admin: "منظّم البطولة",
    player: "اللاعب يزن",
  };
  function log(text) {
    entries.push({ text, by: roles[role] });
    $("#notice").textContent = text;
  }
  function action(id, text, allowed = true) {
    return `<button id="${id}" ${allowed ? "" : "disabled"}>${text}</button>`;
  }
  function bind(id, fn) {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  }
  function render() {
    document
      .querySelectorAll("[data-tab]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.tab === tab)),
      );
    if (tab === "teams") {
      $("#view").innerHTML =
        '<h2>٤ تيمات جاهزة للملعب</h2><p class="muted">٦ لاعبين في كل تيم · ابدأ التشالنج لتجربة مواجهة الصقور والنجوم.</p><div class="grid">' +
        teams
          .map(
            (t, i) =>
              `<article class="card"><div class="team-top"><span class="crest">0${i + 1}</span><div><h3>${t[0]}</h3><small>الكوتش ${t[1]}</small></div></div><div class="players">${t[2].map((p, j) => `<div class="player">${p}<small>#${j + 1} · ${["حارس مرمى", "دفاع", "دفاع", "وسط", "هجوم", "هجوم"][j]}</small></div>`).join("")}</div></article>`,
          )
          .join("") +
        '</div><div class="actions">' +
        action("begin", "جرّب إرسال تشالنج ←") +
        "</div>";
      bind("begin", () => {
        tab = "challenge";
        render();
      });
    } else if (tab === "challenge") {
      const stages = [
        "إرسال الدعوة",
        "قبول المنافس",
        "تسجيل النتيجة",
        "تأكيد النتيجة",
      ];
      const hint =
        challenge === 0
          ? "ابدأ ككوتش أحمد وأرسل الدعوة لنجوم الزرقاء."
          : challenge === 1
            ? "بدّل للكوتش عمر من القائمة فوق، واقبل التشالنج."
            : challenge === 2
              ? "بدّل للكوتش أحمد وسجّل نتيجة المباراة."
              : challenge === 3
                ? "بدّل للكوتش عمر ليؤكّد النتيجة."
                : "اكتملت المواجهة وتم اعتماد النتيجة.";
      $("#view").innerHTML =
        `<h2>تشالنج ودّي</h2><div class="steps">${stages.map((s, i) => `<span class="step ${challenge > i ? "done" : ""}">${challenge > i ? "✓ " : ""}${s}</span>`).join("")}</div><article class="card"><span class="tag">${["جاهز للإرسال", "بانتظار قبول المنافس", "تم قبول المواجهة", "بانتظار تأكيد النتيجة", "مكتمل"][challenge]}</span><div class="match">صقور عمّان × نجوم الزرقاء</div><p class="muted">ملعب عمّان · الأحد · ٧:٠٠ مساءً · موعد تجريبي</p>${challenge === 2 ? '<div class="score"><label>صقور عمّان<input id="home" type="number" min="0" max="30" value="3"></label><span>:</span><label>نجوم الزرقاء<input id="away" type="number" min="0" max="30" value="1"></label></div>' : challenge >= 3 ? `<div class="match">${result[0]} : ${result[1]}</div>` : ""}<div class="hint">${hint}</div><div class="actions">${challenge === 0 ? action("send", "إرسال التشالنج", role === "a") : challenge === 1 ? action("accept", "قبول التشالنج", role === "b") : challenge === 2 ? action("score", "إرسال النتيجة للتأكيد", role === "a") : challenge === 3 ? action("confirm", "تأكيد النتيجة", role === "b") : action("tocup", "جرّب البطولة ←")}</div></article>`;
      bind("send", () => {
        challenge = 1;
        log("أحمد أرسل تشالنج لنجوم الزرقاء.");
        render();
      });
      bind("accept", () => {
        challenge = 2;
        log("عمر قبل التشالنج؛ المواجهة جاهزة.");
        render();
      });
      bind("score", () => {
        const a = $("#home").value,
          b = $("#away").value,
          vals = [Number(a), Number(b)];
        if (
          a === "" ||
          b === "" ||
          !vals.every((n) => Number.isInteger(n) && n >= 0 && n <= 30)
        ) {
          $("#notice").textContent = "أدخل نتيجة صحيحة من ٠ إلى ٣٠ لكل تيم.";
          return;
        }
        result = vals;
        challenge = 3;
        log("تم إرسال النتيجة للمنافس للتأكيد.");
        render();
      });
      bind("confirm", () => {
        challenge = 4;
        log(
          `تم تأكيد نتيجة التشالنج: الصقور ${result[0]} – ${result[1]} النجوم.`,
        );
        render();
      });
      bind("tocup", () => {
        tab = "cup";
        render();
      });
    } else if (tab === "cup") {
      $("#view").innerHTML =
        `<h2>كأس KICKS · ٤ تيمات</h2><p class="muted">سيناريو ديمو: خروج مغلوب · نصف نهائي ثم نهائي · النتائج محددة للعرض.</p><div class="steps">${["تسجيل التيمات", "بدء البطولة", "نصف النهائي", "النهائي"].map((s, i) => `<span class="step ${cup > i ? "done" : ""}">${cup > i ? "✓ " : ""}${s}</span>`).join("")}</div><article class="card"><span class="tag">${cup === 0 ? "٣ / ٤ تيمات مسجلة" : cup === 1 ? "٤ / ٤ · جاهزة للبدء" : cup === 4 ? "البطولة مكتملة" : "البطولة جارية"}</span><div class="bracket"><div><h3>نصف النهائي</h3><div class="fixture"><strong>صقور عمّان × نجوم الزرقاء</strong>${cup >= 3 ? "٢ – ١ · الصقور تأهلوا" : "بانتظار المباراة"}</div><div class="fixture"><strong>فرسان إربد × أسود السلط</strong>${cup >= 3 ? "١ – ٣ · الأسود تأهلوا" : "بانتظار المباراة"}</div></div><div><h3>النهائي</h3><div class="fixture"><strong>${cup >= 3 ? "صقور عمّان × أسود السلط" : "بانتظار المتأهلين"}</strong>${cup === 4 ? "٢ – ٠ · نهائي" : "لم تُلعب بعد"}</div>${cup === 4 ? '<p class="winner">🏆 صقور عمّان أبطال الكأس</p>' : ""}</div></div><div class="hint">${cup === 0 ? "باقي مقعد واحد: ادخل ككوتش أحمد وسجّل صقور عمّان." : cup < 4 ? "بدّل إلى منظّم البطولة لإدارة المباريات وتسجيل النتائج." : "اكتملت البطولة. افتح سجل الرحلة لتشوف كل الخطوات."}</div><div class="actions">${cup === 0 ? action("join", "تسجيل صقور عمّان", role === "a") : cup === 1 ? action("start", "بدء البطولة", role === "admin") : cup === 2 ? action("semi", "اعتماد نتائج نصف النهائي", role === "admin") : cup === 3 ? action("final", "اعتماد نتيجة النهائي وتتويج البطل", role === "admin") : action("history", "عرض سجل الرحلة")}</div></article>`;
      for (const [id, message] of [
        ["join", "تم تسجيل صقور عمّان واكتمل عدد التيمات."],
        ["start", "المنظّم بدأ البطولة وثبّت مواجهات نصف النهائي."],
        ["semi", "تأهل صقور عمّان وأسود السلط للنهائي."],
        ["final", "تم اعتماد النهائي وتتويج صقور عمّان."],
      ])
        bind(id, () => {
          cup++;
          log(message);
          render();
        });
      bind("history", () => {
        tab = "log";
        render();
      });
    } else {
      $("#view").innerHTML =
        '<h2>سجل الرحلة</h2><p class="muted">كل خطوة نفّذتها خلال التجربة الحالية.</p>' +
        (entries.length
          ? entries
              .map(
                (e, i) =>
                  `<div class="log"><strong>${i + 1}. ${e.text}</strong><small>${e.by}</small></div>`,
              )
              .join("")
          : '<div class="hint">لسّه ما بدأت. افتح التشالنج وأرسل أول دعوة.</div>');
    }
  }
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        $("#notice").textContent = "";
        render();
      }),
  );
  $("#persona").onchange = (e) => {
    role = e.target.value;
    $("#notice").textContent = `أنت الآن: ${roles[role]}`;
    render();
  };
  $("#reset").onclick = () => {
    challenge = 0;
    cup = 0;
    entries = [];
    result = [3, 1];
    role = "a";
    tab = "teams";
    $("#persona").value = "a";
    $("#notice").textContent = "رجعنا لنقطة البداية.";
    render();
  };
  render();
})();
