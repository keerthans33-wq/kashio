# Receipt & Pro Plan — Manual QA Checklist

Run these tests in the development environment against Stripe test mode.
Unit tests for the pure plan logic live in `lib/__tests__/plan.test.ts` (`npm test`).

## Setup

- Use two separate browser profiles (or incognito + normal) to test as two different users.
- Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.
- The `?dev_unlock=1` query param on `/export` bypasses the export paywall in development.
  Do NOT use it for these tests — you need the real gate to fire.

---

## Receipt upload

### 1. Free user — first receipt

1. Sign in as a free user (no prior payment).
2. Tap the receipt FAB (bottom-right).
3. Tap **Upload** in the drawer.
4. Select a valid image file under 5 MB.

**Expected:** Receipt appears in the drawer list. Usage indicator updates to "1 of 5 free receipts used".

---

### 2. Free user — 5 receipts (boundary)

1. Upload receipts 2, 3, 4, and 5 (repeat scenario 1).
2. After the 5th upload, check the usage indicator.

**Expected:** 5th upload succeeds. Usage shows "5 of 5 free receipts used". Upload button still visible.

---

### 3. Free user — 6th receipt triggers paywall

1. With 5 receipts already uploaded, tap **Upload** and select a file.

**Expected:**
- The upload request returns HTTP 402.
- The Pro paywall modal opens (title: "Unlock full receipt storage").
- No new receipt appears in the list.

---

### 4. Pro user — uploads past the free limit

1. Complete a Stripe test payment (scenario 9 or 10 will set this up).
2. As a Pro user who already has 5 receipts, tap **Upload** and select a file.

**Expected:** Upload succeeds. Usage shows "6 of 100 receipts used".

---

### 5. Pro user — 100-receipt cap (internal limit)

> This is an edge case unlikely to occur in testing. Verify the logic via unit tests.
> To confirm manually: use `prisma studio` or a DB query to insert 100 receipt rows
> for a Pro user, then attempt upload 101.

**Expected:** Upload is blocked. The paywall modal opens with Pro messaging ("Pro accounts are limited to 100 receipts").

---

## File validation

### 6. Invalid file type

1. Tap **Upload** and select a `.txt`, `.gif`, or `.mp4` file.

**Expected:**
- Upload does not proceed.
- Error toast: "Only JPEG, PNG, WebP, and PDF files are accepted."
- No receipt row added.

---

### 7. File over 5 MB

1. Tap **Upload** and select any file larger than 5 MB.

**Expected:**
- Upload does not proceed.
- Error toast: "File must be 5 MB or smaller."
- No receipt row added.

> Tip: Use a raw `.bmp` or uncompressed TIFF to get a large file, or use a PDF with embedded images.

---

## Export paywall

### 8. Export paywall still works for free users

1. Sign in as a free user.
2. Navigate to `/export`.

**Expected:** Paywall card appears (lock icon, "Unlock your tax summary", $19.99 button). Breakdown is blurred.

---

## Shared Pro unlock

### 9. Upgrading from Export unlocks Receipts

1. As a free user, go to `/export` and click **Unlock report**.
2. Complete Stripe test checkout.
3. Land on `/payment/success` — confirm it shows success.
4. Navigate back to `/export` — confirm the full breakdown is visible.
5. Open the receipt drawer.

**Expected:**
- Export is unlocked (no paywall).
- Receipt usage shows "X of 100 receipts used" (Pro limit).
- Uploading a 6th receipt succeeds.

---

### 10. Upgrading from Receipts unlocks Export

1. As a fresh free user with 5 receipts, attempt a 6th upload.
2. The Pro paywall modal opens — click **Upgrade to Pro – $19.99**.
3. Complete Stripe test checkout.
4. Land on `/payment/success` — confirm it shows success.
5. Navigate to `/export`.

**Expected:**
- Export is fully unlocked (no paywall visible).
- Receipt usage shows Pro limit (100).

---

## Data isolation

### 11. User can only see their own receipts

1. As **User A**, upload 2 receipts. Note the file names.
2. Sign out. Sign in as **User B** (different account, no receipts).
3. Open the receipt drawer.

**Expected:** The drawer shows "No receipts yet". User A's files are not visible.

---

### 12. User cannot access another user's storage path

1. As **User A**, upload a receipt. Note the `filePath` from the DB
   (format: `{userA_id}/{timestamp}-{filename}`).
2. Sign in as **User B**.
3. Attempt to call `DELETE /api/receipts/{receipt_id_belonging_to_user_a}` directly
   (e.g. via `curl` or browser dev tools).

**Expected:** API returns HTTP 403 Forbidden. User B cannot delete User A's receipt.

4. Attempt to read the storage object directly via the Supabase Storage URL for User A's file.

**Expected:** Storage returns 400 or 403 — the bucket is private and RLS prevents
cross-user reads (policy: `auth.uid() = user_id`).

---

## After all scenarios

- [ ] Stripe dashboard → no unexpected live-mode charges occurred.
- [ ] Supabase Storage → `receipts/` bucket shows only test files.
- [ ] Supabase DB → `UserEntitlement` rows exist only for users who paid.
- [ ] Clean up test receipts from storage manually if needed.
