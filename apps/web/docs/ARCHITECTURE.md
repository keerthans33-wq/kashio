# Architecture

A plain-English explanation of how Kashio is built.

---

## Overview

Kashio is a web application. It has:
- A **frontend** that users interact with in their browser
- A **backend** that handles logic and data
- A **database** that stores everything
- **File storage** for receipts and invoices

All of these run together as a single Next.js application.

---

## Frontend

**Technology: Next.js (React)**

The frontend is what users see and click on. It is built with Next.js, which handles both the pages and the API.

Key pages:
- Import transactions (CSV upload or bank connection)
- Deduction review
- Evidence tracker
- EOFY export

---

## Backend

**Technology: Next.js API Routes**

The backend lives inside the same Next.js project, under `/api`. There is no separate server.

Key API routes:
- `/api/demo/connect` — load sample transactions and run the import pipeline
- `/api/basiq/connect` — start the Basiq Open Banking consent flow
- `/api/basiq/transactions` — fetch and import transactions from a connected Basiq account
- `/api/batches` — list and delete import batches
- `/api/transactions` — retrieve stored transactions
- `/api/deductions` — update deduction candidate status
- `/api/export` — generate the EOFY summary

---

## Transaction Ingestion

All transaction imports — whether from CSV, Demo Bank, or Basiq — go through a shared pipeline in `lib/importPipeline.ts`.

Each source has an **ingestion adapter** (`lib/ingestion/`) that maps raw data into a common `IngestionRow` shape before handing off to the pipeline:

```
CSV file       → fromCsvRow()   ┐
Demo dataset   → fromDemo()     ├── IngestionRow[] → runImportPipeline()
Basiq API      → fromBasiq()    ┘
```

The pipeline handles batch creation, deduplication, and deduction detection in one place regardless of source.

**Deduplication key:** `@@unique([date, description, amount])` — the same real-world transaction always produces the same key, so re-importing the same data is safe.

**Transaction sources** are tracked via the `TransactionSource` enum (`CSV | DEMO_BANK | BASIQ`) on both `Transaction` and `ImportBatch`.

---

## Database

**Technology: PostgreSQL + Prisma**

All data is stored in a PostgreSQL database. Prisma is used to read and write data in a safe, structured way.

Key models:
- `ImportBatch` — one record per import run, with source and inserted count
- `Transaction` — normalised bank transaction (date as YYYY-MM-DD, amount as float)
- `DeductionCandidate` — a transaction the rules engine flagged as a possible deduction
- `BasiqConnection` — stores the Basiq user ID for the connected bank account

---

## Deduction Detection

After each import, newly inserted transactions are run through a rules engine (`lib/rules.ts`). Rules match on merchant name, description keywords, and amount ranges to produce a `DeductionCandidate` with a category, confidence level, and short reason.

---

## File Storage

**Technology: S3-compatible object storage (e.g. Cloudflare R2 or AWS S3)**

When a user uploads a receipt or invoice, the file is stored in object storage — not in the database. The database stores a link (URL) to the file.

---

## How It All Fits Together

```
Browser
  └── Next.js Frontend (pages + components)
        └── Next.js API Routes (backend logic)
              ├── lib/ingestion/   (source adapters)
              ├── lib/importPipeline.ts  (shared import + dedup + rules)
              ├── lib/rules.ts     (deduction detection)
              ├── PostgreSQL via Prisma (data)
              └── Object Storage (receipts)
```

---

## What Is Not Included

- No separate backend server or microservices
- No mobile app
- No real-time features or websockets
- No AI or external language model integration (deferred post-MVP)
