/**
 * pdf.js — week-plan PDF exporter
 *
 * Uses pdfkit (pure JS, no native binary) specifically so this keeps
 * working on shared hosting like Hostinger where compiling a native
 * module (e.g. for a headless-Chrome PDF approach) isn't an option.
 *
 * Route handler owns the PDFDocument lifecycle (pipe to res, call
 * .end()) — this module only draws content onto it.
 */

const { DAY_NAMES, dateForDay, toIsoDateLocal, sortedBlocks } = require('./shared');

function renderWeekPdf(doc, week, profileName, goal) {
  doc.fontSize(20).text('Longevity Blueprint — Weekly Training Plan', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#555')
    .text(`Athlete: ${profileName || '—'}`)
    .text(`Week of: ${week.week_start_date}`);
  if (goal) {
    doc.text(`Goal: ${goal.title}${goal.target_date ? ` (target ${goal.target_date})` : ''}`);
  }
  doc.moveDown(1);
  doc.fillColor('#000');

  const blocksByDay = sortedBlocks(week.blocks).reduce((acc, b) => {
    (acc[b.day_of_week] ||= []).push(b);
    return acc;
  }, {});

  DAY_NAMES.forEach((dayName, dayIndex) => {
    const dayBlocks = blocksByDay[dayIndex] || [];
    const date = dateForDay(week.week_start_date, dayIndex);

    doc.fontSize(14).fillColor('#0369a1').text(`${dayName} — ${toIsoDateLocal(date)}`);
    doc.moveDown(0.2);
    doc.fillColor('#000').fontSize(11);

    if (dayBlocks.length === 0) {
      doc.fillColor('#888').text('Rest day').fillColor('#000');
    } else {
      dayBlocks.forEach(b => {
        const time = b.start_time ? `${b.start_time} — ` : '';
        const duration = b.duration_min ? ` (${b.duration_min} min)` : '';
        doc.text(`• ${time}[${b.block_type}] ${b.title}${duration}`);
      });
    }
    doc.moveDown(0.6);
  });
}

module.exports = { renderWeekPdf };
