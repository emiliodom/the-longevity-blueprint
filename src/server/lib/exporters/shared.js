/**
 * shared.js — helpers common to all three week-plan exporters
 */

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function dateForDay(weekStartDateIso, dayOfWeek) {
  const d = new Date(`${weekStartDateIso}T00:00:00`);
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * 'YYYY-MM-DD' from local date parts. Deliberately NOT date.toISOString() —
 * that converts to UTC first, which silently rolls the date back a day for
 * any server running east of UTC (local midnight → previous-day UTC time).
 * All three exporters (csv/ics/pdf) must use this for the same reason.
 */
function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toIcsDate(date, timeHHMM) {
  const [h, m] = (timeHHMM || '07:00').split(':').map(Number);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(h)}${pad2(m)}00`;
}

/** Sort blocks by day, then start_time (blocks without a time sort last within their day). */
function sortedBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    if (!a.start_time && !b.start_time) return a.sort_order - b.sort_order;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });
}

module.exports = { DAY_NAMES, dateForDay, toIsoDateLocal, toIcsDate, sortedBlocks };
