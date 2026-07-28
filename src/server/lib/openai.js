/**
 * lib/openai.js — day/week/month training analyzer
 *
 * Server-side only: the API key never reaches the browser (see routes/ai.js).
 * Screenshots are read from disk and sent as base64 image parts alongside
 * the athlete's logged data to a vision-capable chat completions model, so
 * Strava/insights screenshots actually get "read", not just stored.
 */

const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');

const MODEL      = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_IMAGES = 10; // bounds request size / cost per analysis

let client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function fileToDataUrl(absPath) {
  const ext  = path.extname(absPath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const b64  = fs.readFileSync(absPath).toString('base64');
  return `data:image/${mime};base64,${b64}`;
}

function buildIntro(scope, profile, logs) {
  const lines = [];
  lines.push(`You are a longevity/endurance coach analyzing training, nutrition, and supplement data for athlete "${profile.name}" (age ${profile.age ?? '?'}, ${profile.gender ?? 'unspecified'}).`);
  lines.push(`Analysis scope: ${scope}.`);
  lines.push('');
  lines.push('Workout log entries:');
  lines.push(logs.length
    ? logs.map(l => `- ${l.date} [${l.type}] duration=${l.duration ?? '?'}min distance=${l.distance ?? '-'}km weight=${l.weight ?? '-'}kg reps=${l.reps ?? '-'} notes="${l.notes ?? ''}"`).join('\n')
    : '(none logged in this period)');
  lines.push('');
  lines.push('Daily Tracker activities follow below, one per day, each with its own name/notes and — where attached — screenshot images immediately after it. Strava links are intentionally omitted here (they aren\'t fetchable) — go only off each activity\'s name, notes, and any attached screenshot.');
  return lines.join('\n');
}

function buildTrailer(meals, supplementsTaken) {
  const lines = [];
  lines.push('');
  lines.push('Meals logged (Food Planner, Guatemalan-diet based):');
  if (!meals.length) {
    lines.push('(none logged in this period)');
  } else {
    const byDate = {};
    meals.forEach(m => { (byDate[m.date] ||= { kcal: 0, protein: 0, carbs: 0, fat: 0 }); const d = byDate[m.date]; d.kcal += m.macros.kcal; d.protein += m.macros.protein; d.carbs += m.macros.carbs; d.fat += m.macros.fat; });
    lines.push(Object.entries(byDate).map(([date, t]) =>
      `- ${date}: ${Math.round(t.kcal)} kcal, ${Math.round(t.protein)}g protein, ${Math.round(t.carbs)}g carbs, ${Math.round(t.fat)}g fat`
    ).join('\n'));
  }
  lines.push('');
  lines.push('Supplements taken (Supplements tracker):');
  if (!supplementsTaken.length) {
    lines.push('(none logged in this period)');
  } else {
    const byDate = {};
    supplementsTaken.forEach(s => { (byDate[s.date] ||= []).push(s.name); });
    lines.push(Object.entries(byDate).map(([date, names]) => `- ${date}: ${names.join(', ')}`).join('\n'));
  }
  lines.push('');
  lines.push('Give a concise, actionable analysis covering training, nutrition, and supplement adherence together: what went well, what to adjust, and any red flags (overtraining signals, missed sessions, injury risk, under/over-eating relative to the logged target). Keep it under 350 words.');
  return lines.join('\n');
}

// One text block per day, scoped down to that day's individual activities —
// each activity's own screenshot(s) are placed as image content parts
// immediately after its text line, not dumped in one pile at the end, so
// the model can associate a given screenshot with the activity it actually
// belongs to. Deliberately excludes stravaUrl — see buildIntro()'s note;
// only name/notes/screenshots feed the analysis.
function buildActivityContent(trackersByDate, imageBudget) {
  const content = [];
  let remainingImages = imageBudget;

  trackersByDate.forEach(day => {
    if (!day.activities.length) {
      content.push({ type: 'text', text: `- ${day.date}: (no activity logged)` });
      return;
    }
    content.push({ type: 'text', text: `- ${day.date}:` });
    day.activities.forEach(activity => {
      const label = activity.name || 'Untitled activity';
      content.push({ type: 'text', text: `  • Activity: "${label}" — notes: "${activity.notes || ''}"` });
      const usable = activity.screenshotPaths.filter(p => fs.existsSync(p)).slice(0, remainingImages);
      usable.forEach(p => content.push({ type: 'image_url', image_url: { url: fileToDataUrl(p) } }));
      remainingImages -= usable.length;
    });
  });

  return content;
}

/**
 * @param {{scope:string, profile:object, logs:object[], trackersByDate:{date:string,activities:{name:string,notes:string,screenshotPaths:string[]}[]}[], meals:object[], supplementsTaken:object[]}} input
 * @returns {Promise<{summary:string, raw:object}>}
 */
async function analyze({ scope, profile, logs, trackersByDate, meals = [], supplementsTaken = [] }) {
  const openai = getClient();
  if (!openai) throw new Error('OPENAI_API_KEY is not configured on the server');

  const content = [
    { type: 'text', text: buildIntro(scope, profile, logs) },
    ...buildActivityContent(trackersByDate, MAX_IMAGES),
    { type: 'text', text: buildTrailer(meals, supplementsTaken) }
  ];

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content }],
    max_tokens: 700
  });

  return { summary: completion.choices[0].message.content, raw: completion };
}

module.exports = { analyze };
