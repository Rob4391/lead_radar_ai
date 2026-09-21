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
- To protect the `/leads/export` endpoint in CI, set a repository secret `ADMIN_API_KEY` and add it to the backend workflow env.
