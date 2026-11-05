/* Homepage-only presentation adapter and motion. Existing booking/account/store code is unchanged. */
(() => {
  "use strict";
  const store = window.KicksStore;
  const esc = (value) => store.escape(String(value ?? ""));
  const fieldsGrid = document.getElementById("home-fields-grid");
  const gamesGrid = document.getElementById("home-open-games-grid");
  const cupsGrid = document.getElementById("home-tournaments-grid");
  const form = document.getElementById("homeSearch");
  const city = document.getElementById("homeLocation"),
    date = document.getElementById("homeDate"),
    time = document.getElementById("homeTime");
  const status = document.getElementById("homeSearchStatus"),
    resultBar = document.getElementById("homeSearchResults");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let filters = null,
    lenis;
  function ammanNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Amman",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
  }
  function available(field, day, slot, bookings) {
    if (!day) return true;
    const now = ammanNow();
    if (day < now.date || (day === now.date && !field.today)) return false;
    const hours = slot
      ? [Number(slot.slice(0, 2))]
      : Array.from({ length: 13 }, (_, i) => i + 10);
    return hours.some(
      (hour) =>
        hour >= 10 &&
        hour <= 22 &&
        !(day === now.date && hour <= now.hour) &&
        !bookings.some(
          (b) =>
            b.fieldId === field.id &&
            b.date === day &&
            Number(b.time.slice(0, 2)) === hour &&
            ["Pending", "Confirmed"].includes(b.status),
        ),
    );
  }
  function fieldCard(field) {
    const image =
      window.KicksAuth?.fieldImage(field).replace(
        /assets\/images\/(field[1-4])\.jpg$/,
        "assets/images/$1-home.webp",
      ) || "assets/images/field1-home.webp";
    const availability = filters?.date
      ? filters.time
        ? `${filters.time} · Check schedule`
        : "Check selected date"
      : "Check schedule";
    return `<a class="fl-field-card" href="Pages/Fields/field-details.html?id=${encodeURIComponent(field.id)}" aria-label="View ${esc(field.name)}, ${esc(field.city)}, ${esc(field.price)} JD per hour"><div class="field-media"><img src="${esc(image)}" alt="Football pitch at ${esc(field.name)}" width="800" height="520" loading="lazy" decoding="async"><span class="field-format">${esc(field.type)}</span></div><div class="field-card-info"><p class="field-place">${esc([field.area, field.city].filter(Boolean).join(", "))}</p><h3>${esc(field.name)}</h3><span class="field-availability">${availability}</span><div class="field-card-bottom"><span class="field-price">${esc(field.price)} JD <small>/ hour</small></span><span class="field-arrow" aria-hidden="true">↗</span></div></div></a>`;
  }
  function emptyFields() {
    return `<div class="empty-fields"><div class="empty-fields-photo"><img src="assets/images/matchday-pitch.webp" alt="An illuminated football pitch, shown as promotional imagery" width="1600" height="900" loading="lazy"></div><div class="empty-fields-copy"><span class="fl-eyebrow">YOUR NEXT GAME IS OUT THERE</span><h3>${filters ? "LET’S FIND<br>ANOTHER MATCH." : "GREAT GAMES<br>START HERE."}</h3><p>${filters ? "No fields match this search. Try another location, date, or time." : "No fields published yet. Explore KICKS, or register as a field owner to bring your pitch to the community."}</p><a class="text-link" href="${filters ? "Pages/Fields/fields.html" : "Pages/Auth/register.html"}">${filters ? "Explore all fields" : "List your field"} <span aria-hidden="true">↗</span></a></div></div>`;
  }
  function gameCard(game, fields) {
    const field = fields.find((f) => f.id === game.fieldId);
    if (!field) return "";
    const d = new Date(`${game.date}T12:00:00+03:00`);
    const month = d
        .toLocaleDateString("en-GB", { month: "short", timeZone: "Asia/Amman" })
        .toUpperCase(),
      day = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        timeZone: "Asia/Amman",
      });
    const spots = Math.max(0, game.capacity - game.joined),
      live = Date.parse(`${game.date}T${game.time}:00+03:00`) <= Date.now();
    const label = live
      ? "In progress"
      : spots
        ? `${spots} ${spots === 1 ? "spot" : "spots"} left`
        : "Full";
    return `<a class="fl-game-row" href="Pages/OpenGames/game-details.html?id=${encodeURIComponent(game.id)}"><span class="game-date-block">${esc(month)}<strong>${esc(day)}</strong></span><div class="game-row-main"><h3>${esc(game.title)}</h3><p>${esc(field.name)} · ${esc(field.city)}</p><div class="game-row-detail"><span>${esc(game.time)} · ${esc(field.type)}</span><span>${esc(label)}</span><span>${esc(game.price)} JD / player</span></div></div><span class="game-row-arrow" aria-hidden="true">↗</span></a>`;
  }
  function cupCard(cup, fields) {
    const field = fields.find((f) => f.id === cup.fieldId);
    if (!field) return "";
    const live = Date.parse(`${cup.date}T${cup.time}:00+03:00`) <= Date.now(),
      label = live
        ? "In progress"
        : cup.teams < cup.capacity
          ? "Registration open"
          : "Full";
    return `<a class="fl-cup-row" href="Pages/Tournaments/tournament-details.html?id=${encodeURIComponent(cup.id)}"><div class="cup-topline"><span>${esc(label)}</span><span>${esc(cup.date)}</span></div><h3>${esc(cup.name)}</h3><div class="cup-meta"><span>${esc(field.city)}</span><span>${esc(field.type)}</span><span>${esc(cup.teams)} / ${esc(cup.capacity)} teams</span></div><div class="cup-row-bottom"><span>${esc(cup.fee)} JD / team</span><span aria-hidden="true">↗</span></div></a>`;
  }
  function renderHighlights() {
    const fields = store.list("fields"),
      selected = city.value;
    const cities = [
      ...new Set(fields.map((f) => f.city).filter(Boolean)),
    ].sort();
    if (selected && !cities.includes(selected)) cities.push(selected);
    if (city.dataset.cities !== cities.join("|")) {
      city.dataset.cities = cities.join("|");
      city.replaceChildren(
        new Option("All locations", ""),
        ...cities.map((c) => new Option(c, c)),
      );
      city.value = selected;
    }
    date.min = ammanNow().date;
    const bookings = store.list("bookings");
    const matches = fields.filter(
      (f) =>
        !filters ||
        ((!filters.city || f.city === filters.city) &&
          available(f, filters.date, filters.time, bookings)),
    );
    fieldsGrid.innerHTML =
      matches
        .slice(0, filters ? 12 : 3)
        .map(fieldCard)
        .join("") || emptyFields();
    if (filters) {
      resultBar.hidden = false;
      const description = [filters.city, filters.date, filters.time]
        .filter(Boolean)
        .join(" · ");
      status.textContent = `${matches.length} ${matches.length === 1 ? "field matches" : "fields match"}${description ? " · " + description : ""}.${matches.length > 12 ? " Showing the first 12." : ""} Confirm your booking time on the field page.`;
    }
    const byStart = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
    gamesGrid.innerHTML =
      store
        .publicActivities("games")
        .sort(byStart)
        .slice(0, 3)
        .map((g) => gameCard(g, fields))
        .join("") ||
      '<p class="home-empty">No active or upcoming games yet. Check back for your next kick-off.</p>';
    cupsGrid.innerHTML =
      store
        .publicActivities("tournaments")
        .sort(byStart)
        .slice(0, 1)
        .map((c) => cupCard(c, fields))
        .join("") ||
      '<p class="home-empty">No active or upcoming tournaments yet. Get your team ready for the next one.</p>';
    const settings = store.settings(),
      aboutTitle = document.getElementById("homeAboutTitle"),
      aboutDescription = document.getElementById("homeAboutDescription"),
      contact = document.getElementById("homeContact");
    if (aboutTitle && settings.title?.trim())
      aboutTitle.textContent = settings.title;
    if (aboutDescription && settings.description?.trim())
      aboutDescription.textContent = settings.description;
    if (contact && settings.contact) {
      contact.textContent = settings.contact;
      contact.hidden = false;
    }
    document.dispatchEvent(new CustomEvent("kicks:home-rendered"));
  }
  if (store) {
    for (let hour = 10; hour <= 22; hour++)
      time.add(
        new Option(
          `${String(hour).padStart(2, "0")}:00`,
          `${String(hour).padStart(2, "0")}:00`,
        ),
      );
    time.addEventListener("change", () => {
      date.required = Boolean(time.value);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      date.min = ammanNow().date;
      if (!form.reportValidity()) return;
      filters = { city: city.value, date: date.value, time: time.value };
      renderHighlights();
      document
        .getElementById("fields")
        .scrollIntoView({
          behavior: reduced.matches ? "instant" : "smooth",
          block: "start",
        });
      status.tabIndex = -1;
      status.focus({ preventScroll: true });
    });
    document.getElementById("homeSearchReset").addEventListener("click", () => {
      filters = null;
      form.reset();
      date.required = false;
      resultBar.hidden = true;
      renderHighlights();
      const heading = document.getElementById("fieldsTitle");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
    renderHighlights();
    store.watchActivityClock(renderHighlights);
    addEventListener("storage", (event) => {
      if (event.key === "kicks-data-v2") renderHighlights();
    });
    addEventListener("kicks-data-change", renderHighlights);
  }

  const nav = document.querySelector(".navbar"),
    menu = document.getElementById("mainNavbar"),
    menuButton = document.querySelector(".navbar-toggler"),
    backTop = document.getElementById("backToTop");
  const mobile = matchMedia("(max-width:1199px)");
  function setMenu(open, restore = false) {
    menu.classList.toggle("show", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    document.body.classList.toggle("menu-open", open);
    if (open) lenis?.stop();
    else lenis?.start();
    if (restore) menuButton.focus();
  }
  menuButton.addEventListener("click", () =>
    setMenu(!menu.classList.contains("show")),
  );
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a") && mobile.matches) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("show"))
      setMenu(false, true);
    if (
      event.key === "Tab" &&
      mobile.matches &&
      menu.classList.contains("show")
    ) {
      const focusable = [
          menuButton,
          ...menu.querySelectorAll("a[href],button:not([disabled])"),
        ].filter((el) => !el.closest("[hidden]") && el.getClientRects().length),
        first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  mobile.addEventListener("change", () => {
    if (!mobile.matches) setMenu(false);
  });
  document.addEventListener("click", (event) => {
    if (
      mobile.matches &&
      menu.classList.contains("show") &&
      !nav.contains(event.target)
    )
      setMenu(false);
  });
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    nav.classList.toggle("navbar-scrolled", scrollY > 40);
    backTop.classList.toggle("show", scrollY > 600);
    progress.style.transform = `scaleX(${Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))})`;
  }
  addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  updateScroll();
  backTop.addEventListener("click", () => {
    if (lenis && !reduced.matches) lenis.scrollTo(0);
    else scrollTo({ top: 0, behavior: reduced.matches ? "instant" : "smooth" });
    document.querySelector(".navbar-brand").focus({ preventScroll: true });
  });

  const gsap = window.gsap,
    ST = window.ScrollTrigger;
  if (!gsap || !ST) return; // Forms, catalogue, and mobile menu work without animation dependencies.
  gsap.registerPlugin(ST);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  ST.config({ ignoreMobileResize: true });
  const media = gsap.matchMedia();
  media.add(
    {
      desktop: "(min-width:901px)",
      fine: "(hover:hover) and (pointer:fine)",
      motion: "(prefers-reduced-motion: no-preference)",
    },
    (context) => {
      const { desktop, fine, motion } = context.conditions;
      if (!motion) return;
      const cleanups = [];
      if (desktop && fine && window.Lenis) {
        lenis = new window.Lenis({
          duration: 0.95,
          smoothWheel: true,
          syncTouch: false,
          anchors: true,
          prevent: (node) =>
            Boolean(
              node.closest(".kicks-chat,.navbar-collapse,dialog,.avatar-menu"),
            ),
        });
        lenis.on("scroll", ST.update);
        const tick = (seconds) => lenis?.raf(seconds * 1000);
        gsap.ticker.add(tick);
        cleanups.push(() => {
          gsap.ticker.remove(tick);
          lenis?.destroy();
          lenis = null;
        });
      }
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(
          ".hero-topline,.hero-kicker",
          { y: 12, opacity: 0, duration: 0.65, stagger: 0.1 },
          0,
        )
        .from(
          ".title-line",
          { yPercent: 25, opacity: 0, duration: 0.9, stagger: 0.12 },
          0.08,
        )
        .from(
          ".hero-bottom-copy,.hero-search-heading,.fl-search,.hero-footline",
          { y: 18, opacity: 0, duration: 0.75, stagger: 0.1 },
          0.35,
        );
      if (desktop && fine) {
        gsap.to(".hero-image", {
          scale: 1.09,
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: ".fl-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.to(".hero-side", {
          y: -35,
          rotation: 3,
          ease: "none",
          scrollTrigger: {
            trigger: ".fl-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.to(".manifesto-track", {
          xPercent: -8,
          ease: "none",
          scrollTrigger: {
            trigger: ".fl-manifesto",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
        const story = document.querySelector(".fl-story");
        story.classList.add("story-enhanced");
        const scenes = gsap.utils.toArray(".story-scene");
        gsap.set(scenes.slice(1), { autoAlpha: 0, y: 28 });
        gsap
          .timeline({
            scrollTrigger: {
              id: "kicks-story",
              trigger: story,
              start: "top 85px",
              end: "+=1150",
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          })
          .to(
            ".story-progress-fill",
            { scaleX: 1, duration: 3, ease: "none" },
            0,
          )
          .to(scenes[0], { autoAlpha: 0, y: -24, duration: 0.45 }, 0.65)
          .to(scenes[1], { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8)
          .to(scenes[1], { autoAlpha: 0, y: -24, duration: 0.45 }, 1.75)
          .to(scenes[2], { autoAlpha: 1, y: 0, duration: 0.5 }, 1.9);
        cleanups.push(() => story.classList.remove("story-enhanced"));
        gsap.fromTo(
          ".community-photo>img",
          { yPercent: -4, scale: 1.1 },
          {
            yPercent: 4,
            scale: 1.1,
            ease: "none",
            scrollTrigger: {
              trigger: ".fl-games",
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          },
        );
      }
      document.querySelectorAll("[data-reveal]").forEach((heading) => {
        if (window.SplitText) {
          const split = window.SplitText.create(heading, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 105,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: heading,
                  start: "top 92%",
                  once: true,
                },
              });
            },
          });
          cleanups.push(() => split.revert());
        } else
          gsap.from(heading, {
            y: 24,
            opacity: 0,
            duration: 0.75,
            scrollTrigger: { trigger: heading, start: "top 92%", once: true },
          });
      });
      gsap.utils
        .toArray(
          ".how-grid article,.section-description,.community-photo,.tournament-panel",
        )
        .forEach((element) =>
          gsap.from(element, {
            y: desktop ? 28 : 16,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 94%", once: true },
          }),
        );
      const bracket = document.querySelector(".bracket-art path");
      if (bracket) {
        const length = bracket.getTotalLength();
        gsap.fromTo(
          bracket,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "power2.inOut",
            scrollTrigger: { trigger: bracket, start: "top 90%", once: true },
          },
        );
      }
      return () => cleanups.reverse().forEach((cleanup) => cleanup());
    },
  );
  let refreshFrame;
  const refresh = () => {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => ST.refresh());
  };
  document.fonts?.ready.then(refresh);
  document.querySelectorAll("img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", refresh, { once: true });
  });
  document.addEventListener("kicks:home-rendered", refresh);
  document
    .querySelectorAll(".faq-list details")
    .forEach((details) => details.addEventListener("toggle", refresh));
  addEventListener("pageshow", () => {
    refresh();
    updateScroll();
  });
})();
