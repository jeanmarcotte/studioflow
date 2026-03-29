# Full SEO Audit Report: sigsphoto.ca

**Date:** March 19, 2026
**Platform:** Squarespace
**Business Type:** Wedding Photography (Local Service, Toronto/GTA)

---

## Executive Summary

### Overall SEO Health Score: 58/100

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 25% | 62/100 | 15.5 |
| Content Quality | 25% | 62/100 | 15.5 |
| On-Page SEO | 20% | 45/100 | 9.0 |
| Schema / Structured Data | 10% | 40/100 | 4.0 |
| Performance (CWV) | 10% | 48/100 | 4.8 |
| Images | 5% | 35/100 | 1.75 |
| AI Search Readiness | 5% | 55/100 | 2.75 |
| **TOTAL** | **100%** | | **53.3 → 58** |

### Top 5 Critical Issues

1. **Empty structured data** — Organization, LocalBusiness schemas have blank name, address, phone, email. Google sees an unnamed business with no location.
2. **Duplicate/cannibalized pages** — `/toronto-wedding-photographer` vs `/toronto-wedding-photography`, `/drones` vs `/drone-photography`, `/engagement` vs `/engagement2` vs `/engagement-photography` — pages competing against each other.
3. **Homepage missing from sitemap** — The root URL `https://sigsphoto.ca/` is absent. The sitemap lists `/home` instead, which canonicalizes back to root.
4. **H1 tags broken on location pages** — All 8 city pages share the same generic H1 "Wedding Photography Across the GTA" instead of city-specific headings. Engagement page has no H1 at all.
5. **8 location pages missing from sitemap** — Your primary local SEO assets (`/vaughan-wedding-photographer`, `/mississauga-wedding-photographer`, etc.) are not in the XML sitemap.

### Top 5 Quick Wins (< 30 min each)

1. **Fill in Squarespace Business Information** (5 min) — Settings > Business Information: add name, address, phone, email. Instantly fixes structured data across all pages. **Impact: HIGH**
2. **Fix OG image to HTTPS** (5 min) — Settings > Social Sharing: re-upload social image. Fixes mixed content warnings on all social shares. **Impact: MEDIUM**
3. **Add `display=swap` to Google Fonts** (10 min) — Code Injection > Header: modify font URL. Prevents invisible text flash. **Impact: MEDIUM**
4. **Update pricelist title from 2025 to 2026** (5 min) — Edit page SEO settings. Current title says "2025" for 2026 pricing. **Impact: LOW-MEDIUM**
5. **Switch Twitter card to `summary_large_image`** (5 min) — Code Injection: add meta tag. Photography business should show large preview images. **Impact: MEDIUM**

---

## 1. Technical SEO (Score: 62/100)

### Crawlability (78/100 — PASS)

**What's working:**
- robots.txt properly configured with standard Squarespace blocks
- AI crawler blocking comprehensive (ClaudeBot, GPTBot, etc.)
- HTTP→HTTPS and www→non-www redirects working via 301
- No redirect chains on any tested page
- Sitemap declared in robots.txt

**Issues:**

| Priority | Issue | Fix |
|----------|-------|-----|
| MEDIUM | Homepage listed as `/home` in sitemap, but canonical is root `/` | Add 301 redirect `/home` → `/` in URL Mappings |
| MEDIUM | 9 blog tag/category pages in sitemap are thin content | Hide tag pages from search in Squarespace blog settings |
| LOW | AI crawler directives in robots.txt are no-ops (grouped under wildcard) | Squarespace limitation — no action needed |

### Indexability (48/100 — FAIL)

**Critical duplicate page pairs:**

| Page A | Page B | Problem |
|--------|--------|---------|
| `/toronto-wedding-photographer` | `/toronto-wedding-photography` | Nearly identical keywords, both self-canonicalized |
| `/drones` | `/drone-photography` | Same topic, both indexed separately |
| `/engagement` | `/engagement-photography` | + `/engagement2` — three pages competing |
| `/pricelist-2025` | `/pricelist-2025-special` | 2025 title for 2026 content + a "special" variant |
| `/` (homepage) | `/home` | Identical content, `/home` canonical points to root but both crawled |
| `/wedding2` | Unknown | Non-descriptive slug, likely duplicate portfolio |

