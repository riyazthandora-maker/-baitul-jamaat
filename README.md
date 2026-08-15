# Baitul Jamaat

Masjid Membership & Donation Management System — multi-tenant, mobile-first, built for non-technical users. [DEV branch test]

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend / Backend | Next.js 14 (App Router, TypeScript, Tailwind CSS, shadcn/ui) |
| Database / Auth / Storage | Supabase (Postgres + RLS + Auth + Storage) |
| AI | Google Gemini API (`gemini-3.5-flash`) |
| Email | Resend (optional; falls back to `outbox` table) |
| PDF | `pdf-lib` (server-side) |
| Maps | Leaflet + OpenStreetMap |
| Deployment | Vercel Hobby + Supabase free tier |

---

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- (Optional) Google Gemini API key, Resend API key

### 1. Clone & install

```bash
git clone <repo-url>
cd baitul-jamaat
npm install
```

### 2. Configure environment

Create `.env.local` at the project root:

```env
# Supabase — from your project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Super admin credentials (used by seed-super-admin script)
SUPER_ADMIN_PHONE=9876543210
SUPER_ADMIN_PASSWORD=ChangeMe123!

# Cron security (any random secret you choose)
CRON_SECRET=your-random-cron-secret

# Optional — AI features (OCR, duplicate detection, family suggestions)
GEMINI_API_KEY=your-gemini-api-key

# Optional — email delivery (falls back to outbox table if not set)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=noreply@yourdomain.com

# Optional — used for registration QR code link generation
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

### 3. Set up the database

In your Supabase dashboard → **SQL Editor → New query**, paste and run the contents of `supabase/run_all_migrations.sql`.

This creates all tables, RLS policies, Postgres functions, and the auth trigger.

### 4. Create the super admin

```bash
node scripts/seed-super-admin.mjs
```

Uses `SUPER_ADMIN_PHONE` and `SUPER_ADMIN_PASSWORD` from `.env.local`.

### 5. (Optional) Load demo data

```bash
node scripts/seed.mjs
```

Creates 1 masjid (BJM), 1 admin, 15 members, 1 monthly program, and sample ledger entries. All demo passwords are `Demo@1234`.

### 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Supabase Setup

### Storage bucket

In your Supabase dashboard → **Storage → New bucket**:

- Name: `id-documents`
- Public: **No** (private)
- Max file size: 5 MB
- Allowed MIME types: `image/jpeg, image/png, application/pdf`

Then go to **Storage → Policies** and add these policies for `id-documents`:

```sql
-- Allow masjid admins to read documents in their masjid's folder
CREATE POLICY "masjid_admin: read own masjid docs"
ON storage.objects FOR SELECT
USING (
  auth.jwt()->'app_metadata'->>'role' = 'masjid_admin'
  AND (storage.foldername(name))[1] = auth.jwt()->'app_metadata'->>'masjid_id'
);

-- Allow public uploads during registration (files are stored in masjid sub-folder)
CREATE POLICY "public: upload to masjid folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'id-documents');
```

### Auth settings

In **Authentication → Settings**:
- Disable "Confirm email" (email confirmation is bypassed in code)
- Enable "Allow new users to sign up": Yes (needed for self-registration)

---

## Vercel Deployment

### 1. Import project

Connect your GitHub repo to Vercel. Framework preset: **Next.js**.

### 2. Environment variables

Add all variables from `.env.local` to Vercel project settings → Environment Variables. Set them for Production, Preview, and Development as appropriate.

### 3. Cron job

The `vercel.json` file is already configured:

```json
{
  "crons": [{ "path": "/api/cron/daily", "schedule": "30 0 * * *" }]
}
```

This fires daily at 00:30 UTC and handles both recurrence billing and month-start statements. The route is protected by `CRON_SECRET` (Vercel sends it as `Authorization: Bearer <secret>`).

### 4. Deploy

Push to `main` — Vercel auto-deploys.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `SUPER_ADMIN_PHONE` | Seed only | Phone number for super admin account |
| `SUPER_ADMIN_PASSWORD` | Seed only | Initial password for super admin |
| `CRON_SECRET` | Yes | Shared secret for cron route authentication |
| `GEMINI_API_KEY` | Optional | Google Gemini API key; OCR/AI features disabled without it |
| `RESEND_API_KEY` | Optional | Resend email API key; emails log to `outbox` table if absent |
| `RESEND_FROM` | Optional | Sender address for emails (e.g. `noreply@yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL` | Optional | Full app URL for QR code links (auto-detected from request headers if absent) |

---

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Full access to all masjids; CRUD for masjid records and admin accounts |
| `masjid_admin` | Full access to their own masjid's data — members, programs, ledger, receipts |
| `member` | Read-only access to own balance, ledger history, and GPay payment QR |

Login uses phone number + password. Phone is stored as `{phone}@bj.local` internally to satisfy Supabase Auth's email requirement.

---

## Estimated Monthly Cost

| Service | Usage | Cost |
|---------|-------|------|
| Vercel Hobby | 1 project, serverless functions | **Free** |
| Supabase Free | DB, Auth, Storage (500 MB) | **Free** |
| Gemini API | ~50–200 OCR calls/month | ~$0.01–$0.05 |
| Resend Free | 100 emails/day | **Free** |
| **Total** | | **~₹0–₹5/month** |

---

## Project Structure

```
src/
├── app/
│   ├── (admin)/         # Masjid admin UI routes
│   ├── (auth)/          # Login / change-password
│   ├── (member)/        # Member portal
│   ├── (superadmin)/    # Super admin UI
│   ├── api/             # API routes (admin/, superadmin/, cron/, masjids/)
│   └── masjids/         # Public self-registration pages
├── components/          # Shared React components
├── lib/                 # Supabase clients, Gemini, email, PDF, billing utils
├── types/               # TypeScript types (database.ts)
└── proxy.ts             # Next.js middleware
supabase/
├── migrations/          # SQL migration files (run_all_migrations.sql aggregates them)
scripts/
├── seed-super-admin.mjs # Create super admin account
└── seed.mjs             # Load demo data
```
