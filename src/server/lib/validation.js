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

// Form fields arrive as '' when a user leaves an optional number/date/text
// field blank (Vue's v-model.number leaves failed-to-parse input as the
// literal empty string, not null) — `?? null` alone lets '' straight
// through, and MySQL's DECIMAL/DATE columns reject '' outright
// (ER_TRUNCATED_WRONG_VALUE_FOR_FIELD) rather than silently treating it as
// NULL. Any route binding an optional numeric/date field must run it
// through this first.
function blankToNull(value) {
  return value === '' || value === undefined ? null : value;
}

module.exports = { passwordPolicyError, blankToNull };
