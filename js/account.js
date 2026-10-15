// حسابات محلية فقط. السيرفر مطلوب لإثبات الهوية والصلاحيات بين الأجهزة.
{
  const sessionKey = "kicks-session-v2";
  const siteRoot = new URL("../", document.currentScript.src);
  const store = KicksStore;
  function url(path) {
    return new URL(path, siteRoot).href;
  }
  function current() {
    try {
      const id = Number(sessionStorage.getItem(sessionKey));
      const account = store
        .list("users")
        .find((user) => user.id === id && user.status === "Active");
      if (!account) return null;
      const { passwordHash, salt, ...profile } = account;
      return profile;
    } catch {
      return null;
    }
  }
  // الصورة المرفوعة لها الأولوية. إذا لا توجد صورة نستخدم الصورة الجاهزة.
  function fieldImage(field) {
    if (field && /^data:image\/(jpeg|png|webp);base64,/.test(field.photo || '')) {
      return field.photo;
    }
    let imageNumber = 1;
    if (field && [1, 2, 3, 4].includes(Number(field.image))) {
      imageNumber = field.image;
    }
    return url('assets/images/field' + imageNumber + '.jpg');
  }

  // كل دور له صفحة داشبورد مختلفة.
  function dashboard(account = current()) {
    if (!account) return url('Pages/Auth/login.html');
    return url('Pages/Dashboard/' + account.role + '.html');
  }
  function loginUrl() {
    const target = new URL("Pages/Auth/login.html", siteRoot);
    target.searchParams.set(
      "returnTo",
      location.pathname + location.search + location.hash,
    );
    return target.href;
  }
  function notify(message) {
    let notice = document.getElementById("accountNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "accountNotice";
      notice.className = "account-notice";
      notice.setAttribute("role", "status");
      document.body.append(notice);
    }
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => (notice.hidden = true), 5000);
  }
  function requirePlayer() {
    const account = current();
    if (!account) {
      location.assign(loginUrl());
      return null;
    }
    if (account.role !== "player") {
      notify("Use a player account to book or join an event.");
      return null;
    }
    return account;
  }
  function requireRole(role) {
    const account = current();
    if (!account) {
      location.replace(loginUrl());
      return null;
    }
    if (account.role !== role) {
      location.replace(dashboard(account));
      return null;
    }
    return account;
  }
  function remember(account) {
    try {
      sessionStorage.setItem(sessionKey, String(account.id));
    } catch {
      throw new Error("Allow browser storage to sign in.");
    }
    window.dispatchEvent(new Event("kicks-account-change"));
  }
  function logout() {
    sessionStorage.removeItem(sessionKey);
    location.assign(url("index.html"));
  }
  function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }
  async function hashPassword(password, salt) {
    if (!crypto.subtle)
      throw new Error("Open KICKS over localhost or HTTPS to sign in.");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const hash = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    );
    return bytesToHex(hash);
  }
  async function register(details) {
    if (!["player", "owner"].includes(details.role))
      throw new Error("Administrator accounts cannot be created here.");
    const email = details.email.trim().toLowerCase();
    if (
      details.name.trim().length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      details.password.length < 8 ||
      !/[a-z]/i.test(details.password) ||
      !/[0-9]/.test(details.password)
    )
      throw new Error(
        "Enter your full name, a valid email and a password with at least 8 characters including a letter and a number.",
      );
    if (store.list("users").some((user) => user.email.toLowerCase() === email))
      throw new Error("An account already uses this email. Sign in instead.");
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(details.password, salt);
    // كلمات المرور الأصلية لا تحفظ في المتصفح.
    if (store.list("users").some((user) => user.email.toLowerCase() === email))
      throw new Error("This email is already registered.");
    const account = store.save("users", {
      name: details.name.trim(),
      email,
      role: details.role,
      city: "",
      status: "Active",
      salt,
      passwordHash,
      avatar: "",
    });
    remember(account);
    return current();
  }
  async function login(email, password) {
    const account = store
      .list("users")
      .find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
    if (
      !account ||
      account.status !== "Active" ||
      !account.passwordHash
    )
      throw new Error("Email or password is incorrect.");
    const passwordHash = await hashPassword(password, account.salt);
    if (passwordHash !== account.passwordHash)
      throw new Error("Email or password is incorrect.");
    remember(account);
    return current();
  }
  async function passwordChanges(currentPassword, newPassword) {
    const profile = current();
    if (!profile) throw Error('Please sign in again.');
    const saved = store.find('users', profile.id);
    if (await hashPassword(currentPassword, saved.salt) !== saved.passwordHash) throw Error('Current password is incorrect.');
    if (newPassword.length < 8 || !/[a-z]/i.test(newPassword) || !/\d/.test(newPassword)) throw Error('Use at least 8 characters, including a letter and a number.');
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    return {salt, passwordHash: await hashPassword(newPassword, salt)};
  }
  function afterLogin(account) {
    const returnTo = new URLSearchParams(location.search).get("returnTo");
    if (returnTo && account.role === "player") {
      try {
        const target = new URL(returnTo, siteRoot);
        const publicPages = ["index.html", "Pages/Fields/fields.html", "Pages/Fields/field-details.html", "Pages/OpenGames/open-games.html", "Pages/OpenGames/game-details.html", "Pages/Tournaments/tournaments.html", "Pages/Tournaments/tournament-details.html", "Pages/Meetings/meeting.html"];
        if (publicPages.some(path => target.origin === siteRoot.origin && target.pathname === new URL(path, siteRoot).pathname)) {
          location.assign(target.href);
          return;
        }
      } catch { /* Invalid return addresses fall back to the account's home. */ }
    }
    location.assign(
      account.role === "player" ? url("index.html") : dashboard(account),
    );
  }
  function updateNavigation() {
    const nav = document.querySelector("#mainNavbar");
    if (!nav) return;
    nav
      .querySelectorAll('a[href*="Auth/login.html"]')
      .forEach((link) => link.remove());
    let slot = document.getElementById("navbarAccount");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "navbarAccount";
      slot.className = "navbar-account";
      nav.append(slot);
    }
    const account = current();
    if (!account) {
      slot.innerHTML =
        '<a class="account-login" href="' +
        url("Pages/Auth/login.html") +
        '">Log in ↗</a>';
      return;
    }
    const profileUrl = dashboard(account) + "#profile";
    const avatar = account.avatar || url("assets/images/avatar.svg");
    slot.innerHTML = `<button type="button" class="avatar-button" id="avatarMenuButton" aria-expanded="false" aria-controls="avatarMenu" aria-label="Open account menu"><img src="${store.escape(avatar)}" alt="${store.escape(account.name)}"><span>${store.escape(account.name.split(" ")[0])}</span><span aria-hidden="true">⌄</span></button><div class="avatar-menu" id="avatarMenu" hidden><strong>${store.escape(account.name)}</strong><small>${store.escape(account.email)}</small><a href="${profileUrl}">My profile</a><a href="${dashboard(account)}">Dashboard</a><button type="button" id="logoutAccount">Log out ↗</button></div>`;
    const button = document.getElementById("avatarMenuButton"),
      menu = document.getElementById("avatarMenu");
    button.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
      button.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.getElementById("logoutAccount").addEventListener("click", logout);
  }
  document.addEventListener("click", (event) => {
    const menu = document.getElementById("avatarMenu");
    if (menu && !event.target.closest("#navbarAccount")) {
      menu.hidden = true;
      document
        .getElementById("avatarMenuButton")
        ?.setAttribute("aria-expanded", "false");
    }
  });
  // Let visitors browse, but send action buttons to sign-in before form validation.
  document.addEventListener('click', event => {
    if (!current() && event.target.closest('#bookButton, #teamSubmit, #previewJoin')) {
      event.preventDefault(); event.stopImmediatePropagation(); location.assign(loginUrl());
    }
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const menu = document.getElementById("avatarMenu");
      if (menu && !menu.hidden) {
        menu.hidden = true;
        const button = document.getElementById("avatarMenuButton");
        button.setAttribute("aria-expanded", "false");
        button.focus();
      }
    }
  });
  window.KicksAuth = {
    current,
    url,
    dashboard,
    fieldImage,
    loginUrl,
    notify,
    requirePlayer,
    requireRole,
    register,
    login,
    afterLogin,
    passwordChanges,
    logout,
    refreshNavigation: updateNavigation,
  };
  window.addEventListener("kicks-account-change", updateNavigation);
  window.addEventListener("kicks-data-change", updateNavigation);
  window.addEventListener("pageshow", updateNavigation);
  updateNavigation();
}
