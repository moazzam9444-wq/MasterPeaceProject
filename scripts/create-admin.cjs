// Run once to provision the administrator. This is not a registration page.
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
if (fs.existsSync("js/admin-account.js")) {
  console.log(
    "Administrator already provisioned. Use your saved administrator access file.",
  );
  process.exit(0);
}
const password = crypto.randomBytes(15).toString("base64url") + "7a!";
const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = crypto
  .pbkdf2Sync(password, salt, 100000, 32, "sha256")
  .toString("hex");
const admin = {
  id: 1,
  name: "KICKS Administrator",
  email: "admin@kicks.local",
  role: "admin",
  city: "Amman",
  status: "Active",
  salt,
  passwordHash,
};
if (!process.env.KICKS_ADMIN_ACCESS_FILE)
  throw new Error(
    "Set KICKS_ADMIN_ACCESS_FILE to a private output path first.",
  );
const privatePath = path.resolve(process.env.KICKS_ADMIN_ACCESS_FILE);
const relativePath = path.relative(process.cwd(), privatePath);
if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  throw new Error(
    "Administrator access file must be outside the website folder.",
  );
fs.writeFileSync(
  "js/admin-account.js",
  "// Administrator provisioned outside public registration. Password is not in this file.\nwindow.KicksAdminAccount = " +
    JSON.stringify(admin, null, 2) +
    ";\n",
);
fs.writeFileSync(
  privatePath,
  "KICKS — local administrator\nEmail: " +
    admin.email +
    "\nPassword: " +
    password +
    "\n\nLocal browser accounts only. Keep this file private.\n",
);
console.log(
  "Administrator provisioned. Credentials saved to the configured private path.",
);