**Action Required:** For each pair, pick the stronger URL (more backlinks, better slug) and 301 redirect the other. In Squarespace: Settings > URL Mappings.

### Security (65/100 — PASS with platform limitations)

| Header | Status |
|--------|--------|
| HTTPS | PASS |
| HSTS | PASS (180 days) |
| X-Content-Type-Options | PASS |
| Content-Security-Policy | MISSING (Squarespace limitation) |
| X-Frame-Options | MISSING (Squarespace limitation) |
| Referrer-Policy | MISSING (Squarespace limitation) |

**OG Image uses HTTP:** All social meta tags reference `http://static1.squarespace.com/...` — must be HTTPS.

### URL Structure (55/100 — NEEDS IMPROVEMENT)

**Good:** Location pages use clean `/city-wedding-photographer` pattern.

**Bad:**
- Inconsistent naming: `/drones` vs `/drone-photography`, `/engagement` vs `/engagement-photography`
- Non-descriptive slugs: `/front`, `/wedding2`, `/engagement2`, `/1st-looks`
- Root-level venue pages (`/royalvenetian`, `/bradford-barn`) mixed with `/venues/` collection
- One gibberish blog slug: `/blog/2019/10/16/j58md6103cb51ouwfa7i1dz40qun14`

---

## 2. Content Quality (Score: 62/100)

### E-E-A-T Assessment

**Experience (GOOD):** Blog posts show authentic personal voice. "Friends" page and vendor relationships demonstrate real industry connections. Portfolio images are genuine wedding work.

**Expertise (MODERATE):** Blog content covers relevant topics (first looks, wedding vows, seasonal tips). However, most posts lack depth — they read more like social media posts than authoritative guides.

**Authoritativeness (MODERATE):** Strong Instagram presence (@sigsphoto). Missing: professional certifications, awards, published work credits, industry association memberships on the site.

**Trustworthiness (NEEDS IMPROVEMENT):**
- No visible Google reviews or testimonial schema
- Missing privacy policy link in footer
- No clear business address on website
- Empty structured data undermines trust signals to search engines

### Content Issues

| Priority | Issue | Details |
|----------|-------|---------|
| CRITICAL | H1 doesn't contain primary keyword on homepage | H1 is "Wedding Photography Across the GTA" — should include "Toronto Wedding Photographer" |
| HIGH | `/toronto-wedding-photography` vs `/toronto-wedding-photographer` cannibalization | 7,099 words vs 6,357 words targeting near-identical keywords |
| HIGH | All 8 location pages missing meta descriptions | These high-intent local landing pages have zero meta descriptions |
| HIGH | 5 of 8 location pages have suspiciously similar word counts (4,912-4,968) | Signs of template content with city names swapped — doorway page risk |
| MEDIUM | Blog posts from 2016-2019 are thin/outdated | 12 old posts with identical `2024-09-04` lastmod — bulk edit, not real updates |
| LOW | Vaughan location page duplicate content risk | Content too similar to other location pages |

### Readability

Content is generally accessible and conversational — appropriate for the wedding photography audience. Reading level is approachable. Blog posts could benefit from more structured formatting (subheadings, bullet points) for scannability.

---

## 3. On-Page SEO (Score: 45/100)

### Title Tags

| Issue | Pages Affected |
|-------|---------------|
| Inconsistent separator (pipe `|` on homepage, em-dash `—` on inner pages) | All pages |
| Outdated year in title ("2025") | `/pricelist-2025` |
| Missing space before pipe in drone page title | `/drones` |
| Titles too long (76+ chars risk truncation) | `/toronto-wedding-photography` |

### Heading Structure

