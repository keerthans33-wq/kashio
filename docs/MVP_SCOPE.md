# MVP Scope

This document defines exactly what is and is not included in the Kashio MVP.
Nothing outside this scope will be built until the MVP is complete and validated.

---

## In Scope

### 1. Authentication
- Users can sign up, log in, and log out
- Sessions are secure and persistent

### 2. Transaction Import (CSV)
- Users upload a CSV file exported from their bank
- Kashio parses and stores each transaction (date, amount, description)
- Supported columns: date, amount, description (order may vary; user maps on upload)
- Supported date formats: DD/MM/YYYY and YYYY-MM-DD
- Transactions outside the current financial year (1 July – 30 June) are excluded
- Duplicate rows (same date + amount + description) are silently skipped
- Credits and refunds are imported but not flagged as deduction candidates
- Invalid or unrecognised rows are shown to the user before import is confirmed

### 3. Transaction List
- Users can view all imported transactions
- Transactions are sorted by date
- Users can filter by date range and category

### 4. Merchant Normalisation
- Raw bank descriptions are cleaned into readable merchant names
- e.g. "AMZN*AB12CD SEATTLE" → "Amazon"

### 5. Deduction Detection (Basic Rules)
- Kashio flags transactions that match a fixed set of deduction rules
- Rules are based on common ATO work-related expense categories
- Flagged transactions become deduction candidates — not confirmed claims

### 6. Deduction Candidate Review
- Users review each flagged transaction
- Each candidate can be marked as: **Claim**, **Skip**, or **Unsure**
- Users can add a note to any candidate

### 7. Evidence Tracking
- For each claimed deduction, users can attach a receipt or invoice
- Kashio shows which claims are missing evidence
- Missing evidence is surfaced clearly before EOFY export

### 8. EOFY Export
- Users can export a summary of all claimed deductions
- Export includes: date, merchant, amount, category, notes, and evidence status
- Format: CSV

---

## Out of Scope

The following will **not** be built as part of the MVP:

| Feature | Reason |
|---|---|
| Bank integrations (Open Banking, Plaid, etc.) | Scope and compliance complexity — CSV first |
| Superannuation optimisation | Out of product scope entirely |
| Investment tracking | Out of product scope entirely |
| Cryptocurrency | Out of product scope entirely |
| Financial advice | Not permitted without a financial services licence |
| AI chatbot | Not needed to validate core value |
| AI-generated explanations | Adds vendor dependency and cost — deferred post-MVP |

---

## Definition of Done

The MVP is complete when a user can:
1. Sign up and log in
2. Upload a CSV of transactions
3. Review deduction candidates and mark them
4. Attach evidence to claimed deductions
5. Export a complete EOFY summary
