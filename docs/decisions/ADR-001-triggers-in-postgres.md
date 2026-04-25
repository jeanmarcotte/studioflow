# ADR-001: Milestone Triggers in PostgreSQL, Not Application Code

**Date:** April 25, 2026
**Status:** Accepted
**Decision Makers:** Jean Marcotte, Spencer (Tech)

---

## Context

StudioFlow tracks 36 milestones per couple across the client journey. These milestones need to flip automatically when events occur — a job status changes, a payment is received, a contract is signed.

The question: should these triggers live in PostgreSQL (database triggers) or in the Next.js application code (API routes, server actions)?

## Decision

**All milestone triggers are PostgreSQL database triggers.**

## Rationale

1. **Milestones must flip regardless of how the data changes.** If a status is updated via the StudioFlow UI, via Claude Code running SQL directly, via a Supabase migration, or via a future API — the milestone must still flip. Only database triggers guarantee this. Application code only fires when the specific API route is called.

2. **Multiple agents write to the database.** Jean uses the UI. Claude Code runs SQL. Claude Chat runs queries via MCP. Any of these can change data. If the trigger is in an API route, Claude Code bypasses it every time.

3. **No middleware to maintain.** Database triggers are fire-and-forget. No API route to call, no middleware to import, no function to remember to invoke.

4. **Auditability.** All triggers are visible via `information_schema.triggers`. They can be queried, verified, and documented in TRIGGERS.md.

## Consequences

- All milestone logic must be written in PL/pgSQL, not TypeScript.
- Debugging triggers requires checking Supabase logs, not Vercel logs.
- Complex business logic (multi-table checks) is harder to write in PL/pgSQL than in TypeScript.
- Trigger names and functions must be documented in TRIGGERS.md and kept in sync.

## Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| Next.js API routes | Would be bypassed by Claude Code SQL, Supabase migrations, and any non-UI data change |
| Supabase Edge Functions | More flexible than triggers but still require being called explicitly — not automatic |
| Supabase Webhooks | Latency, reliability concerns, requires external endpoint |

---

*Accepted April 25, 2026.*
