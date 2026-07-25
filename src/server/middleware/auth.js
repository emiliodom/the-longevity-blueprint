/**
 * auth.js — session auth guard
 *
 * Attached to every route that reads/writes a specific user's data.
 * Ownership of the underlying row (profile, goal, week, etc.) is still
 * checked in each route handler — this only confirms a session exists.
 */

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

module.exports = { requireAuth };
