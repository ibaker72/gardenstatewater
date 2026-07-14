# 💧 Garden State Water

A full-stack platform for running a mobile water delivery business — CRM, orders,
route optimization, pricing engine, inventory, invoicing, a customer portal, and
daily automation. Built for a solo operator working from a van and a phone.

> **Naming note:** the app ships branded as **Garden State Water**. If you ever want
> something more distinctive, strong alternates that keep the local angle:
> **JerseyDrop**, **BrickCity Water**, or **PureRoute**. Branding lives in a handful
> of obvious strings (`AdminShell`, `layout.tsx`, `email.ts`) — a 5-minute rename.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS (mobile-first, dark mode, print styles) |
| Database | Supabase Postgres via Prisma ORM |
| Auth | Supabase Auth (owner login; customers use tokenized portal links) |
| Payments | Stripe Checkout + webhook (cash/Venmo/CashApp logged manually) |
| Maps | Google Maps (Distance Matrix, Geocoding, Embed) with built-in fallback |
| Email / SMS | Resend / Twilio (console fallback in dev) |
| Charts | Recharts |
| Hosting | Vercel (incl. Vercel Cron for daily automation) |

**Everything degrades gracefully without API keys**: no Stripe → manual payment
logging still works; no Google key → routes are optimized with haversine
nearest-neighbor + 2-opt; no Resend/Twilio → messages print to the server console
and are recorded in `notifications_log`.

## Quick start (local)

```bash
npm install
cp .env.example .env        # fill in at least DATABASE_URL + DIRECT_URL
npm run db:push             # create the schema
npm run db:seed             # 5 customers, 12 orders, inventory, zones…
npm run dev                 # http://localhost:3000
```

With no Supabase env vars set, auth is bypassed (open dev mode) so you can explore
immediately. The seed prints a `/portal/<token>` link — open it on your phone to see
the customer portal.

## Production setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema — either way works:
   - `npm run db:push` with `DATABASE_URL`/`DIRECT_URL` pointed at Supabase, or
   - paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor.
3. **Auth → Users → Add user**: create the owner account (your email + password).
4. Copy Project URL / anon key / service-role key into env vars (see `.env.example`).
5. Set `OWNER_EMAIL` to that same email — it's the only account the middleware
   lets into the admin app. Customers never log in; they use their portal link
   (find it on any customer profile).

### 2. Stripe (optional, for online payments)

1. Grab the secret key from the Stripe dashboard → `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint `https://<your-domain>/api/stripe/webhook` listening to
   `checkout.session.completed` → copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
3. Invoice emails and the customer portal automatically get "Pay online" links.

### 3. Google Maps (optional, for real drive times)

Enable **Geocoding API**, **Distance Matrix API**, and **Maps Embed API** on one key:
- `GOOGLE_MAPS_API_KEY` (server: geocoding + distance matrix)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client: the embedded route map)

### 4. Email / SMS (optional)

- Resend: `RESEND_API_KEY` + `EMAIL_FROM` (verify your domain in Resend).
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
  Without Twilio, SMS-type notifications fall back to email automatically.

### 5. Deploy to Vercel

```bash
npm i -g vercel && vercel --prod
```

#### Environment variables (Vercel → Settings → Environment Variables)

Paste **raw values only — no quotes, no leading/trailing spaces**. A value like
`"https://…"` (with quotes) is stored literally and breaks URL parsing. After
**any** env change you must redeploy: values are read at runtime by the
serverless functions, and `NEXT_PUBLIC_*` values are additionally **baked into
the build**, so an existing deployment never picks up new values.

