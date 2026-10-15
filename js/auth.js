// دليل الملف: نماذج الدخول والتسجيل: قراءة المدخلات، التحقق، ثم استدعاء account.js.
// فحص المدخلات وتسجيل الحساب المحلي ثم الانتقال حسب الدور.
(() => {
  const getElement = (id) => document.getElementById(id);
  let registering = location.pathname.endsWith("/register.html");
  const form = getElement("authForm");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const card = document.querySelector(".auth-panel");
  let flipVersion = 0;
  let flipAnimation;
  // Both URLs share one form. Turning the card changes its mode in place.
  function updateMode() {
    document.body.classList.toggle("register-page", registering);
    document.title = registering ? "Join the team | KICKS" : "Welcome back | KICKS";
    form.querySelector(".role-fieldset").hidden = !registering;
    getElement("nameGroup").hidden = !registering;
    getElement("fullName").required = registering;
    getElement("confirmGroup").hidden = !registering;
    getElement("confirmPassword").required = registering;
    getElement("password").autocomplete = registering ? "new-password" : "current-password";
    getElement("passwordHint").hidden = !registering;
    getElement("password").value = "";
    getElement("confirmPassword").value = "";
    for (const id of ["nameError", "emailError", "passwordError", "confirmError"]) getElement(id).textContent = "";
    for (const input of form.querySelectorAll("[aria-invalid]")) input.removeAttribute("aria-invalid");
    const requestedRole = new URLSearchParams(location.search).get("role");
    if (registering && ["player", "owner"].includes(requestedRole)) form.querySelector('[name="role"][value="' + requestedRole + '"]').checked = true;
    getElement("switchCopy").innerHTML = registering
      ? 'Already have an account? <a href="login.html">Log in</a>'
      : 'New to the team? <a href="register.html">Create an account</a>';
    getElement("switchCopy").querySelector("a").href = (registering ? "login.html" : "register.html") + location.search;
    updateRole();
  }
  function updateRole() {
    getElement("formTitle").textContent =
      registering ? "Create account" : "Log in";
    getElement("formIntro").textContent = registering
      ? (form.elements.role.value === "owner" ? "Bring your pitch to KICKS." : "Your next match starts here.")
      : "Welcome back to KICKS.";
    const adminRegistration =
      registering && form.elements.role.value === "admin";
    getElement("adminNotice").hidden = !adminRegistration;
    getElement("submitAuth").disabled = adminRegistration;
    getElement("submitLabel").textContent = adminRegistration
      ? "Admin accounts are assigned"
      : registering
        ? "Create account"
        : "Log in";
    getElement("switchCopy").hidden =
      !registering && form.elements.role.value === "admin";
    getElement("formStatus").textContent = "";

  }
  async function roleChanged() {
    const version = ++flipVersion;
    if (flipAnimation) flipAnimation.cancel();
    // A single accessible form turns away, changes role, then turns back.
    if (reducedMotion.matches) {
      updateRole();
      return;
    }
    try {
      flipAnimation = card.animate(
        [{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }],
        { duration: 180, easing: "ease-in", fill: "forwards" },
      );
      await flipAnimation.finished;
      if (version !== flipVersion) return;
      updateRole();
      flipAnimation.cancel();
      flipAnimation = card.animate(
        [{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }],
        { duration: 220, easing: "ease-out", fill: "forwards" },
      );
      await flipAnimation.finished;
      if (version === flipVersion) {
        flipAnimation.cancel();
        flipAnimation = null;
      }
    } catch {
      /* A newer role selection cancels the previous turn. */
    }
  }
  document
      .querySelectorAll('[name="role"]')
      .forEach((input) => input.addEventListener("change", roleChanged));
  getElement("switchCopy").addEventListener("click", async event => {
    const link = event.target.closest("a");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (card.dataset.turning === "true" || getElement("submitAuth").disabled) return;
    ++flipVersion;
    if (flipAnimation) flipAnimation.cancel();
    card.dataset.turning = "true";
    form.inert = true;
    try {
      if (!reducedMotion.matches) {
        const turn = card.animate([{ transform: "rotateY(0deg)", opacity: 1 }, { transform: "rotateY(90deg)", opacity: .6 }], { duration: 230, easing: "ease-in" });
        await turn.finished;
      }
      history.pushState(null, "", link.href);
      registering = location.pathname.endsWith("/register.html");
      updateMode();
      window.scrollTo({ top: 0, behavior: "instant" });
      if (!reducedMotion.matches) {
        const turn = card.animate([{ transform: "rotateY(-90deg)", opacity: .6 }, { transform: "rotateY(0deg)", opacity: 1 }], { duration: 330, easing: "cubic-bezier(.2,.7,.25,1)" });
        await turn.finished;
      }
      form.inert = false;
      getElement(registering ? "fullName" : "email").focus({ preventScroll: true });
    } finally { delete card.dataset.turning; form.inert = false; }
  });
  addEventListener("popstate", () => {
    registering = location.pathname.endsWith("/register.html");
    updateMode();
  });
  document.querySelectorAll("[data-password]").forEach((button) =>
    button.addEventListener("click", () => {
      const input = getElement(button.dataset.password);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        `${show ? "Hide" : "Show"} ${button.dataset.password === "password" ? "password" : "confirm password"}`,
      );
    }),
  );
  const errors = {
    fullName: "nameError",
    email: "emailError",
    password: "passwordError",
    confirmPassword: "confirmError",
  };
  function error(id, message) {
    getElement(errors[id]).textContent = message;
    if (message) getElement(id).setAttribute("aria-invalid", "true");
    else getElement(id).removeAttribute("aria-invalid");
  }
  form.addEventListener("input", (event) => {
    if (errors[event.target.id]) error(event.target.id, "");
    getElement("formStatus").textContent = "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getElement("submitAuth").disabled) return;
    if (registering && form.elements.role.value === "admin") return;
    Object.keys(errors).forEach((id) => error(id, ""));
    const invalid = [];
    function fail(id, message) {
      error(id, message);
      invalid.push(id);
    }
    if (registering && getElement("fullName").value.trim().length < 2)
      fail("fullName", "Enter your full name (at least 2 characters).");
    getElement("email").value = getElement("email").value.trim();
    if (!getElement("email").value || !getElement("email").validity.valid)
      fail("email", "Enter a valid email address.");
    const password = getElement("password").value;
    if (!password) fail("password", "Enter your password.");
    else if (
      registering &&
      (password.length < 8 ||
        !/[a-z]/i.test(password) ||
        !/[0-9]/.test(password))
    )
      fail("password", "Use at least 8 characters with a letter and a number.");
    if (
      registering &&
      (!getElement("confirmPassword").value ||
        getElement("confirmPassword").value !== password)
    )
      fail("confirmPassword", "Your passwords must match.");
    if (invalid.length) {
      getElement("formStatus").textContent = "Check the highlighted fields.";
      getElement(invalid[0]).focus();
      return;
    }
    const button = getElement("submitAuth");
    button.disabled = true;
    getElement("formStatus").textContent = registering
      ? "Creating your account…"
      : "Signing in…";
    try {
      let account;
      if (registering) {
        account = await KicksAuth.register({
          name: getElement("fullName").value,
          email: getElement("email").value,
          password: password,
          role: form.elements.role.value,
        });
      } else {
        account = await KicksAuth.login(
          getElement("email").value,
          password,
        );
      }
      getElement("password").value = "";
      getElement("confirmPassword").value = "";
      KicksAuth.afterLogin(account);
    } catch (error) {
      getElement("formStatus").textContent = error.message;
      button.disabled = false;
    }
  });
  updateMode();
})();
