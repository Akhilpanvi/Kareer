# Kareers

Placement Cell platform for KL University — every student gets a login and a single profile showing coding activity, projects, certifications and a placement readiness score.

**Live:** https://kareer.klef.me

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · MongoDB + Mongoose · Vercel

## Architecture

```
app/
  login/                    sign in (no public registration)
  (app)/dashboard           student overview
  (app)/profile             own details, links, platform usernames, password
  (app)/achievements        skills, projects, certifications, achievements
  (app)/stats               detailed platform statistics
  (app)/admin               Placement Cell: search, filter, sort, export
  (app)/admin/students/[id] student view + sync / reset password / disable
  actions/                  server actions (auth, profile, admin)
  api/cron/refresh          scheduled refresh of stale platform data
  api/admin/export          CSV export (admin only)
lib/
  platforms/                one file per platform + registry & sync engine
  auth.ts session.ts        signed HttpOnly session cookie, DB-verified
  score.ts                  readiness score (0–100)
models/  User, PlatformStat
scripts/seed.ts             creates/updates students from CSV
proxy.ts                    route guard (optimistic; pages re-verify)
```

### Data model

- **User** — account (role `student | admin`), institutional fields, editable profile, `handles` map (`platform → username`), embedded skills/projects/certifications/achievements, and denormalised `metrics` + `score` so the admin list is a single indexed query.
- **PlatformStat** — one document per `(user, platform)`: status, cached payload, headline metrics, 90-point `history` for progress trends, `fetchedAt` / `checkedAt`.

### External data & free-tier limits

Platform data is never fetched on page render. Pages read the MongoDB cache; if a record is older than 12 h, a refresh runs *after* the response (`after()`). Students can force a sync at most every 10 minutes. A daily Vercel cron refreshes the stalest records within a 50 s budget, 4 requests at a time.

| Platform | Source |
| --- | --- |
| GitHub | GraphQL (with `GITHUB_TOKEN`: repos + contribution calendar in one call), REST fallback |
| LeetCode | Public GraphQL — solved by difficulty, contest, topics, languages, badges, recent AC, calendar |
| CodeChef | Profile page parse — rating, stars, highest, ranks, solved, contest history |
| Codeforces | Official API — rating, rank, contest history |

**Adding a platform:** create `lib/platforms/<name>.ts` implementing `Platform` (`label`, `unit`, `url`, `fetch → { data, metrics, value } | null`) and register it in `lib/platforms/index.ts`. The profile form, sync, cron and stats pipeline pick it up automatically; add a section to `app/(app)/stats` to display its details.

### Security

- scrypt password hashing (Node `crypto`), no public sign-up
- HMAC-signed `__Host-` HttpOnly, Secure, SameSite=Lax cookie; every request re-checks the user is active and the session version matches (password change/reset and disable revoke all sessions)
- Account lockout: 5 failed attempts → 15 minutes
- All mutations are server actions scoped to the signed-in user's id; admin actions check role server-side
- Input length limits, http(s)-only links, username validation, CSV formula-injection escaping
- Security headers (HSTS, frame deny, nosniff, referrer, permissions policy)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values
npm run seed -- data/students.csv
npm run dev
```

| Variable | |
| --- | --- |
| `MONGODB_URI` | Atlas connection string including database name, e.g. `…mongodb.net/kareers?…` |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `CRON_SECRET` | random string; Vercel sends it to the cron route |
| `GITHUB_TOKEN` | classic token, no scopes — enables contribution calendar, 5000 req/h |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed-only; first admin account |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | enables "Forgot password?" emails (see below); without them the link is hidden in production |
| `APP_URL` | base URL used in reset links, default `https://kareer.klef.me` |

### Seeding students

`npm run seed -- <file.csv> [--reset-passwords]`

Columns: `regNo,name,email,branch,batch,campus,section,phone,github,leetcode,codechef,codeforces,password` (see `data/students.example.csv`). Matching is by `regNo`, so re-running updates students in place. New students without a `password` get a random one; all issued credentials are written to `data/credentials-<timestamp>.csv` (gitignored, mode 600) — distribute securely and delete. Admins can also issue a temporary password per student from the admin panel.

### Passwords

- Students and admins change their own password from **Profile** (click your name in the sidebar).
- Admins reset student passwords from the student page, and other admins from **Placement Cell Team**.
- Locked out of every admin account? From a trusted machine with `MONGODB_URI`: `npm run reset-password -- <email|regNo>`.
- **Forgot password?** emails a single-use link (30 min expiry, one request per account every 5 min, same response whether or not the account exists).

#### Email setup (Gmail SMTP)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=passkey.crt@gmail.com
SMTP_PASSWORD=<Google App Password>
SMTP_FROM="Kareer OTP <otp@kareer.klef.me>"
```

1. On the Google account: turn on 2-Step Verification, then create an **App Password** (Security → App passwords). Use it as `SMTP_PASSWORD`; the normal account password is rejected.
2. To send as `otp@kareer.klef.me`, add it in Gmail → Settings → Accounts → **Send mail as** and confirm it (the address must receive mail — e.g. Cloudflare Email Routing forwarding `otp@kareer.klef.me` to the Gmail inbox). Until then Gmail rewrites the sender to `passkey.crt@gmail.com`.
3. For deliverability, in Cloudflare DNS add TXT on `kareer`: `v=spf1 include:_spf.google.com ~all`. (Gmail can't DKIM-sign a custom domain on a free account, so some messages may land in spam.)
4. Set the variables in Vercel and redeploy. Gmail allows about 500 emails/day.

In development without SMTP settings, reset emails are printed to the server console.

## Deploy (Vercel)

1. Import the repository, framework preset Next.js.
2. Add the environment variables above (Production).
3. Add the domain `kareer.klef.me` and point a `CNAME` to `cname.vercel-dns.com`.
4. In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (Vercel has no fixed IPs on the free tier).
5. `vercel.json` schedules the refresh cron daily (Hobby plan limit).
