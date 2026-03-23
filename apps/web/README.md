# Kashio — Web App

Kashio is an Australian tax deduction tracker for employees.

It helps you find work-related tax deductions in your bank transactions, review them, attach evidence, and export a summary at the end of the financial year (EOFY).

---

## MVP scope

The current MVP covers three things:

1. **Import** — upload a CSV of bank transactions
2. **Review** — mark each flagged transaction as Claim, Skip, or Unsure
3. **Export** — download a CSV summary of your claimed deductions

That's it. Everything else is deferred until the core flow is working.

---

## Routes

| URL | What it is |
|---|---|
| `/` | Landing page — no nav, links to Import |
| `/import` | Upload a CSV file |
| `/review` | Review flagged deduction candidates |
| `/export` | Download your EOFY deduction summary |

---

## Running locally

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run typecheck` | Check TypeScript types without building |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (placeholder — no tests yet) |
| `npm run verify` | Run typecheck + lint + build (full health check) |

---

## Folder structure

```
app/
  (public)/           ← public pages (no nav)
    page.tsx          ← landing page at /
  (app)/              ← in-app pages (nav is shown)
    import/           ← /import
    review/           ← /review
    export/           ← /export
    layout.tsx        ← app shell: renders Nav
  components/
    shell/            ← layout components (Nav)
    ui/               ← reusable UI primitives (empty for now)
  layout.tsx          ← root layout: html/body only
  globals.css         ← Tailwind + base styles
lib/                  ← non-UI logic: CSV parsing, rules, formatting
public/               ← static assets
```

**Rule of thumb:**
- Pages stay thin — no business logic in route files
- UI components → `app/components/`
- Logic with no React → `lib/`

---

## Stack

- [Next.js](https://nextjs.org) — React framework (App Router, server components by default)
- [TypeScript](https://www.typescriptlang.org) — type safety
- [Tailwind CSS](https://tailwindcss.com) — styling

---

## Out of scope (for now)

These are intentionally not built yet:

- Authentication and user accounts
- Database or backend API
- Bank integrations (CSV only for now)
- AI-generated explanations
- Working-from-home hours log
- Mobile app