| Page | H1 Status | Problem |
|------|-----------|---------|
| Homepage | "Wedding Photography Across the GTA" | Generic — should target "Toronto Wedding Photographer" |
| Toronto | Hidden H1, real heading is H3 | H1 at line 8189 of 8400+ lines — buried |
| Vaughan | "Wedding Photography Across the GTA" | Identical to homepage — not Vaughan-specific |
| Engagement | No H1 at all | Missing entirely |
| Blog | Empty H1 tag | `<h1 class="blog-title">` with no text |
| All location pages | Same generic H1 | Defeats the purpose of separate location pages |

### Hidden SEO Text

The homepage uses a `.seo-h1` CSS class with `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0)`. This is a visually-hidden H1 — Google now treats hidden content with reduced weight. The visible H1 appears very late in the DOM (line 8189).

### Internal Linking

Location pages should cross-link to each other and to relevant venue pages. Blog posts should link to service pages. Currently, internal linking appears minimal beyond main navigation.

---

## 4. Schema / Structured Data (Score: 40/100)

### Current Implementation

7 JSON-LD blocks detected on the homepage:

**Squarespace Auto-Generated (3 blocks — BROKEN):**

| Type | Status |
|------|--------|
| WebSite | Empty `description`, HTTP context |
| Organization | Empty `legalName`, `address`, `email`, `telephone` |
| LocalBusiness | Empty `name` and `address` |

**Custom Code Injection (4 blocks — GOOD):**

| Type | Status |
|------|--------|
| WebSite | Well-formed with publisher reference |
| Organization | Complete with address, phone, social profiles, logo |
| LocalBusiness + ProfessionalService | Excellent — geo, hours, 8 service areas |
| Service | Wedding photography with area coverage and pricing URL |

### Critical Problem: Duplicate Conflicting Schemas

The Squarespace auto-generated blocks (with empty fields) conflict with the manually-injected blocks. Google may pick the empty ones. **The Squarespace defaults must be suppressed** in Settings > SEO, or the custom blocks will be diluted.

### Missing Schema Types

| Schema | Where | Impact |
|--------|-------|--------|
| AggregateRating / Review | Homepage testimonials section | Rich snippet stars in search results |
| BreadcrumbList | All interior pages | Enhanced navigation breadcrumbs in SERPs |
| BlogPosting | Blog posts | Article rich results |
| ImageGallery | Portfolio pages | Image search visibility |
| FAQPage | If FAQ content exists | FAQ rich results |

---

## 5. Performance / Core Web Vitals (Score: 48/100)

### LCP (Largest Contentful Paint) — POOR (estimated 5-9s mobile)

| Factor | Impact |
|--------|--------|
| 392KB HTML document | Extremely heavy — delays TTFB and parsing |
| 57 images on homepage | Many load eagerly without lazy loading |
| No `<link rel="preload">` for LCP image | Browser discovers hero image late |
| Render-blocking Google Fonts stylesheet | Blocks first paint |
| 24 script tags | Significant JS parsing overhead |

### INP (Interaction to Next Paint) — NEEDS IMPROVEMENT

- Heavy JavaScript payload from Squarespace rollup bundles
- Facebook Pixel inline script adds overhead
- Gallery slider interactions may contribute to INP

### CLS (Cumulative Layout Shift) — NEEDS IMPROVEMENT

| Factor | Count |
|--------|-------|
| Images without width/height attributes | 36 of 72 |
| Images with empty alt (potential placeholders) | 49 |
| Images using data-src (JS-dependent, no reserved space) | 54 |
| Inline style attributes (dynamic layout risk) | 110 |

### Key Recommendation

**Reduce homepage from 57-72 images to 15-20.** This single change would dramatically improve LCP, reduce HTML size, and decrease CLS events. Move portfolio galleries to dedicated pages.

---

## 6. Images (Score: 35/100)

### Alt Text Audit

