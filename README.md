# Lead Radar AI

[![CI](https://github.com/Rob4391/lead_radar_ai/actions/workflows/ci-prisma-backend.yml/badge.svg)](https://github.com/Rob4391/lead_radar_ai/actions/workflows/ci-prisma-backend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)](backend/package.json)
[![Next.js](https://img.shields.io/badge/frontend-Next.js%2014-black?logo=next.js)](frontend/package.json)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](backend/package.json)

**Find local businesses that need marketing help — before your competitors do.**

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

## Architecture

```
┌────────────┐   sign-in (Clerk)   ┌───────────────────┐
│  Next.js    │ ──────────────────▶ │  /api/proxy/leads  │  (forwards Clerk session token)
│  frontend   │ ◀────────────────── │  Next.js API route │
└────────────┘        JSON/CSV      └─────────┬──────────┘
                                               │ Bearer <token>
                                               ▼
                                  ┌─────────────────────────┐
                                  │   NestJS backend          │
                                  │   ApiKeyGuard verifies     │
                                  │   Clerk token or           │
                                  │   x-api-key (CI/admin)     │
                                  └───────────┬─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            ┌───────────────┐        ┌────────────────┐        ┌───────────────┐
            │ Bull + Redis  │        │  Google Places  │        │  PostgreSQL    │
            │ job queue     │──────▶ │  API             │──────▶ │  via Prisma    │
            └───────────────┘        └────────────────┘        └───────────────┘
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

All routes below live under `/leads` on the backend and require auth (see [Auth model](#auth-model)).

```bash
# Kick off a search — returns cached leads instantly, or a jobId to poll
curl -X POST localhost:3001/leads/collect \
  -H "x-api-key: $ADMIN_API_KEY" -H "content-type: application/json" \
  -d '{"city": "Ahmedabad", "category": "Dentist"}'

# Poll job status
curl localhost:3001/leads/collect-status/42 -H "x-api-key: $ADMIN_API_KEY"

# Recompute opportunity scores for a city/category
curl -X POST localhost:3001/leads/score \
  -H "x-api-key: $ADMIN_API_KEY" -H "content-type: application/json" \
  -d '{"city": "Ahmedabad", "category": "Dentist"}'

# Export as CSV
curl "localhost:3001/leads/export?city=Ahmedabad&category=Dentist" \
  -H "x-api-key: $ADMIN_API_KEY" -o leads.csv

# Generate outreach messages for a lead (cached; add ?force=true to regenerate)
curl -X POST localhost:3001/leads/17/outreach -H "x-api-key: $ADMIN_API_KEY"
```

From the browser, the frontend never touches `ADMIN_API_KEY` — it signs requests with the logged-in user's Clerk session token automatically via `/api/proxy/leads/*`.

---

## Auth model

Every `/leads/*` route is guarded (`ApiKeyGuard`, [`backend/src/api-key.guard.ts`](backend/src/api-key.guard.ts)) and accepts either:

1. **A Clerk session token** — `Authorization: Bearer <token>`, verified server-side against `CLERK_SECRET_KEY`. This is what the frontend sends automatically for signed-in users.
2. **`x-api-key: <ADMIN_API_KEY>`** — a legacy/admin bypass for internal scripts, seeding, and CI, where there's no logged-in Clerk user.

On the frontend, `middleware.ts` enforces sign-in on `/search` and `/api/proxy/*` — an anonymous visitor is redirected to sign-in before ever reaching a lead.

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `CLERK_SECRET_KEY` | backend, frontend | Verifies/generates Clerk session tokens |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | frontend | Clerk client SDK |
| `ADMIN_API_KEY` | backend | Legacy auth bypass for scripts/CI |
| `GOOGLE_PLACES_API_KEY` | backend | Lead collection source |
| `REDIS_URL` | backend | Bull job queue |
| `ANTHROPIC_API_KEY` | backend | AI outreach message generation |
| `ANTHROPIC_MODEL` | backend | Optional override (default `claude-sonnet-5`) |
| `BACKEND_URL` | frontend | Where `/api/proxy/*` forwards requests |

See [`backend/.env.example`](backend/.env.example).

---

## Tests

```bash
cd backend && npm test        # scoring, CSV formatting, auth guard, Places API client, outreach generation
cd frontend && npx tsc --noEmit   # typecheck
```

CI runs both on every push/PR to `main` — see [`.github/workflows/ci-prisma-backend.yml`](.github/workflows/ci-prisma-backend.yml).

---

## Roadmap

- [x] **Week 1** — Landing page, auth, search UI, database
- [x] **Week 2** — Data collection pipeline, lead database
- [x] **Week 3** — Opportunity scoring, CSV export
- [~] **Week 4** — AI outreach message generator ✅ (cold email / LinkedIn / WhatsApp via Claude), Stripe/Razorpay billing (pending)

---

## License

MIT — see [`LICENSE`](LICENSE).
