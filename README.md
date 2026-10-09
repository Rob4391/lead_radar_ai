<div align="center">
  <img src="docs/logo.svg" width="120" height="120" alt="Lead Radar AI logo" />

  # Lead Radar AI

  **Find local businesses that need marketing help — before your competitors do.**

  [![CI](https://github.com/Rob4391/lead_radar_ai/actions/workflows/ci-prisma-backend.yml/badge.svg)](https://github.com/Rob4391/lead_radar_ai/actions/workflows/ci-prisma-backend.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)](backend/package.json)
  [![Next.js](https://img.shields.io/badge/frontend-Next.js%2016-black?logo=next.js)](frontend/package.json)
  [![NestJS](https://img.shields.io/badge/backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](backend/package.json)
</div>

---

Lead Radar searches a city + category (e.g. *"Ahmedabad" + "Dentist"*), pulls every matching business from Google Places, scores each one on how weak its online presence is, and can write a cold email / LinkedIn message / WhatsApp message for it. No website and few reviews? That's a hot lead. Strong site, tons of reviews, active social? Skip it. Built for digital marketing, SEO, and web dev agencies who need a steady pipeline of Indian local-business prospects — not another expensive, US-focused tool like Apollo or ZoomInfo.

---

## How scoring works

Every lead gets an **Opportunity Score (0–100)** — higher means an easier sale:

| Signal | Points |
|---|---|
| No website | +40 |
| Fewer than 10 reviews | +30 |
| 10–49 reviews | +15 |
| No Instagram presence | +15 |
| No Facebook presence | +15 |

```
100 = no website + few reviews + no social presence   → call them today
 20 = solid site + reviews + active socials            → skip
```

Implementation: [`backend/src/scoring.ts`](backend/src/scoring.ts) · unit tests: [`backend/src/scoring.spec.ts`](backend/src/scoring.spec.ts).

---

## Online Presence Audit

`POST /leads/:id/audit` checks a lead's actual website for concrete, pitchable problems — all free, no headless browser:

| Check | How |
|---|---|
| Website age | Wayback Machine's `available` API (earliest snapshot on record) |
| Mobile-friendly | Regex for a `<meta name="viewport">` tag on the homepage |
| Slow load | Google PageSpeed Insights (optional — skipped if `PAGESPEED_API_KEY` isn't set) |
| Broken links | Plain HTTP `HEAD` requests against up to 5 internal links |

Results cache on the `Lead` row (`auditedAt` + the individual fields); pass `?force=true` to re-run. Implementation: [`backend/src/audit/`](backend/src/audit/).

---

## Architecture

```
┌────────────┐     Clerk sign-in     ┌──────────────────────┐
│  Next.js   │  ──────────────────▶  │   /api/proxy/leads   │
│  frontend  │  ◀──────────────────  │ (Next.js API route)  │
└────────────┘      JSON / CSV       └──────────────────────┘
                                                 │ Authorization: Bearer <token>
                                                 ▼
                                     ┌──────────────────────┐
                                     │    NestJS backend    │
                                     │ ApiKeyGuard verifies  │
                                     │    Clerk token or     │
                                     │ x-api-key (CI/admin)  │
                                     └──────────────────────┘
                                                 │
                             ┌───────────────────┬───────────────────┐
                             ▼                   ▼                   ▼
                     ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
                     │ Bull + Redis  │   │ Google Places │   │  PostgreSQL   │
                     │   job queue   │ ▶ │      API      │ ▶ │  via Prisma   │
                     └───────────────┘   └───────────────┘   └───────────────┘
```

A search enqueues a collection job; the job fetches businesses from Google Places, computes an opportunity score for each, and upserts them into Postgres. The frontend polls the job until it's done, then renders results and offers a CSV export.

---

## Quickstart (Docker Compose)

```bash
git clone https://github.com/Rob4391/lead_radar_ai.git
cd lead_radar_ai
cp backend/.env.example backend/.env   # fill in CLERK_SECRET_KEY + GOOGLE_PLACES_API_KEY
```

Create `frontend/.env`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

```bash
docker compose up
```

- Frontend → http://localhost:3000
- Backend → http://localhost:3001

### Manual setup (no Docker)

```bash
# Postgres + Redis running locally, then:
cd backend && npm install
npx prisma generate && npx prisma db push
npm run dev            # http://localhost:3001

cd ../frontend && npm install
npm run dev             # http://localhost:3000
```

---

## API

Every route requires auth (see [Auth model](#auth-model)). What a caller can do depends on *who* they are:

**Shared lead data** — a signed-in user (`Authorization: Bearer <Clerk token>`) or the admin key:

```bash
# Kick off a search — returns cached leads instantly, or a jobId to poll
curl -X POST localhost:3001/leads/collect \
  -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"city": "Ahmedabad", "category": "Dentist"}'

# Poll job status
curl localhost:3001/leads/collect-status/42 -H "Authorization: Bearer $TOKEN"

# Export as CSV (includes your own outreach columns when called as a user)
curl "localhost:3001/leads/export?city=Ahmedabad&category=Dentist" \
  -H "Authorization: Bearer $TOKEN" -o leads.csv

# Audit a lead's website (cached and shared; add ?force=true to re-audit)
curl -X POST localhost:3001/leads/17/audit -H "Authorization: Bearer $TOKEN"

# Get a lead's top 2-3 local competitors, ranked by strongest online presence
curl localhost:3001/leads/17/competitors -H "Authorization: Bearer $TOKEN"
```

**Your own work on a lead** — signed-in user only. Each agency's outreach, proposals, status and notes are private to that agency; the admin key gets a 403 here:

```bash
# Generate outreach messages (cached per user; ?force=true regenerates,
# ?language=hindi|gujarati|tamil|marathi generates in another language)
curl -X POST localhost:3001/leads/17/outreach -H "Authorization: Bearer $TOKEN"

# Generate a scope + pricing proposal (cached per user; ?force=true regenerates)
curl -X POST localhost:3001/leads/17/proposal -H "Authorization: Bearer $TOKEN"

# Update your pipeline status (NEW/CONTACTED/REPLIED/WON/LOST) and notes
curl -X PATCH localhost:3001/leads/17/status -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" -d '{"status": "CONTACTED", "notes": "Left voicemail"}'

# Lists
curl -X POST localhost:3001/lists -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" -d '{"name": "Q4 Hot Leads"}'
curl localhost:3001/lists -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:3001/lists/1/leads -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" -d '{"leadId": 17}'
```

**Admin tooling** — `x-api-key: $ADMIN_API_KEY` only:

```bash
# Insert a lead by hand (normal leads come from Google Places)
curl -X POST localhost:3001/leads -H "x-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" -d '{"name": "Test Biz", "website": "https://example.com"}'

# Recompute opportunity scores for a city/category
curl -X POST localhost:3001/leads/score -H "x-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" -d '{"city": "Ahmedabad", "category": "Dentist"}'
```

`GET /billing/plans` is public. From the browser, the frontend never touches `ADMIN_API_KEY` — it signs requests with the logged-in user's Clerk session token automatically via `/api/proxy/*`.

Request bodies are validated (unknown fields, missing fields, over-long values and non-numeric ids get a `400`), and routes are rate-limited per user: 120/min by default, 30/min for audits, 10/min for outreach, proposals and new searches (`429` when exceeded).

---

## Auth model

Every route is guarded by `ApiKeyGuard` ([`backend/src/api-key.guard.ts`](backend/src/api-key.guard.ts)), which accepts either:

1. **A Clerk session token** — `Authorization: Bearer <token>`, verified server-side against `CLERK_SECRET_KEY`. This is what the frontend sends automatically for signed-in users.
2. **`x-api-key: <ADMIN_API_KEY>`** — for internal scripts, seeding and CI, where there's no logged-in user. Compared in constant time, and **ignored when `NODE_ENV=production`** unless `ENABLE_ADMIN_API_KEY=true` is set. It sees shared lead data only, never any user's private work.

**Data ownership:** a lead's business facts (name, phone, website, reviews, score) and its audit results are shared — they're public information, and one Google Places lookup or audit serves everyone. Everything a user *does* with a lead (outreach, proposals, status, notes, lists) is stored per user and never visible to other users.

**Website audit safety:** the audit fetches lead websites server-side, so it refuses any URL that resolves to a private, loopback, link-local or cloud-metadata address (checked again at connect time and on every redirect), and only allows http(s) on standard ports.

On the frontend, `middleware.ts` enforces sign-in on `/search`, `/pricing`, `/lists` and `/api/proxy/*` — an anonymous visitor is redirected to sign-in before ever reaching a lead. The backend also sends standard security headers (helmet) and only allows CORS from `FRONTEND_ORIGIN`.

---

## Billing

Pricing tiers gate the number of new searches per 30-day period (cached results don't count):

| Plan | Price | Searches/month |
|---|---|---|
| Free | ₹0 | 10 |
| Starter | ₹999 | 50 |
| Growth | ₹2,999 | 250 |
| Agency | ₹9,999 | Unlimited |

Every signed-in user is granted the **Free** plan automatically on first use — no checkout, no payment. Unlike the paid tiers (which expire after 30 days and need repurchasing), Free auto-renews forever. It exists purely so the app is usable without needing a Razorpay account; `GET /billing/plans` deliberately excludes it since it isn't something to buy.

Checkout for the paid tiers runs through Razorpay in **test mode** (free — no KYC or real payment method needed to build/test against it). Flow: `/pricing` → `POST /billing/checkout` creates a Razorpay order → Razorpay's Checkout widget collects a (fake, in test mode) payment → the client posts the result to `POST /billing/verify`, which checks the HMAC signature server-side and activates the plan for 30 days. What was bought, and for whom, is read from the Razorpay order itself (checkout records the plan and customer on the order) — never from the browser — so a payment for one plan can't be verified as a pricier one, or for another account.

This is intentionally *not* Razorpay's native recurring Subscriptions API — each successful payment buys a flat 30-day period with no auto-renewal. Simpler to build and test; upgrading to real recurring billing later is a contained change in [`backend/src/billing/`](backend/src/billing/).

`POST /billing/webhook` verifies Razorpay's signature and **also activates the plan** on `order.paid` / `payment.captured`, so a customer who pays and closes the tab before the redirect still gets upgraded. Each order activates a plan **at most once** (a `Payment` row with a unique order id), so the webhook and `/billing/verify` can both arrive safely, and replaying an old payment can't renew a plan for free. To use it in production, add a webhook in the Razorpay dashboard pointing at `https://<your-domain>/billing/webhook` and set its secret as `RAZORPAY_WEBHOOK_SECRET`.

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `CLERK_SECRET_KEY` | backend, frontend | Verifies/generates Clerk session tokens |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | frontend | Clerk client SDK |
| `ADMIN_API_KEY` | backend | Admin key for scripts/CI (shared data only) |
| `ENABLE_ADMIN_API_KEY` | backend | Set to `true` to allow the admin key when `NODE_ENV=production` (off by default) |
| `FRONTEND_ORIGIN` | backend | Comma-separated origins allowed by CORS (default `http://localhost:3000`) |
| `GOOGLE_PLACES_API_KEY` | backend | Lead collection source |
| `REDIS_URL` | backend | Bull job queue |
| `LLM_PROVIDER` | backend | `ollama` (default, free/local) or `anthropic` |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | backend | Ollama endpoint (default `localhost:11434`) / model (default `qwen2.5:1.5b`) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | backend | Only used when `LLM_PROVIDER=anthropic` (paid API, default `claude-sonnet-5`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | backend | Billing checkout (free test-mode keys) |
| `RAZORPAY_WEBHOOK_SECRET` | backend | Verifies `POST /billing/webhook` signatures (set when the webhook is created in the Razorpay dashboard) |
| `PAGESPEED_API_KEY` | backend | Optional — enables the audit's slow-load check via Google PageSpeed Insights |
| `BACKEND_URL` | frontend | Where `/api/proxy/*` forwards requests |

See [`backend/.env.example`](backend/.env.example).

---

## Tests

```bash
cd backend && npm test        # scoring, CSV, auth guard, audit + SSRF guard, outreach, proposals, billing, per-user data
cd frontend && npx tsc --noEmit   # typecheck
```

CI runs both on every push/PR to `main` — see [`.github/workflows/ci-prisma-backend.yml`](.github/workflows/ci-prisma-backend.yml).

---

## Roadmap

- [x] **Week 1** — Landing page, auth, search UI, database
- [x] **Week 2** — Data collection pipeline, lead database
- [x] **Week 3** — Opportunity scoring, CSV export
- [x] **Week 4** — AI outreach message generator (cold email / LinkedIn / WhatsApp, free via local Ollama or Claude), Razorpay billing with monthly search limits
- [x] **Week 5** — Online Presence Audit (website age, mobile-friendliness, broken links), WhatsApp click-to-chat deep-link
- [x] **Week 6** — Competitor benchmarking (top 2-3 local competitors per lead), Proposal Generator (AI scope + pricing proposal, built on Week 5's audit findings)
- [x] **Week 7** — Multi-language outreach (Hindi/Gujarati/Tamil/Marathi), Lead status tracking (New/Contacted/Replied/Won/Lost + notes), Lead Lists (save leads into named, persistent lists), UI polish pass
- [x] **Week 8** — Security & data isolation: per-user outreach/proposals/status/notes, SSRF-safe website audit, input validation, per-user rate limits, security headers, locked CORS, production-safe admin key, billing fixes (plan read from the order, replay-proof activation, webhook activation)
- [ ] **Week 9** — Data quality: email finding, Instagram/Facebook detection, Google rating, filter by audit problem, Google Sheets export
- [ ] **Week 10** — Sell-ready & global: free trial, shareable audit report link, country-wise currency (USD default), one pricing model, any-country phone numbers, terms/privacy
- [ ] **Week 11** — Team accounts, follow-up reminders
- [ ] **Week 12** — Deploy to GCP with backups and error tracking; NestJS/Clerk upgrades

---

## License

MIT — see [`LICENSE`](LICENSE).
