# Kashio — Claude Instructions

## What Kashio Is

Kashio helps Australians find and track potential tax deductions from everyday transactions. It turns raw bank transaction data into clear, reviewable insights and export-ready reports for tax time.

Primary users: employees, contractors/freelancers, and sole traders.

## Product Structure

- `kashio.com.au` — marketing website (education, trust, conversion)
- `app.kashio.com.au` — the actual product web app
- All primary CTAs on the marketing website point to `https://app.kashio.com.au`

## Critical Product Rules

- **Review page = discovery and decision-making only.** Users explore and confirm/reject deduction candidates here.
- **Export page = final premium tax summary.** Must feel more complete and more valuable than Review. Do not mix the two purposes.
- The rules engine is always primary. Ollama is an optional secondary refinement layer — Kashio must work fully without it.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide icons
- Prisma + Supabase

## Design Direction

Premium fintech. Minimal, mobile-first, high trust, modern but calm.

- Soft gradients and aurora backgrounds are allowed
- Strong typography hierarchy
- Spacious layouts and refined cards
- Clear, confident CTA buttons
- No loud crypto-style visuals
- No overly playful consumer-app aesthetics

## UX Rules

Keep cognitive load low. Users should understand Kashio fast:

- What it does
- Who it is for
- How it works
- Why they should trust it
- What to do next

## Coding Preferences

- Keep components modular and focused — avoid large files that mix concerns
- Use semantic, descriptive naming
- Mobile-first responsive design from the start
- Accessible markup
- Keep Tailwind classes clean and consistent with the existing design system
- Match the tone of existing explanations: short, plain, hedged, trustworthy
