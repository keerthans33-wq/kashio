# Kashio — Tester Walkthrough

Thanks for testing Kashio. This should take around 5–10 minutes.

Kashio helps you find possible work-related tax deductions in your bank transactions. You import a bank CSV, review what Kashio flagged, mark your receipts, and download a summary for your accountant.

---

## Before you start

Download one of the sample CSV files to use during testing:

- [clean-sample.csv](/samples/clean-sample.csv) — a simple, clean file. Good for your first run.
- [mixed-realistic.csv](/samples/mixed-realistic.csv) — a fuller month of transactions with a realistic mix of work and personal spending.
- [messy-import.csv](/samples/messy-import.csv) — a file with some invalid rows, to see how the importer handles errors.

Start with **clean-sample.csv** if you're not sure.

---

## Step 1 — Import

1. Go to **Import** (or click the logo to go to the home page, then click **Import your bank CSV**).
2. Click **Choose file** and select the CSV you downloaded.
3. Click **Preview CSV**. You should see a summary showing how many rows were read.
4. Click **Import N transactions**.
5. Once the import completes, click **Go to Review →**.

**Things to notice:**
- Does the summary make sense? Does it tell you what was found?
- If you use the messy file, do the error messages help you understand what went wrong?

---

## Step 2 — Review

You'll see a list of transactions Kashio flagged as possible deductions. Each card shows the merchant, amount, category, and why it was flagged.

1. Read through a few cards. Do the reasons make sense?
2. For transactions that are clearly work-related, click **Confirm deduction**.
3. For transactions that are personal, click **Reject**.
4. If you change your mind, click **Undo** to reset a card.

You can also select multiple cards using the checkboxes and use **Confirm all** or **Reject all** to move through them faster.

**Things to notice:**
- Are the flagged transactions reasonable? Any obvious mistakes?
- Is the confidence level (High / Medium / Low) helpful?
- Does the "Why flagged" reason make sense in plain English?

---

## Step 3 — Evidence readiness

Once you've confirmed a deduction, a section appears on the card asking about receipts.

1. For a confirmed item, tick **I have a receipt or invoice**.
2. Optionally add a note in the text field, like *"Bunnings receipt — Feb 2025"*.
3. Leave a few confirmed items without evidence — this tests the Export view.

**Things to notice:**
- Is it clear what "evidence" means and why it matters?
- Does the feedback after ticking the checkbox make sense?

---

## Step 4 — Export

Once you've reviewed and confirmed some deductions:

1. Click **Go to Export →** at the top of the Review page (or navigate to **Export** in the nav).
2. You'll see a summary of your confirmed deductions split into **Evidence ready** and **Needs evidence**.
3. When you're ready, click **Export CSV** to download your deductions.

**Things to notice:**
- Is it clear which items are ready and which still need receipts?
- Does the CSV file look right when you open it?
- Is it obvious what to do next if some items are still missing evidence?

---

## Feedback

If anything felt confusing, broken, or could be clearer — please send a note using the **Send feedback** link at the bottom of any page.

Specific, honest feedback is the most useful: *"I wasn't sure what to do after importing"* is more helpful than *"looks good"*.

Thank you.
