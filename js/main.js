// دليل الملف: تفاعل الهوم: حالة النافبار أثناء السكرول وزر العودة للأعلى.
/* Home interactions only; catalogue and future booking logic belong in separate modules. */
{
  const backToTop = document.querySelector("#backToTop");
  const links = [...document.querySelectorAll(".navbar .nav-link")];
  // Only section links participate: Fields is a separate page.
  const sections = links
    .filter((link) => link.hash && link.pathname === location.pathname)
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter(Boolean);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scheduled = false;

  function updateScrollState() {
    const scrollY = window.scrollY;
    backToTop?.classList.toggle("show", scrollY > 500);
    let current = sections[0]?.id;
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= 160) current = section.id;
    });
    links.forEach((link) => {
      const active = link.hash === `#${current}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    scheduled = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(updateScrollState);
      }
    },
    { passive: true },
  );
  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  });
  updateScrollState();
}
