# Project: Kashio

This is a Next.js (App Router) project using:
- Supabase for authentication
- Prisma for database
- TypeScript

## What you should do
- Help debug and fix issues in the codebase
- Suggest minimal, clean fixes
- Do not overcomplicate solutions

## Rules
- Do not break existing functionality
- Follow existing file structure
- Keep changes small and focused

## Common tasks
- Fix auth/session bugs
- Debug redirect issues
- Improve React components

## Database rules — NEVER break these
- ALL schema changes (tables, indexes, triggers, functions) must go through a Prisma migration file in `prisma/migrations/`. Never use the Supabase SQL editor or dashboard for permanent schema changes.
- `prisma migrate deploy` runs automatically on every Vercel deploy (see build script). If it's not in a migration file, it doesn't exist from the app's perspective and will be lost.
- Never create a trigger on `auth.users` that can throw. Any trigger function touching auth must use `ON CONFLICT DO NOTHING` and wrap its body in `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END` so a failure never blocks sign-up or sign-in.
- The `/api/debug` GET endpoint includes a `dangerousTriggers` field — check it if sign-ups start failing.
