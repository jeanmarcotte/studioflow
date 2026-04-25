# DEPLOYMENT.md
**StudioFlow — Deployment & Infrastructure**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Hosting

| Service | Provider | Account |
|---------|----------|---------|
| Web App | Vercel | jean-marcottes-projects team |
| Database | Supabase | jeanmarcotte@gmail.com |
| Email | Resend | jeanmarcotte@gmail.com |
| Domain | — | studioflow-zeta.vercel.app (Vercel default) |
| Version Control | GitHub | jean-marcotte/studioflow (private) |

---

## Supabase Projects

| Project | ID | Purpose |
|---------|-----|---------|
| StudioFlow + BridalFlow | `ntysfrgjwwcrtgustteb` | All couple data, production, sales, milestones |
| Ops Dashboard + Health | `oabfbugszpnjpquhjssv` | Work orders, health tracking, family hub, finance |
| JeanToDoList | `ogzmoitxcracuhhscjef` | Personal task management |

---

## Vercel

| Setting | Value |
|---------|-------|
| Team | jean-marcottes-projects |
| Project | studioflow |
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Node Version | 18.x |
| Region | iad1 (US East) |

### URLs

| Environment | URL |
|-------------|-----|
| Production | https://studioflow-zeta.vercel.app |
| BridalFlow | https://studioflow-zeta.vercel.app/leads |
| Client Portal | https://studioflow-zeta.vercel.app/portal |
| Admin | https://studioflow-zeta.vercel.app/admin |

---

## Resend

| Setting | Value |
|---------|-------|
| From addresses | `noreply@sigsphoto.ca`, `info@sigsphoto.ca` |
| Used for | Crew call sheets, weekly reports, portal magic links, production emails |
| API Key | Stored in Vercel env vars |

---

## Environment Variables

All env vars are set in Vercel project settings. Key variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side only) |
| `RESEND_API_KEY` | Resend email API key |
| `CRON_SECRET` | Shared secret for production report cron (Sun+Thu 9AM Toronto) |
| `NEXT_PUBLIC_APP_URL` | Public app base URL |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (used by auth redirects) |
| `ANTHROPIC_API_KEY` | Claude API key for AI features |
| `INBOUND_WEBHOOK_KEY` | Webhook authentication key |
| `META_VERIFY_TOKEN` | Meta/Facebook webhook verification token |
| `PERSONAL_SUPABASE_URL` | Personal Supabase project API URL (Ops/Health) |
| `PERSONAL_SUPABASE_ANON_KEY` | Personal Supabase anon key (Ops/Health) |

**Rule:** Never use `NEXT_PRIVATE_` prefix — not reliably exposed to serverless functions. Use `SUPABASE_SERVICE_ROLE_KEY` (no prefix) for server-side secrets.

---

## GitHub

| Setting | Value |
|---------|-------|
| Repo | `jean-marcotte/studioflow` |
| Branch | `main` (single branch) |
| Auto-deploy | Yes — Vercel deploys on every push to main |

---

## Storage

| Bucket | Provider | Purpose |
|--------|----------|---------|
| `portal-assets` | Supabase Storage (public) | Hero images, collage images for Client Portal |

---

## External Services (Not Integrated via API)

| Service | How Used | Integration Level |
|---------|----------|-------------------|
| Google Calendar | Jean's schedule | Manual — read-only via MCP in Claude Chat |
| Gmail | Client communication | Manual — no API integration |
| Dropbox | Photo delivery, backup | File sync on Mac — no API |
| Pixieset | Album proof review | Separate platform — manual upload |
| CCI | Print lab (albums, portraits) | ROES app — manual |
| UAF | Print lab (albums, portraits) | WeTransfer — manual |
| Best Canvas | Canvas prints | Online ordering — manual |

---

## Other SIGS Properties

| App | URL | Hosting | Supabase |
|-----|-----|---------|----------|
| Ops Dashboard | dashboard.jeanmarcotte.com | Vercel | `oabfbugszpnjpquhjssv` |
| Health Dashboard | health.jeanmarcotte.com | Vercel | `oabfbugszpnjpquhjssv` |
| IronTokens | irontoken.ca | Vercel (planned) | Separate project (planned) |

---

*Verified April 25, 2026.*
