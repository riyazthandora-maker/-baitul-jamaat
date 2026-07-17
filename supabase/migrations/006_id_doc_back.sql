-- Add back-side document column to members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS id_doc_back_url TEXT;