| Variable | Required | Production | Preview | Development | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | ✅ | ✅ | Supabase **transaction pooler** string (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | ✅ | ✅ | ✅ | ✅ | Supabase **session pooler** string (port 5432); used by migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ | `https://<project-ref>.supabase.co` — must be a valid https URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ✅ | Public anon key (safe for browsers) |
| `OWNER_EMAIL` | ✅ | ✅ | ✅ | ✅ | The only account admitted to the admin app |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | ✅ | ✅ | Production: `https://gardenstatewater.com` (no trailing slash) |
| `CRON_SECRET` | ✅ | ✅ | ✅ | — | Any random string; Vercel Cron sends it automatically |
| `STRIPE_SECRET_KEY` | optional | ✅ | test key | test key | Server-only secret — never `NEXT_PUBLIC_` |
| `STRIPE_WEBHOOK_SECRET` | optional | ✅ | test secret | test secret | From the webhook endpoint config — server-only secret |
| `GOOGLE_MAPS_API_KEY` | optional | ✅ | ✅ | ✅ | Server: geocoding + distance matrix |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | optional | ✅ | ✅ | ✅ | Client: embedded route map |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | ✅ | — | — | Without them, email logs to console |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | optional | ✅ | — | — | Without them, SMS falls back to email |

Example — in the Vercel dashboard enter exactly:

```
NEXT_PUBLIC_APP_URL
https://gardenstatewater.com
```

not `"https://gardenstatewater.com"`.

Missing optional integrations never crash the site; a **malformed required
value** locks the admin app to `/login` with an explanation (it does not 500).
`/api/health` reports database connectivity and configuration status at a
glance.

#### Safe deployment sequence

1. Confirm every required variable above exists in the **Production**
   environment (a value set only for Preview/Development does not exist in
   Production) and contains no quotes or stray whitespace.
2. Deploy (push to `main`, or promote a verified preview).
3. `GET /` → 200 (login page or dashboard, never "Internal Server Error").
4. `GET /api/health` → `{"db":"ok", …}`.
5. `GET /api/stripe/webhook` → 405.
6. Stripe dashboard → the webhook endpoint → *Send test event*
   (`checkout.session.completed`) → expect 2xx.
7. Run a test-mode checkout against a test invoice and confirm the invoice
   flips to PAID.
8. Only after test mode works, switch to live keys + live webhook secret and
   redeploy.

**Rollback:** Vercel → Deployments → previous READY production deployment →
"Instant Rollback" (or `vercel rollback`). Env-var mistakes roll back by
restoring the old value **and redeploying**.

## What's inside

| Area | Route | Highlights |
|---|---|---|
| Dashboard | `/` | today's stats, health score, low-stock + overdue alerts, quick actions |
| Customers | `/customers` | search/filter, zones, at-risk flags, comm log, jug & balance tracking |
| Orders | `/orders` | manual + "generate subscription orders", status flow, delivery sheet |
| Delivery sheet | `/orders/delivery-sheet` | printable, route-sorted, works offline once loaded |
| Routes | `/routes` | one-tap optimization, map embed, reorder stops, check-off, export to Maps |
| Pricing | `/pricing` | all prices configurable, competitor table, margin suggestions, profit calc |
| Inventory | `/inventory` | jug lifecycle (stock ⇄ customers ⇄ lost), suppliers, purchase history |
| Invoices | `/invoices` | bundle deliveries, email w/ pay link, aging buckets, reminders, statements |
| Portal | `/portal/[token]` | customer-facing: balance, schedule, request/pause, pay online |
| Reports | `/reports` | revenue, volume, growth, route efficiency, P&L — all CSV-exportable |
| Requests | `/requests` | inbox for portal requests |
| Settings | `/settings` | zones, automation toggles, integration status, notification log |

### Daily automation (`/api/cron/daily`)

Every morning: delivery reminders for tomorrow (SMS→email fallback), overdue
invoice flagging + 7/14/30-day payment reminders, auto-suspension of accounts
past the configured overdue limit (override = reactivate on the profile),
birthday/loyalty emails, and your "Today you have X deliveries, $Y expected"
summary. Also runnable on demand from **Settings**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | prisma generate + production build |
| `npm run db:push` | push schema to the database |
| `npm run db:seed` | load sample data (re-runnable; wipes and reloads) |
| `npm run db:studio` | Prisma Studio data browser |
| `npm run typecheck` | TypeScript check |
| `npm run deploy` | `vercel --prod` |

## Business logic worth knowing

- **Balances** are computed, never stored: delivered/paid order totals minus payments.
- **Order pricing** runs through one engine (`src/lib/pricing-core.ts`): base prices →
  bulk deal (buy N get M free) → plan discount → zone delivery fee.
- **Jug accounting**: delivering refills moves jugs stock → customer; marking empties
  returned moves them back; purchases become customer-owned. `inventory_movements`
  is the audit trail.
- **Subscriptions**: weekly = every preferred weekday; bi-weekly = alternating weeks
  anchored to the customer's start date; monthly = first preferred weekday of the month.
  "Generate" is idempotent per customer/date.
- **Route solver**: nearest-neighbor construction + 2-opt improvement; Google Distance
  Matrix when configured, haversine ×1.3 road factor otherwise.
