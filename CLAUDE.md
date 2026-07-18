# Baitul Jamaat — CLAUDE.md

Project: Masjid Membership & Donation Management System  
Spec: SPEC.md (read it before touching anything)

---

## Tech Stack Rules (do not deviate)

- **Framework:** Next.js 14+ — App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Database / Auth / Storage:** Supabase (free tier)
  - Postgres with Row Level Security
  - Supabase Auth for sessions
  - Private Storage bucket for ID documents and photos
- **AI:** Google Gemini API — model `gemini-3.5-flash` ONLY (cheapest); all calls server-side, API key never exposed to client
- **Email:** Resend free tier; if `RESEND_API_KEY` not set, log payload to `outbox` table — app must work without email
- **PDF:** `@react-pdf/renderer` or `pdf-lib` (server-side only)
- **QR codes:** `qrcode` npm package
- **Scheduled jobs:** Vercel Cron (Hobby) → protected API routes; single daily job at 00:30 handling recurrence billing + month-start statements
- **Maps:** Leaflet + OpenStreetMap (no Google Maps, no billing)
- **Deployment:** Vercel Hobby (free) + Supabase free tier
- **i18n:** `next-intl` — wrap ALL user-visible strings so Malayalam/Urdu/Arabic can be added later

---

## Naming Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Member number | `M-{masjid_code}-{seq}` | `M-BJM-0042` |
| Receipt number | `R-{masjid_code}-{seq}` | `R-BJM-0007` |

- `masjid_code` is a short uppercase slug set when the masjid is created (e.g. `BJM`).
- `seq` is a per-masjid auto-incrementing integer, zero-padded to 4 digits.
- Both sequences are stored on the `masjids` table (`member_seq`, `receipt_seq`) and incremented atomically inside a Postgres function to avoid races.

---

## RLS Rule — Non-Negotiable

> **Every table carries `masjid_id uuid NOT NULL REFERENCES masjids(id)`.**  
> **Row Level Security is enabled on every table.**

Policy pattern:
- `super_admin` role: full access to all rows
- `masjid_admin` role: access only to rows where `masjid_id = auth.jwt()->'app_metadata'->>'masjid_id'`
- `member` role: access only to their own member row + their own ledger/payment rows

Enforce via a custom JWT claim (`app_metadata.masjid_id`, `app_metadata.role`) set by a Postgres trigger on the `profiles` table after Supabase Auth user creation.

---

## UI Rules (non-technical, low-literacy users)

- Mobile-first, responsive; large touch targets, big fonts
- Icon + label buttons; one action per screen where possible
- Islamic visual theme: **green / gold / white** palette, geometric patterns, crescent on landing page
- Inactive masjid gate: middleware blocks every route/API under that masjid with a friendly screen (not just UI hiding)

---

## Env Vars

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `SUPER_ADMIN_PHONE` | Yes | Seed super admin phone (login = `{phone}@bj.local`) |
| `SUPER_ADMIN_PASSWORD` | Yes | Seed super admin password |
| `CRON_SECRET` | Yes | Protects `/api/cron/daily` |
| `RESEND_API_KEY` | No | If absent, emails log to `outbox` table |
| `RESEND_FROM` | No | Sender address; defaults to `noreply@baitujamaat.app` — must be on a Resend-verified domain in production |
| `SUPER_ADMIN_EMAIL` | No | Real inbox for new-masjid-application notifications |
| `GEMINI_API_KEY` | Yes (Step 4+) | Gemini OCR + AI features |
| `NEXT_PUBLIC_APP_URL` | No | Full origin URL used in email links (e.g. `https://yourapp.vercel.app`) |

---

## RLS Exception — `masjid_applications`

The `masjid_applications` table does **not** carry `masjid_id` (it is a pre-masjid entity). RLS is still enabled: super admin has full access; public INSERT is performed via service role in the API route (bypasses RLS). No other role can read or write it.

---

## Build Order & PROGRESS

Work in this sequence. Commit after each step. Do not skip ahead.

- [x] **Step 1** — Scaffold Next.js + Supabase, schema + migrations + RLS, auth for 3 roles
- [x] **Step 2** — Super admin module (masjid CRUD + map picker + admin generation + active gate)
- [x] **Step 3** — Self-registration flow + QR code + storage (manual, no AI yet)
- [x] **Step 4** — Gemini OCR + duplicate detection
- [x] **Step 5** — Approval flow + member credentials + member portal (balance view + GPay QR)
- [x] **Step 6** — Revenue programs + enrollment + billing cron + ledger
- [x] **Step 7** — Receipts + PDFs + audit trail + monthly statement job + emails
- [x] **Step 8** — Family mapping + Gemini suggestions
- [x] **Step 9** — Islamic-themed landing page, polish, seed data, README
- [x] **Step 10** — Public masjid registration request form + super admin approval flow

Mark a step `[x]` when it is fully committed and verified against SPEC.md.
