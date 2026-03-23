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
- Invalid or unrecognised rows are flagged clearly

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

### 8. Working-From-Home Hours Log
- Users can log the number of hours they worked from home each week
- This supports the ATO fixed-rate method for WFH deductions
- The log is included in the EOFY export

### 9. EOFY Export
- Users can export a summary of all claimed deductions
- Export includes: date, merchant, amount, category, notes, and evidence status
- Format: PDF and/or CSV

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

---

## Definition of Done

The MVP is complete when a user can:
1. Sign up and log in
2. Upload a CSV of transactions
3. Review deduction candidates and mark them
4. Attach evidence to claimed deductions
5. Log WFH hours
6. Export a complete EOFY summary
