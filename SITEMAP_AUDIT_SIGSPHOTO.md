# Sitemap Audit Report: sigsphoto.ca

**Date:** March 19, 2026
**Auditor:** Claude Code (Sitemap Architecture Specialist)
**Site:** https://sigsphoto.ca
**Platform:** Squarespace
**Sitemap URL:** https://sigsphoto.ca/sitemap.xml

---

## Executive Summary

The sitemap at sigsphoto.ca contains **91 URLs** in a single flat file (445 KB). All 91 URLs return HTTP 200, which is good. However, the audit uncovered **7 issues** ranging from critical to informational, including a canonical mismatch, blog tag pages that should not be indexed, potential content overlap between pages, and deprecated XML attributes that add unnecessary bloat.

---

## 1. Structural Validation

| Check | Result | Status |
|-------|--------|--------|
| XML well-formed | Yes (parsed cleanly) | PASS |
| Sitemap type | Flat `<urlset>` (not a sitemap index) | PASS |
| URL count | 91 (limit: 50,000) | PASS |
| File size | 445 KB (limit: 50 MB uncompressed) | PASS |
| HTTPS protocol | All 91 URLs use HTTPS | PASS |
| Trailing slash consistency | 0 with trailing slash, 91 without | PASS |
| Duplicate URLs | None detected | PASS |
| Namespace declarations | Correct (sitemap 0.9, image 1.1, video 1.1, xhtml) | PASS |
| robots.txt declaration | `Sitemap: https://sigsphoto.ca/sitemap.xml` present | PASS |

---

## 2. HTTP Status Code Results

**All 91 URLs return HTTP 200.** No 404s, no redirects, no 5xx errors.

| Status Code | Count |
|-------------|-------|
| 200 | 91 |
| 301/302 | 0 |
| 404 | 0 |
| 410 | 0 |
| 5xx | 0 |

---

## 3. Issues Found

### ISSUE 1 — CRITICAL: Canonical Mismatch on /home

**Severity:** Critical
**URL in sitemap:** `https://sigsphoto.ca/home`
**Canonical tag on /home:** `https://sigsphoto.ca` (pointing to root)
**Root URL canonical:** `https://sigsphoto.ca` (self-referencing)

The sitemap lists `/home` but its own canonical tag points to the root URL `https://sigsphoto.ca`. Meanwhile, the root URL is **not in the sitemap at all**. This means Google sees the sitemap declaring a non-canonical URL, which wastes crawl budget and sends conflicting signals.

**Recommendation:** Replace `https://sigsphoto.ca/home` in the sitemap with `https://sigsphoto.ca`. On Squarespace, this is auto-generated, so the fix is to set the homepage to use `/` as its URL slug, or add a URL redirect from `/home` to `/`.

---

### ISSUE 2 — HIGH: 9 Blog Tag/Category Pages Should Not Be in Sitemap

**Severity:** High
**Count:** 9 pages

These are thin taxonomy pages that list blog posts filtered by tag or category. They have no unique content (approximately 2,736-2,860 words each, nearly identical — the word count is mostly shared boilerplate/navigation). They are not noindexed. Google generally considers these low-value index pages.

**Pages:**
```
/blog/category/Engagement+Photography
/blog/tag/Candid
/blog/tag/Wedding
/blog/tag/bridal+party
/blog/tag/Extreme+Photoshop+Weddings
/blog/tag/Yorkville
/blog/tag/Jean%27s+Daily
/blog/tag/Engagement+Photography
/blog/tag/Winter+Engagement
```

**Additional problem:** These 9 pages are all missing `<lastmod>` dates.

**Recommendation:** Remove these from the sitemap. In Squarespace, go to Settings > SEO > and enable "Hide tag and category pages from search engines" (noindex). If Squarespace auto-includes them in the sitemap, at minimum ensure they carry `noindex` so Google ignores the sitemap signal.

---

### ISSUE 3 — MEDIUM: Coverage Gap — Root URL Missing

**Severity:** Medium
**Missing URL:** `https://sigsphoto.ca/`

The most important page on the site (the homepage at `/`) is not in the sitemap. Only `/home` is listed, but `/home` canonicalizes to `/`. This means the canonical URL of the homepage has no sitemap entry.

**Also missing:** `https://sigsphoto.ca/privacy-policy` (returns HTTP 200, not in sitemap).

**Recommendation:** Ensure `https://sigsphoto.ca/` replaces `/home` in the sitemap. Add `/privacy-policy` if it should be indexed.

---

### ISSUE 4 — MEDIUM: Suspected Duplicate/Overlapping Content Pages

**Severity:** Medium
**Impact:** Keyword cannibalization, wasted crawl budget

Several page pairs appear to cover the same topic with overlapping content:

