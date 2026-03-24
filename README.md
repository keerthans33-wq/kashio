# Kashio

Kashio is an Australian tax deduction tracker for employees. You upload your bank CSV, review your transactions, and export a deduction report for your accountant.

---

## Getting started

```bash
cd apps/web
cp .env.example .env        # add your DATABASE_URL
npx prisma migrate dev       # create the database tables
npm run dev                  # start the app at localhost:3000
```

---

## CSV import

### Supported columns

Your CSV must contain these three columns (case-insensitive):

| Column | Required | Description |
|---|---|---|
| `date` | Yes | Transaction date |
| `description` | Yes | Raw bank description |
| `amount` | Yes | Transaction amount |

Any other columns in the file are ignored.

If your CSV does not have headers — or has different header names — Kashio shows a column mapper so you can select which column is which manually.

### Date formats

Two formats are accepted:

| Format | Example |
|---|---|
| `DD/MM/YYYY` | `15/07/2025` |
| `YYYY-MM-DD` | `2025-07-15` |

Dates are validated as real calendar dates — `31/02/2025` will be rejected. All dates are stored as `YYYY-MM-DD` internally.

### Amount parsing

Kashio strips `$` and `,` before parsing, so all of these are valid:

```
-42.50
$120.00
-$99.00
1,234.56
```

Debits (money out) should be negative. Credits (money in) should be positive.

Strings that cannot be fully parsed as a number — like `12abc` or `(45.00)` — are rejected.

### Duplicates

A transaction is a duplicate if another row with the same `date + description + amount` already exists in the database. Duplicates are skipped on insert and reported in the import summary — they are not counted as successful imports.

### Invalid rows

If a row fails validation, it is skipped and the reason is shown in the UI (e.g. "Row 4: Invalid date '32/01/2025'"). Valid rows in the same file are still imported. The import summary shows exactly how many rows were inserted, skipped as duplicates, and rejected as invalid.

---

## Project structure

```
apps/
  web/          Next.js app (import, review, export)
docs/           Product and architecture docs
packages/       Shared packages (future use)
```
