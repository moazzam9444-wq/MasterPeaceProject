// حالة النافبار وحركة ظهور المحتوى، بدون تغيير بيانات الموقع.
{
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const navbar = document.querySelector(".navbar");
  let framePending = false;

  function updateNavbar() {
    navbar?.classList.toggle("navbar-scrolled", scrollY > 30);
    framePending = false;
  }
  addEventListener(
    "scroll",
    () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(updateNavbar);
    },
    { passive: true },
  );
  updateNavbar();

  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const seen = new WeakSet();
    const cards =
      ".catalog-card, .match-card, .cup-card, .field-card, .game-card, .tournament-card, .why-card, .step-card, .detail-panel, .dash-panel, .stat-card, .about-card, .faq-intro, .faq-list";
    const homeDetails = document.body.classList.contains("home-page")
      ? ", .section-header, .home-about-visual, .home-about-copy, .creative-band, .cta-content"
      : "";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!reducedMotion.matches)
            entry.target.classList.add("section-enter");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -16px 0px" },
    );

    function watchSections() {
      const elements = document.querySelectorAll(
        "main > section, main > div > section, " + cards + homeDetails,
      );
      for (const element of elements) {
        if (
          seen.has(element) ||
          element.matches(".hero") ||
          element.closest("[hidden], dialog")
        )
          continue;
        // لا نحرك القسم وكروته مع بعض حتى تظل الحركة هادئة.
        if (element.querySelector(cards + homeDetails)) continue;
        seen.add(element);
        observer.observe(element);
      }
    }
    watchSections();
    const content = document.querySelector("main");
    if (content)
      new MutationObserver(watchSections).observe(content, {
        childList: true,
        subtree: true,
      });
  }
}
