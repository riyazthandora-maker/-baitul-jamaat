-- Migration 030: Remove stored identity document data
--
-- Policy change: identity documents are used only transiently for OCR during
-- registration and are never stored. This migration clears existing data and
-- makes the columns nullable (they already are).
--
-- Run this once in production after deploying the updated registration flow.
-- Storage files in member-documents bucket (id_doc_front.*, id_doc_back.*)
-- should be deleted separately via the Supabase dashboard or storage API.

-- Null out identity document storage paths and sensitive ID fields
UPDATE members
SET
  id_doc_url      = NULL,
  id_doc_back_url = NULL,
  id_type         = NULL,
  id_last4        = NULL
WHERE
  id_doc_url IS NOT NULL
  OR id_doc_back_url IS NOT NULL
  OR id_type IS NOT NULL
  OR id_last4 IS NOT NULL;

-- Optional: drop the columns entirely once you confirm no code reads them.
-- Leaving them in place for now so existing active installs don't break.
-- When ready, run:
--   ALTER TABLE members DROP COLUMN IF EXISTS id_type;
--   ALTER TABLE members DROP COLUMN IF EXISTS id_last4;
--   ALTER TABLE members DROP COLUMN IF EXISTS id_doc_url;
--   ALTER TABLE members DROP COLUMN IF EXISTS id_doc_back_url;
