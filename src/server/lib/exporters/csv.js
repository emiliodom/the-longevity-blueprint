/**
 * csv.js — week-plan CSV exporter
 */

const { DAY_NAMES, dateForDay, toIsoDateLocal, sortedBlocks } = require('./shared');

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(week) {
  const header = ['Date', 'Day', 'Start Time', 'Type', 'Title', 'Duration (min)', 'Details'];
  const rows = sortedBlocks(week.blocks).map(b => {
    const date = dateForDay(week.week_start_date, b.day_of_week);
    return [
      toIsoDateLocal(date),
      DAY_NAMES[b.day_of_week],
      b.start_time || '',
      b.block_type,
      b.title,
      b.duration_min ?? '',
      b.details ? JSON.stringify(b.details) : ''
    ].map(csvEscape).join(',');
  });
  return [header.join(','), ...rows].join('\r\n') + '\r\n';
}

module.exports = { buildCsv };
