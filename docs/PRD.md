# Product Requirements Document

## Overview

**Kashio** is a tax deduction tracker for Australian employees.

It helps users find, review, and record work-related tax deductions throughout the year — not just at tax time.

---

## The Problem

Most Australian employees:
- Forget to track deductions until June/July
- Lose receipts or forget what they were for
- Miss out on deductions they were entitled to claim

---

## The Solution

Kashio lets users:
1. Import their bank/card transactions
2. See which transactions might be tax-deductible
3. Review and confirm each deduction
4. Track when evidence (receipts, invoices) is missing
5. Export a clean summary at End of Financial Year (EOFY)

---

## Target User

**Australian employees** (salary or wages) who:
- Want to pay less tax legally
- Don't have an accountant managing their records
- Prefer to stay on top of deductions year-round

---

## Goals

- Make it easy to spot deductions in everyday spending
- Reduce the effort of gathering records at EOFY
- Give users confidence that they're not missing anything

---

## Non-Goals

The following are explicitly out of scope:
- Investments, shares, or dividends
- Superannuation
- Cryptocurrency
- Business or ABN income
- Tax lodgement or ATO integration

---

## Core Features

### 1. Import Transactions
Users upload a CSV file exported from their bank. Kashio reads the description, amount, and date of each transaction.

### 2. Detect Possible Deductions
Kashio scans transactions and flags ones that look work-related (e.g. office supplies, work travel, phone bills, subscriptions). These are suggestions — not confirmed deductions.

### 3. Review Deductions
Users go through flagged transactions one by one and mark each as:
- **Claim** — yes, this is deductible
- **Skip** — no, this is personal
- **Unsure** — come back to it later

### 4. Track Missing Evidence
For claimed deductions, Kashio shows whether a receipt or invoice has been attached. It reminds users when evidence is missing.

### 5. EOFY Export
At the end of the financial year, users can export a summary of all claimed deductions — including amounts, categories, and attached evidence — ready to hand to an accountant or use when lodging their return.

---

## Success Metrics

- Users claim at least one deduction they would have otherwise missed
- Users arrive at EOFY with all evidence already collected
- Users understand what each feature does without needing help

---

## Assumptions

- Users are Australian residents for tax purposes
- Deduction rules follow ATO guidelines for employees
- Users are responsible for the accuracy of their claims
