/**
 * lib/quota.js — durable per-account usage quotas
 *
 * "Wall it so no one exhausts the app" — screenshot uploads cost disk, AI
 * analyses cost real OpenAI money. Both are capped per account per rolling
 * window, backed by the `usage_events` table (see schema.sql) so the quota
 * survives restarts/redeploys. No account is exempt, including the
 * deployer's own — there is no bypass flag anywhere in this module.
 *
 * Usage pattern in a route:
 *   const status = await getQuotaStatus(userId, 'ai_analyze');
 *   if (!status.allowed) return res.status(429).json({ error: '...', ...status });
 *   ... do the actual costly work ...
 *   await recordUsage(userId, 'ai_analyze');
 */

const crypto = require('crypto');
const { query } = require('../db/pool');

const QUOTAS = {
  screenshot_upload: { limit: 60, windowHours: 24 }, // screenshots per rolling 24h
  ai_analyze:         { limit: 30, windowHours: 24 }  // real OpenAI calls per rolling 24h (cache hits are free and don't count)
};

async function countRecentEvents(userId, kind, windowHours) {
  const rows = await query(
    `SELECT COUNT(*) AS n FROM usage_events
     WHERE user_id = ? AND kind = ? AND created_at >= (NOW() - INTERVAL ? HOUR)`,
    [userId, kind, windowHours]
  );
  return rows[0].n;
}

/**
 * @param {string} userId
 * @param {'screenshot_upload'|'ai_analyze'} kind
 * @param {number} [additional] — check whether adding this many more events would exceed the quota (e.g. a multi-file upload batch)
 */
async function getQuotaStatus(userId, kind, additional = 1) {
  const { limit, windowHours } = QUOTAS[kind];
  const used = await countRecentEvents(userId, kind, windowHours);
  return {
    allowed:   used + additional <= limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    windowHours
  };
}

async function recordUsage(userId, kind, count = 1) {
  for (let i = 0; i < count; i++) {
    await query('INSERT INTO usage_events (id, user_id, kind) VALUES (?, ?, ?)', [crypto.randomUUID(), userId, kind]);
  }
}

module.exports = { QUOTAS, getQuotaStatus, recordUsage };
