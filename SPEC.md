# BUILD PROMPT — Paste this into Claude Code / Cursor

---

You are a senior full-stack architect and developer. Build a complete, production-ready web application called **"Baitul Jamaat"** (Masjid Membership & Donation Management System). Follow this spec exactly. Where the spec is silent, choose the simplest option that works for non-technical users.

## 1. Context & Users

Masjids (mosques) need to maintain a member register and collect recurring donations. Users are **non-technical, low digital literacy**. The UI must therefore be:

- Mobile-first, responsive (works equally on desktop)
- Large touch targets, big fonts, icon + label buttons, minimal text per screen
- One action per screen wherever possible; no jargon
- Islamic visual theme: green/gold/white palette, geometric patterns, crescent motif on landing page. Tasteful, not cluttered.

## 2. Tech Stack (cheapest viable, do not deviate)

- **Frontend/Backend:** Next.js 14+ (App Router, TypeScript, Tailwind CSS, shadcn/ui)
- **Database/Auth/Storage:** Supabase (free tier) — Postgres with Row Level Security, Supabase Auth, private Storage bucket for ID documents and photos
- **AI:** Google Gemini API — use `gemini-2.0-flash-lite` (cheapest) for all AI tasks below. All Gemini calls happen server-side only (API key never exposed to client).
- **Email:** Resend free tier (fallback: log email payloads to an `outbox` table if no API key configured — app must work without email)
- **PDF:** generate receipts/statements server-side with `@react-pdf/renderer` or `pdf-lib`
- **QR codes:** `qrcode` npm package
- **Scheduled jobs:** Vercel Cron (Hobby tier) hitting protected API routes — one daily job at 00:30 that handles both recurrence billing and month-start statements
- **Maps:** Leaflet + OpenStreetMap (free) for location picking — no Google Maps billing
- **Deployment target:** Vercel Hobby (free) + Supabase free tier. Provide a `README.md` with exact deploy steps and required env vars.

**Scale target:** v1 serves 1 masjid with <500 members, but the schema is multi-tenant from day one (every table carries `masjid_id`, RLS enforces tenant isolation) so it scales to many masjids without migration.

## 3. Roles & Auth

Three roles: `super_admin`, `masjid_admin`, `member`.

- Super admin: seeded via env var / seed script.
- Masjid admin: created by super admin; system generates username + temporary password, shown once on screen with a copy button. Force password change on first login.
- Member: credentials generated on approval (see 5.6). Login is by **phone number + password** (simplest for this audience). Include "show password" toggle and admin-side password reset.
- All passwords hashed (Supabase Auth handles this). Sessions via Supabase Auth.

## 4. Module 1 — Super Admin

1. CRUD for Masjids with fields: name, address, phone, **location picked on a map** (lat/lng stored, Leaflet picker), `active` (boolean), masjid admin name, **masjid GPay UPI ID / number**.
2. When `active = false`: every route and API under that masjid is blocked with a friendly "This masjid is currently inactive — contact administrator" screen. Enforce at middleware level, not just UI.
3. On masjid creation, generate the masjid admin account (unique user ID + password, displayed once).
4. Super admin dashboard: list of masjids, active/inactive toggle, basic counts (members, outstanding total).

## 5. Module 2 — Member Self-Registration

1. Masjid admin dashboard shows a **registration QR code** (encodes the public self-registration URL for that masjid) with buttons: download image, copy link, share via email (`mailto:` prefilled).
2. Public registration page (no login required), opened by scanning QR or typing URL. Fields:
   - Photo (optional, camera capture supported on mobile)
   - Phone number (**mandatory**, validated, 10-digit India + UAE formats accepted)
   - Email (optional)
   - ID document upload: Aadhaar **or** Passport (**mandatory**; jpg/png/pdf, max 5 MB, stored in a private bucket)
   - Highest qualification or job (**mandatory**, free text with common suggestions)