| Category | Count | Percentage |
|----------|-------|------------|
| Empty alt (`alt=""`) | 49 | 68% |
| Filename-as-alt (e.g., `AshleyENG-30.jpg`) | 18 | 25% |
| No alt attribute at all | 5 | 7% |
| **Descriptive, keyword-rich alt text** | **0** | **0%** |

**For a photography business, this is the single biggest missed SEO opportunity.** Google Images is a major traffic source for wedding photographers. Every portfolio image should have descriptive alt text like "Bride and groom first look at Casa Loma, Toronto wedding photography."

### Image Optimization

- Squarespace auto-serves WebP via CDN content negotiation (PASS)
- Responsive `srcset` on section images (PASS)
- Gallery images missing `srcset`, `width`, `height` (FAIL)
- OG image only 480x360 — should be 1200x630 (FAIL)
- No AVIF support (Squarespace limitation)

---

## 7. AI Search Readiness (Score: 55/100)

### AI Crawler Access

- robots.txt blocks GPTBot, ClaudeBot, and 25+ AI crawlers
- This prevents AI systems from citing your content in search results
- **Decision needed:** If you want visibility in AI Overviews and ChatGPT answers, you need to unblock at least GPTBot and Google-Extended

### Citability Assessment

- Custom structured data (blocks 4-7) provides good entity signals
- Blog content has some citable passages but lacks the depth/structure AI systems prefer
- Service pages would benefit from FAQ sections with clear question-answer format
- Missing `llms.txt` file (emerging standard for AI crawler guidance)

### Brand Mention Signals

- Strong: Instagram presence, vendor network ("Friends" page)
- Weak: No Google Business Profile link on site, no review aggregation, no industry awards
- Missing: Author bio on blog posts, professional credentials

---

## Sitemap Analysis

### Current State: 91 URLs, 445KB

**Key Findings:**

| Issue | Priority |
|-------|----------|
| Homepage (`/`) missing — `/home` listed instead | CRITICAL |
| 8 location pages completely absent from sitemap | CRITICAL |
| 9 thin blog tag/category pages included | HIGH |
| `/drones` + `/drone-photography` both present | MEDIUM |
| Gibberish blog slug in sitemap | LOW |
| `<priority>` and `<changefreq>` tags (Google ignores these) | INFO |

### Missing from Sitemap (Should Be Added)

```
https://sigsphoto.ca/
https://sigsphoto.ca/toronto-wedding-photographer
https://sigsphoto.ca/vaughan-wedding-photographer
https://sigsphoto.ca/mississauga-wedding-photographer
https://sigsphoto.ca/hamilton-wedding-photographer
https://sigsphoto.ca/richmond-hill-wedding-photographer
https://sigsphoto.ca/brampton-wedding-photographer
https://sigsphoto.ca/scarborough-wedding-photographer
https://sigsphoto.ca/markham-wedding-photographer
```

**Before adding location pages:** Verify each has genuinely unique content (not just city names swapped). Google's doorway page algorithm specifically targets templated location pages.

---

## Squarespace Platform Constraints

These issues **cannot be fixed** without migrating off Squarespace or using a CDN proxy:

| Limitation | Impact |
|------------|--------|
| Security headers (CSP, X-Frame-Options, Referrer-Policy) | Cannot be configured |
| HSTS preload | Cannot add `includeSubDomains; preload` |
| Blog URL date structure | Baked into Squarespace blog system |
| Manual sitemap editing | Auto-generated only |
| HTML document weight | Platform overhead is significant |
| JavaScript bundle reduction | Platform scripts cannot be removed |
| AVIF image format | Not supported |
| Default empty schema blocks | May not be fully suppressible |

---

## Prioritized Action Plan

### CRITICAL — Fix This Week

