# CSV Format

This document defines the CSV format Kashio accepts for transaction import.

Kashio supports one format only. Users must export from their bank and map columns on upload.

---

## Required columns

| Column | Type | Description |
|---|---|---|
| `date` | Date | When the transaction occurred |
| `description` | String | The transaction description from your bank |
| `amount` | Number | The transaction amount |

---

## Optional columns

| Column | Type | Description |
|---|---|---|
| `category` | String | A category label from your bank (ignored if blank) |

Any other columns in the file are ignored.

---

## Amount rules

- Debits (money out) must be **negative**: `-45.00`
- Credits (money in) must be **positive**: `120.00`
- Do not include currency symbols: `45.00` not `$45.00`
- Use a decimal point, not a comma: `45.00` not `45,00`

---

## Date rules

- Accepted formats: `DD/MM/YYYY` or `YYYY-MM-DD`
- Transactions outside the current Australian financial year (1 July – 30 June) are excluded
- The date must be a real calendar date

---

## File rules

- File must be `.csv`
- First row must be a header row with column names
- Column names are case-insensitive: `Date`, `DATE`, and `date` all work
- Delimiter must be a comma `,`
- Encoding must be UTF-8
- Duplicate rows (same date + description + amount) are skipped silently
- Credits and refunds are imported but will not be flagged as deduction candidates

---

## Example

```csv
date,description,amount
15/07/2025,OFFICEWORKS SYDNEY,-42.95
16/07/2025,SALARY CREDIT,5200.00
18/07/2025,ADOBE CREATIVE CLOUD,-54.99
20/07/2025,WOOLWORTHS 0123,-87.30
22/07/2025,ZOOM COMMUNICATIONS,-21.99
```

---

## Common errors

| Error | Cause | Fix |
|---|---|---|
| Missing required column | `date`, `description`, or `amount` column not found | Check column names in your CSV header |
| Invalid date | Date cannot be parsed | Use `DD/MM/YYYY` or `YYYY-MM-DD` |
| Invalid amount | Amount contains a symbol or comma | Remove `$` signs and use `.` as decimal separator |
| Wrong file type | File is not a `.csv` | Export as CSV from your bank |