| Page A | Page B | Concern |
|--------|--------|---------|
| `/drones` (4,124 words) | `/drone-photography` (6,267 words) | Both target "drone wedding photography" |
| `/engagement` (2,777 words) | `/engagement2` (3,033 words) | Both titled "Engagement Photography" variants |
| `/engagement` | `/engagement-photography` (4,192 words) | Three engagement pages total |
| `/toronto-wedding-photography` (7,099 words) | `/toronto-wedding-photographer` (6,357 words) | Nearly identical keyword targets |
| `/1871-berkeley-church` (4,364 words) | `/1871-berkeley-church-gallery` (2,770 words) | Same venue, info vs gallery |
| `/pricelist-2025` | `/pricelist-2025-special` | Two price list pages |
| `/millpond` | `/mill-pond-park-engagement-spot` | Same location |
| `/kleinburg-engagement-photography` | `/kleinburg-engagement-meeting-spot` | Same location |

**Recommendation:** Audit these pairs. For each, decide which is the primary page and either:
- Consolidate content into one page and redirect the other (301), or
- Ensure they target clearly different intents and interlink properly

---

### ISSUE 5 — MEDIUM: Batch-Updated lastmod Dates (Accuracy Suspect)

**Severity:** Medium (Low impact but signals to Google that lastmod is unreliable)

The lastmod dates show clear batch-update patterns, suggesting Squarespace updates them whenever any site change is published, not when individual pages actually change:

| Date | URLs Updated | Pattern |
|------|-------------|---------|
| 2024-09-04 | 16 | All old blog posts (2016-2023) updated on same day |
| 2026-02-23 | 15 | Mix of service pages, galleries, price lists |
| 2026-03-11 | 10 | Venue pages batch |
| 2026-03-16 | 10 | Location pages + friends + order form |

When Google detects that lastmod dates are unreliable, it ignores them entirely and falls back to its own crawl schedule.

**Recommendation:** This is a Squarespace platform limitation. Not directly fixable without custom sitemap generation. Acceptable as-is, but be aware that Google likely ignores these dates.

---

### ISSUE 6 — INFO: Deprecated `<changefreq>` and `<priority>` Tags Present

**Severity:** Informational
**Impact:** None (Google ignores these entirely)

All 91 entries include `<changefreq>` and `<priority>` tags:

| Tag | Values | Count |
|-----|--------|-------|
| `changefreq: daily` | Top-level pages | 55 |
| `changefreq: monthly` | Blog posts, tags | 36 |
| `priority: 1.0` | 1 page | 1 |
| `priority: 0.75` | Top-level pages | 54 |
| `priority: 0.5` | Blog posts | 36 |

Google has publicly stated it ignores both `changefreq` and `priority`. These add file size (the sitemap is 445 KB; stripping these would save roughly 15-20%).

**Recommendation:** No action needed. Squarespace adds these automatically. They cause no harm.

---

### ISSUE 7 — INFO: Blog Post with Hash Slug

**Severity:** Informational
**URL:** `/blog/2019/10/16/j58md6103cb51ouwfa7i1dz40qun14`
**Actual Title:** "Back to blogging"

This blog post has a machine-generated hash as its URL slug instead of a human-readable slug. It still returns 200 and has real content, but the URL provides zero SEO signal.

**Recommendation:** In Squarespace, edit this blog post's URL slug to something descriptive like `back-to-blogging`. Set up a 301 redirect from the old hash URL.

---

## 4. Location Page Quality Gate Assessment

**Location pages found: 8**

| URL | Word Count | Meta Description | Canonical OK |
|-----|-----------|-----------------|--------------|
| `/vaughan-wedding-photographer` | ~4,968 | Missing | Yes |
| `/mississauga-wedding-photographer` | ~9,301 | Missing | Yes |
| `/markham-wedding-photographer` | ~4,912 | Missing | Yes |
| `/richmond-hill-wedding-photographer` | ~4,925 | Missing | Yes |
| `/brampton-wedding-photographer` | ~4,928 | Missing | Yes |
| `/scarborough-wedding-photographer` | ~5,744 | Missing | Yes |
| `/hamilton-wedding-photographer` | ~4,932 | Missing | Yes |
| `/toronto-wedding-photographer` | ~6,357 | Missing | Yes |

**Quality Gate Status: PASS (8 pages, threshold is 30)**

At 8 location pages, this is well under the 30-page warning threshold. However, note the following concerns:

1. **All 8 pages are missing meta descriptions.** This is a missed SEO opportunity since these are high-intent local landing pages.

2. **Word counts are suspiciously similar** (4,912 to 4,968 for 5 of 8 pages), which suggests template-based content with city names swapped. The exception is Mississauga (9,301 words) and Toronto (6,357 words), which appear to have more unique content.

3. **All 8 were batch-updated on 2026-03-16**, reinforcing the template concern.

4. **Overlap:** `/toronto-wedding-photographer` (location page) overlaps with `/toronto-wedding-photography` (service page, 7,099 words). These cannibalize each other for "Toronto wedding photography" keywords.

