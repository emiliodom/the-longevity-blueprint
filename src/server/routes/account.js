/**
 * routes/account.js — account-level (not profile-scoped) settings & status
 *
 * API surface:
 *   GET /api/account/usage         — current quota usage for uploads + AI analysis
 *   PUT /api/account/password      — change password (requires currentPassword)
 *   PUT /api/account/preferences   — { preferredLanguage }
 */

const express = require('express');
const bcrypt  = require('bcryptjs');

const { query }                = require('../db/pool');
const { requireAuth }          = require('../middleware/auth');
const { getQuotaStatus }       = require('../lib/quota');
const { passwordPolicyError }  = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

router.get('/usage', async (req, res) => {
  const [screenshotUpload, aiAnalyze] = await Promise.all([
    getQuotaStatus(req.session.userId, 'screenshot_upload', 0),
    getQuotaStatus(req.session.userId, 'ai_analyze', 0)
  ]);
  res.json({ screenshotUpload, aiAnalyze });
});

router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Current and new password are required' });

  const pwError = passwordPolicyError(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });

  const rows = await query('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
  res.json({ ok: true });
});

router.put('/preferences', async (req, res) => {
  const { preferredLanguage } = req.body || {};
  if (!preferredLanguage || !/^[a-z]{2}(-[A-Za-z]{2})?$/.test(preferredLanguage))
    return res.status(400).json({ error: 'Invalid language code' });

  await query('UPDATE users SET preferred_language = ? WHERE id = ?', [preferredLanguage, req.session.userId]);
  res.json({ preferredLanguage });
});

module.exports = router;
