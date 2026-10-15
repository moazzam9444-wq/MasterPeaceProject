// اختيار الألوان محفوظ محليًا، ويطبق قبل ظهور الصفحة لتجنب الوميض.
{
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  let choice = null;
  try {
    choice = localStorage.getItem("kicks-theme");
  } catch {}
  document.documentElement.dataset.theme =
    choice === "dark" || (!choice && systemTheme.matches) ? "dark" : "light";
  let toggle;
  function updateTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    if (!toggle) return;
    toggle.innerHTML =
      '<span aria-hidden="true">' +
      (dark ? "☀" : "☾") +
      "</span><span>" +
      (dark ? "Light mode" : "Dark mode") +
      "</span>";
    toggle.setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode",
    );
    toggle.setAttribute("aria-pressed", String(dark));
  }
  document.addEventListener("DOMContentLoaded", () => {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-toggle";
    toggle.addEventListener("click", () => {
      choice =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = choice;
      try {
        localStorage.setItem("kicks-theme", choice);
      } catch {}
      updateTheme();
    });
    // ضع الزر مع أدوات التنقل؛ يبقى عائماً فقط إذا لم يوجد هيدر.
    const navbar = document.getElementById("mainNavbar");
    const header = document.querySelector(".dash-top, .auth-top");
    if (navbar) {
      navbar.insertBefore(toggle, document.getElementById("navbarAccount"));
    } else if (header) {
      header.insertBefore(toggle, header.querySelector(".avatar-link"));
    } else {
      document.body.append(toggle);
    }
    updateTheme();
  });
  systemTheme.addEventListener("change", () => {
    if (choice) return;
    document.documentElement.dataset.theme = systemTheme.matches
      ? "dark"
      : "light";
    updateTheme();
  });
  addEventListener("storage", (event) => {
    if (event.key !== "kicks-theme") return;
    choice = event.newValue;
    document.documentElement.dataset.theme =
      choice === "dark" || (!choice && systemTheme.matches) ? "dark" : "light";
    updateTheme();
  });
}
