# ⚽ KICKS – Football Booking Platform

### Book. Play. Connect.

**KICKS** is a football field booking platform designed to make playing football easier, faster, and more organized.

The platform connects football players with field owners, allowing users to discover and book football fields, join open games, and explore football tournaments — all in one place.

This project is developed as a **Masterpiece Project** at **Orange Coding Academy**.

---

## 🎯 Project Overview

Finding an available football field, organizing a match, or searching for players can sometimes be time-consuming.

**KICKS** aims to solve these challenges by providing a simple, modern, and user-friendly platform that brings football activities together.

## ✨ Key Features

### 🏟️ Football Field Booking
- Browse available football fields.
- Search and filter fields by location, price, and availability.
- View field details, images, and facilities.
- Book football fields at preferred times.

### ⚽ Open Games
- Discover football matches looking for additional players.
- Join existing open games.
- Connect with other football enthusiasts.

### 🏆 Tournaments
- Explore football tournaments.
- View tournament details.
- Register to participate in tournaments.

### 👥 User Roles

**Player**
- Explore and book football fields.
- Join open games.
- Participate in tournaments.

**Field Owner**
- Add and manage football fields.
- Manage field information and booking requests.

**Admin**
- Review signup requests and ownership documents.
- Approve, reject or deactivate accounts.
- Create and manage tournaments, team registrations and demo refunds.
- Manage platform activities.

---

## 🛠️ Technologies

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5

### Backend (Planned)
- C#
- ASP.NET
- SQL Server

### Development Tools
- Visual Studio Code
- Visual Studio
- Figma
- Git & GitHub

---

## 📱 Main Pages

- Home Page
- Login Page
- Football Fields Page
- Field Details Page
- Open Games Page
- Tournaments Page
- Field Owner Pages
- Admin Pages

---

## 🎨 Design Concept

KICKS focuses on delivering a modern football-inspired user experience through:

- Clean and responsive layouts.
- Football-themed visual elements.
- A consistent color palette.
- Easy navigation.
- Simple and intuitive interactions.

---

## 🚀 Project Status

🔨 **Under Development**

The project is currently being developed, starting with the frontend using HTML, CSS, and JavaScript.

Backend functionality and database integration are planned for future development stages.

## Database design and SQL

The proposed SQL Server schema matches the current team, booking, open-game,
split challenge payment, tournament, refund and messaging flows. The frontend
still stores records in the browser; it is not connected to SQL Server.

- [Interactive ER diagram, schema, table dictionary, SQL and rules](docs/database/database.html)
- [Standalone SQL Server script](database/KICKS-schema.sql)
- Source of truth: [database-data.js](docs/database/database-data.js)

The documentation uses only HTML, CSS and JavaScript, with no framework or build
step. Open `docs/database/database.html` directly, or serve the project locally.
For the sample environment, install Node.js, run `node scripts/demo-server.cjs`,
then open `http://127.0.0.1:5501/Pages/Demo/catalogue.html` and initialize an empty
demo profile through its setup controls. Existing records are not replaced.

After changing the schema source, regenerate the standalone SQL and validate it:

```sh
node scripts/export-database.cjs
node tests/database-schema-check.cjs
```

The SQL creates tables, keys, constraints and indexes in a **new, empty database**.
It contains no demo accounts, passwords or payment-card data. It is a schema,
not an import of browser records or an EF Core migration. Backend work will add
authentication, authorization and transactions for capacity, overlapping
activities, draw locking, share totals and refunds, as described in the Rules tab.

The current application is a frontend prototype with simulated payments and
browser-local authentication. Publishing its source on GitHub does not make it
a production booking or payment service. Local configuration files, database
backups and QA artifacts are excluded by `.gitignore`; the `.sql` source stays
included.

---

## 🎓 Academic Project

Developed as part of the Full-Stack Web Development training program at **Orange Coding Academy – Jordan**.

The project aims to apply web development concepts to a real-world problem through practical implementation.

---

## 👨‍💻 Developer

**Mohammad Azzam**

Computer Science Graduate | Aspiring Full-Stack Web Developer

---

### ⚽ KICKS — Your Game. Your Way.
