# Kashio — Claude Instructions

## What Kashio Is

Kashio helps Australians find and track potential tax deductions from everyday transactions. It turns raw bank transaction data into clear, reviewable insights and export-ready reports for tax time.

Primary users: employees, contractors/freelancers, and sole traders.

## Product Structure

- `kashio.com.au` — marketing website (education, trust, conversion)
- `app.kashio.com.au` — the actual product web app
- All primary CTAs on the marketing website point to `https://app.kashio.com.au`
- The marketing site and web app should feel like the same product family visually

## Critical Product Rules

- **Review page = discovery and decision-making only.** Users explore and confirm/reject deduction candidates here.
- **Export page = final premium tax summary.** Must feel more complete and more valuable than Review. Do not mix the two purposes.
- Preserve the Review/Export distinction in any product preview section on the marketing website.
- The rules engine is the sole deduction detection layer.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide icons
- Prisma + Supabase

## Visual Direction

Premium fintech. Minimal, mobile-first, high trust, modern but calm.

- Dark UI — deep navy / near-black background with green accent
- Soft aurora glow allowed
- Refined cards with strong typography hierarchy
- Spacious layouts, not cramped
- Clear, confident CTA buttons
- No loud crypto-style visuals
- No generic startup template aesthetics
- No overly playful consumer-app feel
- Avoid clutter and competing visual ideas

## UX Rules

Keep cognitive load low. Users should understand Kashio fast:

- What it does
- Who it is for
- How it works
- Why they should trust it
- What to do next

Prioritise clarity over decoration.

## Coding Preferences

- Keep components modular and focused — avoid large files that mix concerns
- Use semantic, descriptive naming
- Mobile-first responsive design from the start
- Accessible markup
- Keep Tailwind classes clean and consistent with the existing design system
- Match the tone of existing copy: short, plain, hedged, trustworthy
