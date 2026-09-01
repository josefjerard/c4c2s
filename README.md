# C2S — Mentee Management System

A web app for managing mentees and mentor accounts, with a live Google Sheets / Google Apps Script backend.

## Live preview

GitHub Pages: https://josefjerard.github.io/c4c2s/

## Pages

- **Login** (`login.html`) — mentors sign in with their Worker ID and password. `admin` / password opens the admin dashboard.
- **Register** (`register.html`) — create a mentor account (Full Name, Worker ID, Password, Confirm Password). Worker ID must be unique.
- **Mentor app** (`index.html`) — the per-mentor mentee workspace: dashboard stats, live search, status filter, mentee table (name, status, potential mentor, remarks).
- **Add / Edit mentee** (`create.html`, `edit.html`) — full mentee form.
- **Mentee details** (`view.html`) — view-only detail of a mentee (all fields).
- **Admin dashboard** (`admin.html`) — overview of registered mentors (Worker ID, email, password) and mentee counts. Mentor accounts are clickable to reveal their mentees; mentee names open in read-only view mode.
- **Settings** (`settings.html`) — dark/light mode, Gmail SMTP notification settings.

## Authentication

- Login requires a **Worker ID** and **password**.
- Registration requires **Full Name**, **Worker ID**, **Password** (min 8 chars), and **Confirm Password**.
- The `admin` account is reserved and only used to access the admin dashboard.
- Mentors are cached in `localStorage` so login works even if the Apps Script backend is temporarily unreachable.

## Data storage

Data is stored in a Google Spreadsheet accessed through Google Apps Script (`gas/Code.gs`).

The spreadsheet has two sheets:

- **Mentors** — columns: `workerID | name | email | password`
- **Mentees** — columns: `id | name | status | contact | birthday | address | cldp1 | cldp2 | cldp3 | module | moduleLesson | potentialMentor | c2s101 | otherTrainings | remarks | mentor | createdAt | updatedAt`

The Apps Script endpoint is configured as `GAS_URL` in `assets/app.js`. Mentors/mentees are also cached in `localStorage` keys:

| Key | Purpose |
| --- | --- |
| `c2s_mentees` | All mentees |
| `c2s_mentors` | Mentor accounts |
| `c2s_theme` | Theme preference (light/dark) |
| `c2s_smtp` | Gmail SMTP settings |

## Project structure

```
C2S/
├── index.html          Mentor dashboard (list, search, filter)
├── create.html         Add mentee form
├── edit.html           Edit mentee form
├── view.html           Mentee detail (read-only when accessed from admin)
├── admin.html          Admin dashboard (mentor overview)
├── settings.html       Settings (theme, SMTP)
├── login.html          Login (Worker ID + password)
├── register.html       Register mentor account
├── data/
│   └── mentors.csv     Sample mentor accounts (CSV, currently unused by static build)
├── gas/
│   └── Code.gs         Google Apps Script backend (Google Sheets storage)
└── assets/
    ├── style.css       Styling (light + dark mode)
    └── app.js          All logic (auth, CRUD, search, filter, admin, theme)
```

## Features

- Login / registration with Worker ID
- Add, edit, delete mentees
- Fields: mentee name, status, contact number, birthday, address, CLDP 1–3, module/lesson picker (24 combined options), potential mentor (Yes/No), C2S 101, other trainings, remarks
- Module/Lesson picker shows combined labels, e.g. "Module 1 - Lesson 2"
- Age computed automatically from birthday
- Contact number: exactly 11 digits starting with `09`
- Dashboard stats, live search, status filter
- Admin dashboard: total mentors, total mentees, total members; mentor accounts expandable to show mentees
- Dark mode / light mode toggle

## Roadmap (not yet implemented)

- Gmail SMTP email notifications when mentors create/update/delete mentees (partially wired in Settings)