**Recommendation:** Ensure each location page includes genuinely unique content: local venue mentions, real wedding stories from that city, neighborhood-specific tips, and actual portfolio images from weddings shot there. Add meta descriptions to all 8 pages. Resolve the Toronto page overlap.

---

## 5. Venue Page Assessment

**Total venue-related pages: 15** (7 under `/venues/`, 8 standalone)

The venue pages are split between two URL structures, which is inconsistent:

**Under /venues/ (newer, organized):**
- `/venues/arlington-estate`
- `/venues/borgata`
- `/venues/bellvue-manor`
- `/venues/terrace-banquet`
- `/venues/venu-event-space-9kyp2`
- `/venues/royal-ambassador`

**Standalone (older, flat):**
- `/paradise-banquet-hall-photography-and-video`
- `/1871-berkeley-church`
- `/parkview-manor`
- `/royalvenetian`
- `/bradford-barn`
- `/canoe`
- `/mint-room`

**Quality Gate Status: SAFE** -- Venue pages with real photography from actual events, venue-specific details, and unique images are considered safe at scale (similar to product pages).

**Recommendation:** Migrate standalone venue pages under `/venues/` for consistent URL structure. Set up 301 redirects from old URLs. The slug `/venu-event-space-9kyp2` has a Squarespace hash suffix -- clean it up to `/venues/venu-event-space`.

---

## 6. Image Sitemap Extension

**72 of 91 URLs** include image sitemap extensions, referencing **1,172 total images** (average 16.3 images per page when present). This is a strong positive for Google Image Search visibility, especially important for a photography business.

**Status: PASS** -- Good use of image extensions.

---

## 7. URL Inventory by Category

| Category | Count | Notes |
|----------|-------|-------|
| Blog posts | 22 | 21 posts + 1 index |
| Blog tags/categories | 9 | Should be removed |
| Venue pages | 15 | Split between /venues/ and root |
| Location pages | 8 | Under quality threshold |
| Engagement pages | 7 | 3 potentially overlapping |
| Gallery pages | 8 | Various portfolio sections |
| Service/info pages | 22 | About, contact, drones, albums, etc. |
| **Total** | **91** | |

---

## 8. Recommendations Summary (Priority Order)

### Must Fix

1. **Replace `/home` with `/`** in sitemap (canonical mismatch -- the most important page on the site has no valid sitemap entry)
2. **Remove 9 blog tag/category pages** from sitemap (or noindex them in Squarespace SEO settings)
3. **Add meta descriptions** to all 8 location pages

### Should Fix

4. **Consolidate duplicate content pages** -- audit the 8 page-pairs listed in Issue 4, pick winners, redirect losers
5. **Rename hash-slug blog post** (`j58md6103cb51ouwfa7i1dz40qun14` to `back-to-blogging`) with 301 redirect
6. **Resolve Toronto keyword cannibalization** between `/toronto-wedding-photography` and `/toronto-wedding-photographer`
7. **Add `/privacy-policy`** to sitemap (if indexable)

### Nice to Have

8. **Migrate standalone venue pages** under `/venues/` for URL consistency
9. **Clean up Squarespace hash in venue slug** (`venu-event-space-9kyp2`)
10. **Ensure location page content uniqueness** exceeds 60% between pages (check with a diff tool or content similarity scorer)

---

## 9. robots.txt Assessment

The robots.txt is Squarespace's default configuration. It correctly:
- Disallows `/config`, `/search`, `/account`, `/api/`, `/static/`
- Disallows query parameter variations (`?tag=`, `?author=`, `?format=`)
- Declares the sitemap location
- Blocks AI training crawlers (ClaudeBot, GPTBot, CCBot, etc.)

**Note:** The robots.txt disallows `?tag=` query parameters, but the sitemap includes `/blog/tag/` path-based tag pages. These are not the same pattern, so the tag pages are technically allowed by robots.txt, which makes it even more important to either noindex them or remove them from the sitemap.

**Status: PASS** (no conflicts with sitemap, but tag page handling needs attention)

---

## 10. Overall Score

| Area | Score | Notes |
|------|-------|-------|
| XML Validity | 10/10 | Clean parse, valid structure |
| HTTP Status Codes | 10/10 | All 200, no broken URLs |
| Canonical Alignment | 6/10 | /home mismatch is significant |
| Content Coverage | 7/10 | Root URL missing, privacy policy missing |
| Content Quality | 7/10 | Location page similarity, duplicates |
| Tag/Category Hygiene | 4/10 | 9 thin pages that should not be indexed |
| lastmod Accuracy | 5/10 | Batch-updated, unreliable |
| Image Extensions | 10/10 | Excellent image sitemap usage |
| robots.txt Alignment | 9/10 | Minor tag page inconsistency |
| **Overall** | **7.5/10** | Good foundation, fixable issues |

---

*Report generated March 19, 2026. Data collected via live HTTP requests to sigsphoto.ca.*
