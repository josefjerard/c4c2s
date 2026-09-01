# C2S — Mentee Management System

A web app for managing mentees and mentor accounts, with a live Google Sheets / Google Apps Script backend.

## Live preview

GitHub Pages: https://josefjerard.github.io/c4c2s/

## Pages

- **Login** (`login.html`) — mentors sign in with their Worker ID and password. Worker ID `1990` / password opens the admin dashboard.
- **Register** (`register.html`) — create a mentor account (Full Name, Gender, Worker ID, Password, Confirm Password). Worker ID must be unique.
- **Mentor app** (`index.html`) — the per-mentor mentee workspace: dashboard stats, live search, status filter, mentee table (name, status, potential mentor, remarks).
- **Add / Edit mentee** (`create.html`, `edit.html`) — full mentee form.
- **Mentee details** (`view.html`) — view-only detail of a mentee (all fields).
- **Admin dashboard** (`admin.html`) — shows total mentors, total mentees, and total members, plus clickable **GWAPO** (male) and **GORGEOUS** (female) cards that link to the mentor lists.
- **Mentors by gender** (`mentors.html?gender=male` / `?gender=female`) — lists GWAPO (male) or GORGEOUS (female) mentors; each mentor shows their gender, Worker ID, password, and expandable mentees.
- **Settings** (`settings.html`) — dark/light mode and account information (edit full name, Worker ID, and password).

## Authentication

- Login requires a **Worker ID** and **password**.
- Registration requires **Full Name**, **Gender**, **Worker ID**, **Password** (min 8 chars), and **Confirm Password**.
- The admin account (Worker ID `1990`) is reserved, separate from normal mentors, and only used to access the admin dashboard.
- Mentors are cached in `localStorage` so login works even if the Apps Script backend is temporarily unreachable.

## Data storage

Data is stored in a Google Spreadsheet accessed through Google Apps Script (`gas/Code.gs`).

The spreadsheet has two sheets:

- **Mentors** — columns: `workerID | name | gender | password`
- **Mentees** — columns: `id | name | status | contact | birthday | address | cldp1 | cldp2 | cldp3 | module | moduleLesson | potentialMentor | c2s101 | otherTrainings | remarks | mentor | createdAt | updatedAt`

The Apps Script endpoint is configured as `GAS_URL` in `assets/app.js`. Mentors/mentees are also cached in `localStorage` keys:

| Key | Purpose |
| --- | --- |
| `c2s_mentees` | All mentees |
| `c2s_mentors` | Mentor accounts |
| `c2s_theme` | Theme preference (light/dark) |

## Project structure

```
C2S/
├── index.html          Mentor dashboard (list, search, filter)
├── create.html         Add mentee form
├── edit.html           Edit mentee form
├── view.html           Mentee detail (read-only when accessed from admin)
├── admin.html          Admin dashboard (stats + GWAPO/GORGEOUS cards)
├── mentors.html        Mentor list by gender (mentors.html?gender=male|female)
├── settings.html       Settings (theme, account info)
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
- Admin dashboard: total mentors, total mentees, total members, plus clickable GWAPO/GORGEOUS cards that open the mentor lists by gender
- Settings: edit own account information (full name, Worker ID, password); changing Worker ID reassigns the mentor's mentees
- Dark mode / light mode toggle
