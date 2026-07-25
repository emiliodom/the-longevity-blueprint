/**
 * routes/images.js — Pexels-backed hero image lookup
 *
 * API surface:
 *   GET /api/images/hero?query=...   → { url, photographer, pexelsUrl } | null
 *
 * `null` (not an error status) means "no image available" — either
 * PEXELS_API_KEY isn't configured, or Pexels returned nothing/failed. The
 * frontend (app.js's loadHeroImage) treats that as normal and falls back to
 * a plain title header, same as pages that never had a hero image at all.
 */

const express = require('express');

const { requireAuth }   = require('../middleware/auth');
const { searchHeroPhoto } = require('../lib/pexels');

const router = express.Router();
router.use(requireAuth);

router.get('/hero', async (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query is required' });
  res.json(await searchHeroPhoto(query));
});

module.exports = router;