3. **Gemini OCR step:** after upload, send the document image to Gemini with a strict prompt to return JSON `{name, dob, gender, address, id_type, id_last4}`. Pre-fill the form; user can edit every field before submitting. If OCR fails, form still works manually — OCR is assistive, never blocking. **Never store the full Aadhaar number; store only last 4 digits + the document file.**
4. **Duplicate detection (Gemini):** on submission, fetch existing members of that masjid with same phone OR fuzzy-similar name+dob, and ask Gemini to classify `duplicate | possible_duplicate | new`. Exact phone match = auto-reject with friendly message. `possible_duplicate` = flag for admin with reason shown in review screen.
5. Submission lands in a **Pending Approvals** queue.
6. **Admin review screen:** side-by-side view of submitted data vs. the uploaded document image. Approve → system generates unique member number (format `M-{masjid_code}-{seq}`) + password, shown to admin with a "send by SMS/WhatsApp" share link. Reject → optional reason.
7. Members are `active` by default; admin can deactivate anytime. **Inactive members: excluded from all new transactions and program runs, but fully visible in history/reports.**
8. Admin can edit every member field, including resetting passwords.

## 6. Module 3 — Family Mapping

1. Admin groups members into families. A family has a head; each member gets a relationship to head: husband, wife, son, daughter, father, mother, brother, sister, other.
2. **Gemini suggestion:** given a set of selected members (name, age, gender, address), Gemini returns suggested family grouping + relationships as JSON. Show as pre-filled suggestions with confidence notes — **always manually editable, never auto-saved**.
3. Family tree view: simple indented hierarchy card, mobile friendly (no complex graph libraries).

## 7. Module 4 — Revenue Programs & Payments

1. Admin creates a program: name, default amount, recurrence (monthly/yearly), start date, active (y/n), end date (optional).
2. **Enrollment:** search/filter members by age range, gender, family, qualification/job, active status; multi-select and **bulk add** to the program. Default amount is editable per member at enrollment (and later).
3. **Billing engine (daily cron):** on each recurrence date (program start-date anchored), create a `charge` ledger entry per enrolled active member for their configured amount. Idempotent — running the job twice must not double-bill (use a unique key of program+member+period).
4. **Discount column:** per member per period, admin can enter a discount (with a short reason field) that reduces the payable amount. Discounts appear in the ledger and audit trail.
5. **Ledger model:** simple double-entry-lite — `charges` (+), `discounts` (−), `payments` (−); outstanding = sum. Show running balance per member.
6. **Monthly statements:** on the 1st of each month, generate a per-member outstanding statement PDF pack and email it to the masjid admin; also downloadable anytime from the dashboard. Members can log in to see their own balance and history.
7. **Member payment (no payment gateway — out of scope):** member landing page shows outstanding balance with a big **"Pay" button** → displays the masjid's **GPay UPI QR code** (generated from the masjid's UPI ID) with a "Save image" button. Payment happens outside the system.
8. **Cash/manual receipt:** admin records a payment → system creates a receipt with a unique sequential receipt number per masjid (`R-{masjid_code}-{seq}`), allocates it against outstanding charges (oldest first), generates a **PDF receipt** on demand, and emails the member if email exists.
9. **Audit trail:** every edit/delete of receipts, charges, discounts, and member records writes an immutable `audit_log` row (who, when, before/after JSON, reason). Receipts are never hard-deleted — only voided with reason.

## 8. Non-Functional Requirements

- RLS on every table; masjid admins can only touch their own masjid's data; members only their own records.
- ID documents in a **private** bucket, served via short-lived signed URLs, visible only to the member's masjid admin and super admin.
- Input validation with Zod on every API route; friendly error messages, never stack traces.
- Seed script: 1 masjid, 1 admin, 15 sample members, 1 monthly program with charges/payments, so the app is demo-ready immediately.
- English UI for v1, but wrap all strings in an i18n layer (next-intl) so Malayalam/Urdu/Arabic can be added later.
- `README.md`: local setup, Supabase setup (SQL migrations included in repo), env vars (`GEMINI_API_KEY`, `RESEND_API_KEY` optional, Supabase keys), Vercel deploy + cron config, and estimated monthly cost (target: ₹0 / $0 on free tiers at this scale, Gemini usage a few cents).

## 9. Build Order (work in this sequence, commit after each step)

1. Scaffold Next.js + Supabase, schema + migrations + RLS, auth for 3 roles
2. Super admin module (masjid CRUD + admin generation + active gate)
3. Self-registration flow + QR + storage (manual, no AI yet)
4. Gemini OCR + duplicate detection
5. Approval flow + member credentials + member portal (balance view + GPay QR)
6. Revenue programs + enrollment + billing cron + ledger
7. Receipts + PDFs + audit trail + monthly statement job + emails
8. Family mapping + Gemini suggestions
9. Islamic-themed landing page, polish, seed data, README

At the end, run the app, verify each module against this spec, and list anything not implemented.

---
*End of prompt.*