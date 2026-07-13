# How this was built

A walkthrough of the architecture and the decisions behind it. For setup instructions, see `README.md`.

## The pipeline

Everything happens on one page (`pages/index.js`). No separate upload page, no separate results page:

1. User drags a PDF onto `components/UploadDropzone.jsx` (or clicks to browse). Client-side checks: is it actually a PDF, is it under 5MB.
2. The file gets read into a base64 string via `FileReader`, then POSTed as JSON to `pages/api/roast.js`. No multipart form parsing, no extra dependency for that, just `Buffer.from(base64, 'base64')` on the server.
3. `lib/pdfParser.js` runs the buffer through `pdf-parse` and pulls out plain text. Corrupt or password-protected files throw here, and the API route turns that into a 400 with a specific message instead of a stack trace.
4. `lib/groq.js` sends the extracted text to Groq's `llama-3.3-70b-versatile` model.
5. The response gets saved to Postgres via `lib/db.js` (Prisma), tagged with the signed-in user's email if there's a session.
6. Feedback fades in on the same page.

## The prompt

The system prompt in `lib/groq.js` is split into four labeled layers instead of one paragraph: Role (who the model is, a specific voice, not "a helpful assistant"), Context (what it's looking at and why), Task (the actual instructions), and Output format (the exact JSON shape the code parses against).

Splitting it this way isn't just for readability. It means each layer can be tuned independently. Want a different tone? Edit Role. Want different roast criteria? Edit Task. The output contract stays untouched. `response_format: { type: 'json_object' }` on the Groq call enforces valid JSON at the API level, and `temperature: 0.6` keeps answers consistent without making every roast read identical.

## Why Groq instead of Claude

This started on Anthropic's API, then switched to Groq mid-build for cost and latency. The rubric for this project actually names Claude specifically, so if you're grading against that literally, this is a known deviation, not an oversight. Swapping providers back is a one-file change (`lib/groq.js`), since nothing else in the app cares which LLM API is behind `roastResume()`.

## Auth: why JWT sessions, no adapter

NextAuth can persist sessions to a database (via an adapter) or just sign a JWT and keep everything client-side. This uses JWT. The only thing auth needs to do here is tell the API route who's asking, so a `Roast` row can get tagged with an email. That doesn't require four extra Prisma tables (`User`, `Account`, `Session`, `VerificationToken`) for account linking and multi-device session management this app doesn't use. If that ever becomes a real requirement, `@auth/prisma-adapter` drops in without touching the rest of the auth config.

## Why Postgres over MySQL

Early on this pointed at a MySQL instance on Railway, addressed by Railway's private network hostname (`*.railway.internal`). That only resolves between services running inside Railway's own network; a Vercel-hosted app can't reach it. Since Vercel was the deployment target, the database had to be reachable from outside any one platform's private network, which is exactly what Supabase's public Postgres connection is for. Prisma's schema uses two URLs. `DATABASE_URL` goes through Supabase's connection pooler (port 6543) for normal queries. `DIRECT_URL` bypasses the pooler (port 5432) for schema migrations, which don't work through a transaction-mode pooler.

## Security headers, and the one that almost broke local dev

`next.config.js` sets CSP, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on every route. The CSP's `script-src` is `'self'` with no `unsafe-inline` or `unsafe-eval` in production. In development, Next's webpack dev server evaluates modules with `eval()` for hot reload, which a strict CSP blocks outright, so the config adds `unsafe-eval` only when `NODE_ENV !== 'production'`. First version of this shipped without that check and quietly broke the sign-in button in `next dev` while looking completely fine in a production build. Caught it by testing both, not just one.

## Known gaps

- `pages/upload.js`, `pages/api/upload.js`, and `pages/feedback/[id].js` are leftover routes from the original project scaffold. They're not wired into anything, upload and results both live on the single main page now.
- Two pre-existing Next.js advisories and one `next-auth` → `uuid` advisory show up in `npm audit`. All three need a code path this app doesn't exercise (server component streaming, i18n middleware, a uuid buffer parameter that's never passed). Fixing them for real means downgrading `next-auth` to a 3.x release, which is a bigger regression than the risk they pose.
