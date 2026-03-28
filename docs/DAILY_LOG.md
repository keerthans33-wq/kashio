# Daily Log

## Template

### YYYY-MM-DD
-

---

## Day 2 — 2026-03-23

**Goal:** Define product clearly

**What I did:**
- Created PRD
- Defined MVP scope
- Created taxonomy
- Defined architecture
- Reviewed with Codex

**What I learned:**
- Importance of scope
- What Kashio actually is

**Next step:** Start building app (Day 3)

---

## Day 3 — 2026-03-23

**Goal:** Build first working app

**What I did:**
- Created Next.js app
- Ran app locally
- Added basic pages
- Reviewed with Codex

**What I learned:**
- How frontend works
- How to run local app

**Next step:** Start backend + database

---

## Day 4 — 2026-03-24

**Goal:** Refactor the app structure to match the real MVP flow

**What I did:**
- Separated public pages from in-app pages
- Reduced top-level navigation
- Simplified styling
- Added shell/ui component structure
- Added lib folder for future shared logic
- Improved package scripts
- Expanded README
- Reviewed refactor with Codex

**What I learned:**
- Route structure should reflect the real user journey
- Public and app layouts should be separate
- Shared logic should not live inside page files
- Simpler structure now will make future work easier

**Next step:** Start building real product behavior, beginning with CSV import flow

---

## Day 5 — 2026-03-24

**Goal:** Build CSV import feature

**What I did:**
- Defined CSV format
- Built upload UI
- Parsed CSV
- Added validation
- Showed preview table
- Added normalization
- Reviewed with Codex

**What I learned:**
- CSV parsing complexity
- Importance of validation
- Handling messy data

**Next step:** Store transactions in database

---

## Day 6 — 2026-03-24

**Goal:** Make CSV import robust and store transactions

**What I did:**
- Fixed parser error handling
- Improved column validation
- Added real date validation
- Improved amount parsing
- Improved empty row handling
- Improved preview UX
- Separated validation and normalization
- Set up database
- Saved transactions
- Built transactions page
- Reviewed with Codex

**What I learned:**
- Real-world data is messy
- Validation is critical
- Separation of concerns matters
- Database integration basics

**Next step:** Build deduction detection system

---

## Day 8 — 2026-03-25

**Goal:** Build first deduction detection system

**What I did:**
- Created DeductionCandidate model
- Built rules engine structure
- Implemented work software rule
- Generated candidates after import
- Displayed candidates in review page
- Added confirm/reject actions
- Reviewed rules with Codex

**What I learned:**
- How rules engine works
- How to detect patterns in transactions
- Importance of deterministic logic

**Next step:** Add more deduction rules and improve accuracy

---

## Day 7 — 2026-03-24

**Goal:** Make CSV import trustworthy end to end

**What I did:**
- Added strict server-side validation
- Created shared parsing and normalization logic
- Canonicalized stored dates
- Unified amount parsing
- Improved duplicate reporting
- Improved client fetch error handling
- Improved row numbering
- Improved parse error reporting
- Reviewed the pipeline again with Codex

**What I learned:**
- Client validation is not enough
- Server validation protects data integrity
- Canonical data formats make sorting and duplicate detection reliable
- Silent duplicate handling damages trust

**Next step:** Start the first deduction detection rules on top of imported transactions

---

## Day 18 — 2026-03-26

**Goal:** Prepare Kashio for first real user testing

**What I did:**
- Froze testing scope for MVP
- Created realistic sample CSV files
- Prepared demo/test states
- Created a tester walkthrough
- Created feedback questionnaire
- Added lightweight tester guidance to the app
- Improved recoverability for common mistakes
- Added a simple issue-reporting path
- Created a pre-test checklist
- Defined the top learning goals for early tests
- Reviewed test readiness with Codex
- Prepared first tester outreach materials

**What I learned:**
- Testing readiness is different from feature readiness
- Sample data and clear instructions matter a lot
- I need to know what I want to learn before asking for feedback

**Next step:** Run the first real tests and collect structured feedback

---

## Day 23 — 2026-03-28

**Goal:** Prepare Kashio for future Open Banking by adding a reusable bank-like ingestion flow

**What I did:**
- Added transaction source tracking (`CSV | DEMO_BANK | BASIQ`)
- Created a shared transaction ingestion adapter (`lib/ingestion/`)
- Added a `DEMO_BANK` source with 33 realistic Australian transactions
- Added a Connect Bank (Demo) flow on the Import page
- Added sync states (connecting → syncing → complete → failed)
- Reused the existing validation, storage, and deduction pipeline
- Added last-synced tracking for the demo bank
- Improved source visibility in the imported batches list
- Reviewed the architecture with Codex

**What I learned:**
- Open Banking is just another transaction input source
- Shared ingestion architecture makes future integration easier
- I can keep moving without waiting for Basiq approval

**Next step:** Polish the sync experience and prepare the system for real provider integration
