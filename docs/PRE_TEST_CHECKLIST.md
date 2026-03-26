# Kashio — Pre-Test Checklist

Run through this before sending the app to a tester.

---

## App

- [ ] App is deployed and accessible at the tester's URL
- [ ] No broken pages — open Import, Review, and Export in a browser
- [ ] No console errors on any of the three pages
- [ ] Dark mode renders correctly (if tester's system uses it)

## Data state

- [ ] Database is cleared before each new tester (`npm run seed:empty` from `apps/web`)
- [ ] Sample CSV files are downloadable — check `/samples/clean-sample.csv`, `/samples/mixed-realistic.csv`, `/samples/messy-import.csv`

## Import

- [ ] Upload `clean-sample.csv` — preview shows correct row count, import succeeds
- [ ] "Go to Review →" appears after a successful import
- [ ] Upload `messy-import.csv` — invalid rows are listed, valid rows still import

## Review

- [ ] Flagged transactions appear with category and reason
- [ ] Confirm deduction works — card moves to Confirmed section
- [ ] Reject works — card moves to Rejected section
- [ ] Undo works — card returns to Needs review
- [ ] Evidence checkbox toggles; note field saves
- [ ] "Go to Export →" appears once at least one deduction is confirmed

## Export

- [ ] Confirmed deductions appear in the export table
- [ ] Evidence ready / Needs evidence counts are correct
- [ ] Export CSV download works and opens correctly in a spreadsheet

## Feedback

- [ ] "Report an issue" link in footer opens a pre-filled email draft
- [ ] "Send feedback" link works
- [ ] You know where replies will land (check the inbox for `feedback@kashio.app`)

---

*Reset with `npm run seed:empty` between testers.*
