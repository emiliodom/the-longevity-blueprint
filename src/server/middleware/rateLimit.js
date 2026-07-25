/**
 * middleware/rateLimit.js — request-rate limiters
 *
 * Two different concerns live here:
 *   - authLimiter: classic per-IP brute-force / signup-spam protection on
 *     login and register, backed by express-rate-limit's in-memory store.
 *     Resetting on a server restart is an acceptable trade-off for this —
 *     an attacker timing a redeploy to reset their attempt count is not a
 *     realistic threat model for this app.
 *   - Durable, per-account upload/AI quotas ("wall it so no one exhausts
 *     the app") are intentionally NOT here — an in-memory limiter would
 *     reset on every restart/redeploy, defeating the point of a quota.
 *     Those live in lib/quota.js, backed by the usage_events table.
 */

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please wait a few minutes and try again.' }
});

module.exports = { authLimiter };
