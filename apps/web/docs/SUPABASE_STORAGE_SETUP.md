# Supabase Storage — receipts bucket

The bucket and its policies are created by the SQL migration at:
`prisma/migrations/20260504000001_add_receipts_storage/migration.sql`

Run it via the Supabase SQL editor or `prisma migrate deploy`.

---

## If you need to set it up manually in the Supabase dashboard

### 1. Create the bucket

1. Go to **Storage** in the sidebar
2. Click **New bucket**
3. Name: `receipts`
4. Toggle **Public bucket** OFF (private)
5. Under **Additional configuration** set:
   - Max upload size: `5 MB`
   - Allowed MIME types: `image/jpeg, image/png, image/webp, application/pdf`
6. Click **Save**

### 2. Add storage policies

Go to **Storage → Policies** and add the following three policies on the `objects` table.

#### Upload (INSERT)

| Field | Value |
|-------|-------|
| Policy name | `receipts_storage_upload_own` |
| Operation | INSERT |
| Target roles | `authenticated` |
| WITH CHECK expression | `bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text` |

#### Read (SELECT)

| Field | Value |
|-------|-------|
| Policy name | `receipts_storage_read_own` |
| Operation | SELECT |
| Target roles | `authenticated` |
| USING expression | `bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text` |

#### Delete (DELETE)

| Field | Value |
|-------|-------|
| Policy name | `receipts_storage_delete_own` |
| Operation | DELETE |
| Target roles | `authenticated` |
| USING expression | `bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text` |

---

## How the path enforcement works

Files must be uploaded to `receipts/{user_id}/filename`.

`storage.foldername(name)` splits the object path by `/` and returns an array.
Element `[1]` is the first segment — the `{user_id}` folder — and the policy checks
it equals the authenticated user's UUID. Any upload or read attempt outside the
user's own folder is rejected by Supabase before it reaches the app.

---

## Environment variable needed

The upload route needs the Supabase service-role key to bypass RLS when writing
server-side. Add to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do not expose this key to the browser.
