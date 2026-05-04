-- Create the receipts storage bucket
-- private=true, 5 MB limit, image and PDF only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS policies ───────────────────────────────────────────────────────
-- Enforce receipts/{user_id}/filename path ownership.
-- storage.foldername(name) splits the object path by "/" and returns an array,
-- so element [1] is the first path segment — the user_id folder.

CREATE POLICY "receipts_storage_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "receipts_storage_read_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "receipts_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
