-- Add duplicate detection columns to members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS duplicate_flag TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_reason TEXT;

-- Storage bucket for member documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-documents', 'member-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can read their masjid's folder; service role bypasses RLS for writes
CREATE POLICY "super_admin: read all member documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'member-documents'
    AND auth_role() = 'super_admin'
  );

CREATE POLICY "masjid_admin: read own masjid documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'member-documents'
    AND auth_role() = 'masjid_admin'
    AND (storage.foldername(name))[1] = auth_masjid_id()::text
  );

CREATE POLICY "member: read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'member-documents'
    AND auth_role() = 'member'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
