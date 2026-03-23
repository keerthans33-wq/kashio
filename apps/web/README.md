# Kashio — Web App

Next.js frontend for Kashio, the Australian tax deduction tracker.

## Running locally

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run typecheck` | Check TypeScript types without building |
| `npm run lint` | Run ESLint |

## Folder conventions

```
app/
  (app)/          ← authenticated app pages (nav is shown)
    dashboard/
    transactions/
    opportunities/
    evidence/
    export/
  components/     ← shared UI components (Nav, etc.)
  layout.tsx      ← root layout: html/body only, no nav
  page.tsx        ← redirects / to /dashboard
lib/              ← non-UI logic: CSV parsing, rules, export
public/           ← static assets
```

**Rule of thumb:**
- UI that renders → `app/components/`
- Logic with no React → `lib/`
- Route pages stay thin — import from `lib/` for real work

## Stack

- [Next.js](https://nextjs.org) — React framework (App Router, server components by default)
- [TypeScript](https://www.typescriptlang.org) — type safety
- [Tailwind CSS](https://tailwindcss.com) — styling
