/**
 * lib/pexels.js — Pexels photo search, server-side only
 *
 * The Pexels key never reaches the browser — the frontend calls
 * GET /api/images/hero?query=... (routes/images.js), which calls this.
 *
 * Results are cached in-memory per query for 24h: the 22 content pages each
 * have a fixed heroQuery (db.js), so without a cache every user's every
 * page visit would re-hit Pexels for the exact same query — wasteful and
 * a fast way to burn through Pexels' free-tier rate limit (200 req/hour).
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map(); // query -> { value, expiresAt }

/**
 * @param {string} query
 * @returns {Promise<{url: string, photographer: string, pexelsUrl: string} | null>}
 *   null means "no image available" (key not configured, no results, or the
 *   request failed) — callers must treat that as a normal, expected outcome.
 */
async function searchHeroPhoto(query) {
  if (!process.env.PEXELS_API_KEY) return null;

  const cached = cache.get(query);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    // Node 18+ (this app's minimum) has fetch() as a global — no dependency needed.
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
      headers: { Authorization: process.env.PEXELS_API_KEY }
    });
    if (!res.ok) throw new Error(`Pexels API responded ${res.status}`);

    const data  = await res.json();
    const photo = data.photos && data.photos[0];
    const value = photo
      ? { url: photo.src.large, photographer: photo.photographer, pexelsUrl: photo.url }
      : null;

    cache.set(query, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (err) {
    console.warn(`[pexels] search failed for "${query}":`, err.message);
    // Cache the miss too, briefly-ish, so a flaky moment doesn't turn into a
    // request storm against Pexels for the rest of the process lifetime.
    cache.set(query, { value: null, expiresAt: Date.now() + 5 * 60 * 1000 });
    return null;
  }
}

module.exports = { searchHeroPhoto };
