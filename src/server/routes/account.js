/**
 * routes/account.js — account-level (not profile-scoped) settings & status
 *
 * API surface:
 *   GET /api/account/usage   — current quota usage for uploads + AI analysis
 *
 * More account-level endpoints (change password, preferences) land here too
 * — see docs/ARCHITECTURE.md for the current list.
 */

const express = require('express');

const { requireAuth }   = require('../middleware/auth');
const { getQuotaStatus } = require('../lib/quota');

const router = express.Router();
router.use(requireAuth);

router.get('/usage', async (req, res) => {
  const [screenshotUpload, aiAnalyze] = await Promise.all([
    getQuotaStatus(req.session.userId, 'screenshot_upload', 0),
    getQuotaStatus(req.session.userId, 'ai_analyze', 0)
  ]);
  res.json({ screenshotUpload, aiAnalyze });
});

module.exports = router;
