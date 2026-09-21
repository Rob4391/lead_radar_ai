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
