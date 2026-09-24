# Backend (NestJS)

Run migrations and start dev server for the backend.

Install dependencies:

```bash
npm install
```

Generate Prisma client and run migrations (after DB is up):

```bash
npx prisma generate
npx prisma db push
```

Start dev server:

```bash
npm run dev
```

Local dev (Docker):

1. Start DB and services via Docker Compose:

```bash
docker compose up -d db
```

2. Create `.env` in `backend` from `.env.example` and adjust values.

3. Generate Prisma client and push schema:

```bash
cd backend
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
```

Notes:
- Do not commit `backend/.env` — it is included in `.gitignore`.
- All `/leads/*` routes require either a Clerk session token (`Authorization: Bearer <token>`, verified against `CLERK_SECRET_KEY`) or the legacy `x-api-key: <ADMIN_API_KEY>` header for scripts/CI. See `.env.example` for the full list of required variables.
- The frontend's `/api/proxy/leads/*` routes fetch and forward the signed-in user's Clerk token automatically — the browser never needs to know about `CLERK_SECRET_KEY` or `ADMIN_API_KEY`.
- `POST /leads/:id/outreach` generates a cold email / LinkedIn message / WhatsApp message for a lead via the Anthropic API. Requires `ANTHROPIC_API_KEY` in `.env` (optional `ANTHROPIC_MODEL` to override the default `claude-sonnet-5`). Results are cached on the lead; pass `?force=true` to regenerate.
- Billing: `GET /billing/plans` (public, excludes FREE), `GET /billing/status` / `POST /billing/checkout` / `POST /billing/verify` (Clerk-authenticated). Requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (free test-mode keys from the Razorpay dashboard, no KYC needed for test mode). Every new user is auto-granted the FREE plan (10 searches/month, auto-renews, no payment). Paid plans are a simple 30-day period per successful payment, not Razorpay's native recurring Subscriptions API — they actually expire and need repurchasing, by design for the MVP. `POST /leads/collect` returns `403` once a plan's monthly search limit is hit (FREE 10, STARTER 50, GROWTH 250, AGENCY unlimited); the legacy `x-api-key` path bypasses this limit entirely.
