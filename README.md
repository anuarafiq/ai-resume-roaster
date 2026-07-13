# AI Resume Roaster

Upload a resume PDF, get roasted. Feedback that sounds like a blunt, Gen-Z friend reading over your shoulder, not a corporate career coach.

**Flow:** upload PDF → parse text server-side → send to Groq (Llama 3.3 70B) for structured feedback → save to Postgres → show results on the same page.

## Stack

- **Next.js 14** (Pages Router) + Tailwind CSS
- **Groq API** (`llama-3.3-70b-versatile`) for the roast itself
- **pdf-parse** for server-side text extraction
- **Prisma + Supabase** (Postgres) for storing roasts
- **NextAuth.js** (Google OAuth) for sign-in

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values, see below
npx prisma db push           # creates the Roast table on your Supabase DB
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Full instructions live in `.env.example`. Quick reference:

| Variable | What it's for |
|---|---|
| `GROQ_API_KEY` | Groq API key, from [console.groq.com/keys](https://console.groq.com/keys) |
| `DATABASE_URL` | Pooled Postgres connection (port 6543) from Supabase → Project Settings → Database |
| `DIRECT_URL` | Direct Postgres connection (port 5432), used by Prisma migrations |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `NEXTAUTH_SECRET` | Random signing key, generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally, your deployed URL in production |

## How it works

1. `components/UploadDropzone.jsx` handles the drag-and-drop / click-to-browse upload, capped at 5MB, checked client-side.
2. `pages/api/roast.js` gets the file as base64 JSON, decodes it, and:
   - pulls text out with `lib/pdfParser.js` (corrupt or password-protected PDFs come back as a clear error, not a crash)
   - sends that text to Groq through `lib/groq.js`, using a 4-layer system prompt (role, context, task, output format) that keeps the JSON shape consistent
   - saves the resume text and feedback to Postgres via `lib/db.js` (Prisma). Signed-in users get their roast tagged with their email. If the save fails, the roast still comes back, it just won't persist.
3. Results fade in on the same page. There's no separate results route.

Sign-in is optional. Roasting works with or without a Google session; being logged in just ties your history to your account.

## Deploying

Deploy to Vercel. Before it works live:

- Set every variable above in the Vercel project's environment settings.
- Add your production callback URL (`https://<your-app>.vercel.app/api/auth/callback/google`) to the same Google OAuth client, alongside the localhost one.
- `prisma generate` runs automatically through the `postinstall` script, so no extra build config is needed.

`next.config.js` sets the security headers (CSP, X-Frame-Options, and friends). The CSP allows the redirect to `accounts.google.com` for sign-in. The Groq call happens entirely server-side, so it never touches the browser's CSP at all.
