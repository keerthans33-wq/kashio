# Architecture

A plain-English explanation of how Kashio is built.

---

## Overview

Kashio is a web application. It has:
- A **frontend** that users interact with in their browser
- A **backend** that handles logic and data
- A **database** that stores everything
- **File storage** for receipts and invoices
- **AI** to help explain deductions in plain language

All of these run together as a single Next.js application.

---

## Frontend

**Technology: Next.js (React)**

The frontend is what users see and click on. It is built with Next.js, which handles both the pages and the API.

Key pages:
- Sign up / log in
- Upload transactions (CSV)
- Transaction list
- Deduction review
- Evidence tracker
- WFH hours log
- EOFY export

---

## Backend

**Technology: Next.js API Routes**

The backend lives inside the same Next.js project, under `/api`. There is no separate server.

Each API route handles one job, for example:
- `/api/transactions` — save and retrieve transactions
- `/api/deductions` — detect and update deduction candidates
- `/api/export` — generate the EOFY summary

---

## Database

**Technology: PostgreSQL + Prisma**

All data is stored in a PostgreSQL database. Prisma is used to read and write data in a safe, structured way.

Key tables:
- `users` — accounts and login info
- `transactions` — imported bank transactions
- `deductions` — flagged deduction candidates and their status
- `evidence` — links between deductions and uploaded files
- `wfh_logs` — weekly working-from-home hour entries

---

## File Storage

**Technology: S3-compatible object storage (e.g. Cloudflare R2 or AWS S3)**

When a user uploads a receipt or invoice, the file is stored in object storage — not in the database.

The database stores a link (URL) to the file. The file itself lives in storage.

This keeps the database small and file uploads fast.

---

## AI

**Technology: Claude API (Anthropic)**

AI is used in one place only: generating a plain-English explanation of why a transaction was flagged as a possible deduction.

Example:
> "This looks like a software subscription. If you use it for work, you may be able to claim it."

AI does **not** make decisions. It does **not** confirm deductions. The user always reviews and decides.

---

## How It All Fits Together

```
Browser
  └── Next.js Frontend (pages + components)
        └── Next.js API Routes (backend logic)
              ├── PostgreSQL via Prisma (data)
              ├── Object Storage (receipts)
              └── Claude API (explanations)
```

---

## What Is Not Included

- No separate backend server or microservices
- No mobile app
- No real-time features or websockets
- No bank API integrations (CSV only for MVP)
