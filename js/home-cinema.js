// Homepage section motion; no account or booking logic.
{
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  // A continuous football ribbon; the duplicate is decorative for screen readers.
  const band = document.querySelector(".home-page .creative-band .container");
  if (band) {
    const track = document.createElement("div");
    track.className = "home-ribbon-track";
    const original = document.createElement("div");
    original.className = "home-ribbon-group";
    while (band.firstChild) original.append(band.firstChild);
    const duplicate = original.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    track.append(original, duplicate);
    band.append(track);
  }

  // Gentle depth on the about image and a reading-progress line for the homepage.
  const about = document.querySelector(".home-page .home-about");
  const cardImages = document.querySelectorAll(".home-page .field-image-wrapper");
  const visibleImages = new Set();
  const imageObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle("image-moving", entry.isIntersecting && !motion.matches);
      if (entry.isIntersecting) visibleImages.add(entry.target);
      else visibleImages.delete(entry.target);
    }
  }, { threshold: 0.05 });
  for (const image of cardImages) imageObserver.observe(image);
  const pageProgress = document.createElement("div");
  pageProgress.className = "home-reading-progress";
  pageProgress.setAttribute("aria-hidden", "true");
  document.body.append(pageProgress);
  let homeFrame = false;
  const sections = document.querySelectorAll(".home-page main > section:not(.hero)");
  const movingCards = document.querySelectorAll(".home-page :is(.field-card,.game-card,.tournament-card,.why-card,.step-card)");
  for (const [index, card] of Array.from(movingCards).entries()) {
    card.style.setProperty("--card-direction", index % 2 ? 1 : -1);
  }
  function updateHomeDepth() {
    homeFrame = false;
    pageProgress.style.transform = "scaleX(" + scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) + ")";
    if (about && !motion.matches) {
      const box = about.getBoundingClientRect();
      if (box.bottom > 0 && box.top < innerHeight) {
        const depth = Math.max(-1, Math.min(1, (box.top + box.height / 2 - innerHeight / 2) / innerHeight));
        about.style.setProperty("--about-depth", depth * -28 + "px");
      }
    }
    if (!motion.matches) {
      for (const section of sections) {
        const box = section.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight) continue;
        const entry = Math.max(0, Math.min(1, (innerHeight - box.top) / (innerHeight * 0.75)));
        section.style.setProperty("--section-reveal", entry);
        section.style.setProperty("--section-drift", Math.max(-1, Math.min(1, (box.top + box.height / 2 - innerHeight / 2) / innerHeight)));
      }
      for (const card of movingCards) {
        const box = card.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight) continue;
        const entry = Math.max(0, Math.min(1, (innerHeight - box.top) / (innerHeight * 0.5)));
        card.style.setProperty("--card-entry", entry);
      }
      for (const image of visibleImages) {
        const box = image.getBoundingClientRect();
        const offset = (box.top + box.height / 2 - innerHeight / 2) / innerHeight;
        image.style.setProperty("--card-depth", Math.max(-14, Math.min(14, offset * -30)) + "px");
      }
    }
  }
  addEventListener("scroll", () => {
    if (!homeFrame) { homeFrame = true; requestAnimationFrame(updateHomeDepth); }
  }, { passive: true });
  addEventListener("resize", updateHomeDepth);
  motion.addEventListener("change", updateHomeDepth);
  // Pointer spotlight is decorative; touch and keyboard users keep all content.
  for (const card of movingCards) {
    card.addEventListener("pointermove", event => {
      if (motion.matches || event.pointerType !== "mouse") return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", event.clientX - box.left + "px");
      card.style.setProperty("--spot-y", event.clientY - box.top + "px");
    });
  }
  updateHomeDepth();
}
