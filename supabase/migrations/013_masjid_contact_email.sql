-- Real contact email for the masjid admin, used for all notification emails.
-- Nullable so existing rows are unaffected; populated on creation.
ALTER TABLE masjids ADD COLUMN IF NOT EXISTS contact_email TEXT;
