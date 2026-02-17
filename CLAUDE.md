# StudioFlow — CLAUDE.md
**Project:** StudioFlow (SIGS Photography Business Management)  
**Created:** February 16, 2026  
**Last Updated:** February 16, 2026

---

## Overview

StudioFlow is the business management system for SIGS Photography. It has two modes:
- **Client Mode** — Used during Zoom sales calls, visible to couples
- **Admin Mode** — Jean's backend for managing the business

**Local Development:** http://localhost:3003  
**Domain (future):** studio.sigsphoto.ca  
**Database:** BridalFlow Supabase (ntysfrgjwwcrtgustteb)  
**Repo:** jeanmarcotte/studioflow

---

## Tech Stack

- **Framework:** Next.js 14.1.0 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4.0
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Auth:** Google OAuth via Supabase
- **Database:** Supabase (PostgreSQL)
- **IDE:** WebStorm

---

## Project Structure

```
studioflow/
├── src/
│   ├── app/
│   │   ├── client/
│   │   │   └── new-quote/page.tsx    # Quote builder (583 lines)
│   │   ├── admin/                     # Future: Admin dashboard
│   │   ├── auth/callback/             # OAuth callback handler
│   │   └── login/                     # Login page
│   ├── components/
│   │   └── layout/                    # Layout components
│   ├── config/
│   │   └── sidebar.ts                 # Sidebar navigation configs
│   └── lib/
│       └── supabase.ts                # Supabase client + helpers
├── .env.local                         # Environment variables
├── package.json
└── CLAUDE.md                          # This file
```

---

## Database Tables (BridalFlow Supabase)

| Table | Purpose |
|-------|---------|
| `ballots` | BridalFlow lead capture (existing) |
| `couples` | Master couple records with slug |
| `payments` | Payment tracking with installments |
| `quotes` | Quote management before contracts |
| `contracts` | PDF contract storage references |
| `extras_orders` | Frames/albums with JSONB items |
| `staff_assignments` | Photographer/videographer |
| `deliverables` | Production tracking by type |

---

## Pricing Configuration (Updated Feb 16, 2026)

```typescript
const PRICING = {
  photoOnly: {
    base: 3000,        // 8 hours included
    extraHour: 350,
  },
  photoVideo: {
    base: 5500,        // 8 hours included
    extraHour: 450,
  },
  albums: {
    standard: { '10x8': 800, '14x11': 1200 },
    premium: { '10x8': 1200, '14x11': 1600 },
  },
  parentAlbum: 400,
  thankyouCards: 75,   // per 25 cards
  drone: 400,
  acrylicCover: 200,
  hstRate: 0.13,
}
```

---

## Authentication

- **Provider:** Google OAuth via Supabase
- **Authorized Users:**
  - jeanmarcotte@gmail.com
  - marianna@sigsphoto.ca
- **Callback:** /auth/callback
- **Session:** Supabase session management

---

## Key Features

### New Client Quote Builder (`/client/new-quote`)
- Real-time pricing calculations
- BridalFlow lead auto-search and pre-fill
- Package selection (photo-only vs photo+video)
- Album configurations with sizes
- Add-ons: drone, acrylic cover, parent albums, thank you cards
- HST automatic calculation (13%)
- Discount support (% or flat)
- Save/Preview PDF/Send to Couple buttons

### BridalFlow Integration
- Searches existing `ballots` table by couple names
- Auto-fills: names, wedding date, phone, venue
- Debounced search (500ms)

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://ntysfrgjwwcrtgustteb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
```

---

## Commands

```bash
# Development
npm run dev          # Starts on port 3003

# Build
npm run build
npm start

# Linting
npm run lint
```

---

## Current Status

### ✅ Completed
- Quote builder with real-time pricing
- Google OAuth authentication
- BridalFlow lead integration
- Database tables created
- Form validation with Zod
- Responsive design

### 🔄 In Progress
- Visual polish and color improvements
- PDF quote generation

### 📋 Planned
- Admin dashboard
- Couple management pages
- Production tracking
- Staff assignments
- Email templates
- Financial reporting

---

## Session History

### February 16, 2026 (PM)
- Applied pricing updates: $3K base (from $5K), $350/hr (from $400)
- Changed album sizes to 10"×8" and 14"×11"
- Added acrylic cover pricing ($200)
- Visual improvements: color-coded bride/groom sections, card-style package selection, dark pricing summary
- Created CLAUDE.md for closeshop tracking

### February 16, 2026 (AM)
- Built complete quote builder (583 lines)
- Set up Google OAuth authentication
- Created 7 database tables
- Integrated BridalFlow lead search
- Resolved auth debugging issues (port mismatch, API key truncation, redirect URIs)

---

## Related Projects

| Project | Relationship |
|---------|--------------|
| BridalFlow | Shares Supabase database, lead source |
| Operations Dashboard | Will display StudioFlow data |
| SIGS SEO | Marketing integration |

---

## Notes

- **SIGS HATES VIDEO** — Photo-only is the goal, but system supports photo+video for transition period
- Port 3003 chosen to avoid conflicts with other local projects
- Reuses Google OAuth credentials from SIGS Dashboard
- All pricing in CAD with 13% HST (Ontario)
