# C2S — Mentee Management System (Frontend Prototype)

A static (HTML/CSS/JS) frontend for a mentee management system. This is the **frontend-only** stage — no PHP, MySQL, or login yet. Data is stored in the browser's `localStorage`.

## Live preview

GitHub Pages: https://josefjerard.github.io/c4c2s/

## Pages

- **Mentor app** (`index.html`) — the per-mentor mentee workspace: dashboard stats, live search, status filter, mentee table (name, status, potential mentor, remarks).
- **Add / Edit mentee** (`create.html`, `edit.html`) — full mentee form.
- **Mentee details** (`view.html`) — view-only detail of a mentee (all fields).
- **Admin dashboard** (`admin.html`) — overview of registered mentors, their emails/passwords and mentee counts. Mentor accounts are clickable to reveal their mentees; mentee names open in read-only view mode.
- **Settings** (`settings.html`) — dark/light mode, Gmail SMTP notification placeholders.

## Data (localStorage)

Everything is stored in the browser's local storage — no backend required.

| Key | Purpose |
| --- | --- |
| `c2s_mentees` | All mentees |
| `c2s_mentors` | Mentor accounts |
| `c2s_theme` | Theme preference (light/dark) |
| `c2s_smtp` | Gmail SMTP settings |

Sample/seed data is defined in `assets/app.js`:
- `SAMPLE_MENTEES` — 8 demo mentees with full details, scattered across the mentor accounts.
- `SAMPLE_MENTORS` — demo mentor accounts (with passwords). The `admin` account is reserved for the admin dashboard and is not treated as a mentor.

If local storage is empty (or has no mentees), the sample data is seeded automatically on load.

## Project structure

```
C2S/
├── index.html          Mentor dashboard (list, search, filter)
├── create.html         Add mentee form
├── edit.html           Edit mentee form
├── view.html           Mentee detail (read-only when accessed from admin)
├── admin.html          Admin dashboard (mentor overview)
├── settings.html       Settings (theme, SMTP)
├── data/
│   └── mentors.csv     Mentor accounts (CSV, currently unused by static build)
└── assets/
    ├── style.css       Styling (light + dark mode)
    └── app.js          All logic (localStorage CRUD, search, filter, admin, theme)
```

## Features

- Add, edit, delete mentees
- Fields: mentee name, status, contact number, birthday, address, CLDP 1–3, module/lesson picker (24 combined options), potential mentor (Yes/No), C2S 101, other trainings, remarks
- Module/Lesson picker shows combined labels, e.g. "Module 1 - Lesson 2"
- Age computed automatically from birthday
- Contact number: exactly 11 digits starting with `09`
- Dashboard stats, live search, status filter
- Admin dashboard: total mentors, total mentees, total members; mentor accounts expandable to show mentees
- Dark mode / light mode toggle

## Roadmap (backend, not yet implemented)

- PHP + MySQL with a `c2s` database (`users` + `mentees` tables)
- Login (admin opens the admin dashboard; mentors open their own mentee workspace)
- Each mentor gets a private workspace; mentees are private per account
- Gmail SMTP email notifications when mentors create/update/delete mentees
