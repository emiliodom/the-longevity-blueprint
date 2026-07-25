/**
 * ics.js — week-plan calendar (.ics) exporter
 *
 * Hand-rolled rather than a dependency: the RFC 5545 subset needed here
 * (one VEVENT per block, no recurrence/timezone components) is a handful
 * of text lines.
 */

const crypto = require('crypto');
const { dateForDay, toIsoDateLocal, toIcsDate, sortedBlocks } = require('./shared');

function foldLine(line) {
  // RFC 5545 §3.1: lines >75 octets should be folded; our lines are short enough in practice,
  // but guard anyway for long details/titles.
  if (line.length <= 75) return line;
  const chunks = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

function escapeText(s) {
  return String(s ?? '').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

function buildIcs(week, profileName) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Longevity Blueprint//Week Training Builder//EN',
    'CALSCALE:GREGORIAN'
  ];

  sortedBlocks(week.blocks).forEach(b => {
    const date  = dateForDay(week.week_start_date, b.day_of_week);
    const start = toIcsDate(date, b.start_time || '07:00');
    const durationMin = b.duration_min || 30;
    // Build endDate from `date` directly (already local midnight for this day) —
    // going through toIsoDateLocal + a fresh `new Date(...)` here (rather than
    // date.toISOString(), which converts to UTC) keeps the local calendar date intact.
    const endDate = new Date(`${toIsoDateLocal(date)}T${(b.start_time || '07:00')}:00`);
    endDate.setMinutes(endDate.getMinutes() + durationMin);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${crypto.randomUUID()}@longevity-blueprint`,
      `DTSTAMP:${toIcsDate(new Date(), '00:00')}`,
      `DTSTART:${start}`,
      `DTEND:${toIcsDate(endDate, `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`)}`,
      foldLine(`SUMMARY:${escapeText(b.title)}`),
      foldLine(`DESCRIPTION:${escapeText(`${b.block_type} block for ${profileName || 'athlete'}`)}`),
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

module.exports = { buildIcs };