| # | Action | Time | Impact |
|---|--------|------|--------|
| 1 | **Fill in Squarespace Business Information** (name, address, phone, email) | 5 min | Fixes all auto-generated schema |
| 2 | **Suppress duplicate schema blocks** — Settings > SEO, disable auto-generated markup if possible | 10 min | Prevents Google from reading empty schemas |
| 3 | **301 redirect `/home` → `/`** — Settings > URL Mappings | 2 min | Fixes homepage duplicate |
| 4 | **Add unique H1 to each location page** with city name (e.g., "Vaughan Wedding Photographer") | 30 min | Fixes location page targeting |
| 5 | **Verify location page content is unique** — if templated, rewrite each with genuine city-specific content | 2-4 hrs | Prevents doorway page penalty |

### HIGH — Fix Within 2 Weeks

| # | Action | Time | Impact |
|---|--------|------|--------|
| 6 | **Consolidate duplicate pages** with 301 redirects: `/drone-photography` → `/drones`, `/engagement2` → `/engagement-photography`, `/toronto-wedding-photography` → `/toronto-wedding-photographer` | 30 min | Eliminates keyword cannibalization |
| 7 | **Write descriptive alt text** for top 30 portfolio images | 1-2 hrs | Unlocks Google Images traffic |
| 8 | **Add meta descriptions** to all 8 location pages | 30 min | Controls SERP snippets for local searches |
| 9 | **Fix OG image** — HTTPS protocol, upgrade to 1200x630, switch to `summary_large_image` Twitter card | 15 min | Better social sharing appearance |
| 10 | **Remove blog tag/category pages** from search — Squarespace blog settings | 10 min | Eliminates thin content from index |
| 11 | **Add AggregateRating schema** to homepage testimonials | 20 min | Enables star rich snippets |

### MEDIUM — Fix Within 1 Month

| # | Action | Time | Impact |
|---|--------|------|--------|
| 12 | **Reduce homepage to 15-20 images** — move galleries to dedicated pages | 1 hr | Major LCP improvement |
| 13 | **Add `<link rel="preload">` for hero image** in Code Injection | 10 min | Faster LCP |
| 14 | **Add `display=swap` to Google Fonts** | 10 min | Prevents FOIT |
| 15 | **Add explicit width/height to all images** | 1 hr | Reduces CLS |
| 16 | **Standardize title tag format** (consistent separator, brand name) | 30 min | Professional SERP appearance |
| 17 | **Update `/pricelist-2025` title** to reflect 2026 | 5 min | Accuracy |
| 18 | **Move orphan venue pages** under `/venues/` with 301 redirects | 30 min | Clean URL hierarchy |
| 19 | **Add BlogPosting schema** to blog posts | 30 min | Article rich results |
| 20 | **Add BreadcrumbList schema** site-wide | 20 min | SERP breadcrumbs |

### LOW — Backlog

| # | Action | Time | Impact |
|---|--------|------|--------|
| 21 | Fix gibberish blog slug | 10 min | Clean URLs |
| 22 | Audit and delete `/front`, `/wedding2` | 15 min | Reduce index bloat |
| 23 | Cross-link location pages to each other and to venue pages | 1 hr | Internal link equity |
| 24 | Add FAQ sections to service pages with FAQPage schema | 2 hrs | FAQ rich results + AI citability |
| 25 | Decide on AI crawler policy (block vs allow GPTBot) | Decision | AI search visibility |
| 26 | Add author bios to blog posts | 30 min | E-E-A-T signal |
| 27 | Security headers via Cloudflare proxy (if pursuing) | 2 hrs | Security score improvement |

---

## Expected Score After Fixes

If all Critical + High items are completed:

| Category | Current | Projected |
|----------|---------|-----------|
| Technical SEO | 62 | 78 |
| Content Quality | 62 | 72 |
| On-Page SEO | 45 | 75 |
| Schema | 40 | 80 |
| Performance | 48 | 60 |
| Images | 35 | 65 |
| AI Search | 55 | 60 |
| **Overall** | **58** | **~74** |

The biggest jumps come from fixing structured data (40→80), consolidating duplicate pages (on-page 45→75), and writing image alt text (35→65). These are all within Squarespace's capabilities and don't require a platform migration.

---

*Report generated by Claude Code SEO Audit — March 19, 2026*
