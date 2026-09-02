# PROVEN CRM

A CRM + campaign management app for PROVEN: companies, contacts, a deal pipeline, and email campaigns sent via Gmail.

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Postgres (Neon / Vercel Postgres) + Prisma
- Auth.js (NextAuth) with email/password
- Gmail API for campaign sending (each user connects their own Google account)

## One-time setup

### 1. Database

Create a free Postgres database — [Neon](https://neon.tech) works well and is what Vercel Postgres runs on. Copy its connection string.

### 2. Google Cloud OAuth client (for sending campaigns)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create a project (or reuse one).
2. Enable the **Gmail API**.
3. Configure the OAuth consent screen (External is fine; add yourself and colleagues as test users while unverified).
4. Create an **OAuth client ID** (type: Web application).
5. Add an authorized redirect URI: `{APP_URL}/api/gmail/callback` — for local dev that's `http://localhost:3000/api/gmail/callback`; for production, your Vercel URL.
6. Copy the Client ID and Client Secret.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=          # from step 1
AUTH_SECRET=            # generate with: openssl rand -base64 32
APP_URL=                # http://localhost:3000 locally, your Vercel URL in production
GOOGLE_CLIENT_ID=       # from step 2
GOOGLE_CLIENT_SECRET=   # from step 2
```

### 4. Install, migrate, seed

```bash
npm install
npm run db:migrate   # creates tables
npm run db:seed      # seeds default pipeline/awareness stages
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/register` to create the first (admin) account. Every account after that is created by an admin from **Team** settings inside the app.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. Import it into Vercel.
3. Add the same environment variables from `.env` in the Vercel project settings (use your production `APP_URL` and add the matching Google OAuth redirect URI).
4. Deploy. Then run `npm run db:deploy && npm run db:seed` once (locally, pointed at the production `DATABASE_URL`, or via a Vercel deploy hook) to set up the schema and seed stages.

## What's not built yet (known v1 gaps)

- No password reset flow.
- Pipeline/awareness stages are seeded and editable only via `npx prisma studio`, not a settings UI.
- No click tracking or automatic reply detection on campaigns — mark a contact "replied" manually.
- Team invites are manual (admin sets a temporary password, no invite email).
