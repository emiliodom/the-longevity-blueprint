/**
 * lib/validation.js — shared input validation
 *
 * Password policy lived only in routes/auth.js's register handler before the
 * Settings page needed the exact same rule for password changes — pulled out
 * here so the two can't drift apart.
 */

function passwordPolicyError(password) {
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must be at least 8 characters with 1 uppercase letter and 1 number';
  }
  return null;
}

module.exports = { passwordPolicyError };
