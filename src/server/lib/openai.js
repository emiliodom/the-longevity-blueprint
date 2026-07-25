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

function buildPrompt(scope, profile, logs, trackers) {
  const lines = [];
  lines.push(`You are a longevity/endurance coach analyzing training data for athlete "${profile.name}" (age ${profile.age ?? '?'}, ${profile.gender ?? 'unspecified'}).`);
  lines.push(`Analysis scope: ${scope}.`);
  lines.push('');
  lines.push('Workout log entries:');
  lines.push(logs.length
    ? logs.map(l => `- ${l.date} [${l.type}] duration=${l.duration ?? '?'}min distance=${l.distance ?? '-'}km weight=${l.weight ?? '-'}kg reps=${l.reps ?? '-'} notes="${l.notes ?? ''}"`).join('\n')
    : '(none logged in this period)');
  lines.push('');
  lines.push('Daily tracker notes / Strava links:');
  lines.push(trackers.length
    ? trackers.map(t => `- ${t.date}: strava=${t.strava_url ?? '-'} notes="${t.notes ?? ''}"`).join('\n')
    : '(none logged in this period)');
  lines.push('');
  lines.push('Any attached images are Strava/insights screenshots from this period — read visible metrics and graphs from them.');
  lines.push('');
  lines.push('Give a concise, actionable analysis: what went well, what to adjust, and any red flags (overtraining signals, missed sessions, injury risk). Keep it under 300 words.');
  return lines.join('\n');
}

/**
 * @param {{scope:string, profile:object, logs:object[], trackers:object[], screenshotPaths:string[]}} input
 * @returns {Promise<{summary:string, raw:object}>}
 */
async function analyze({ scope, profile, logs, trackers, screenshotPaths }) {
  const openai = getClient();
  if (!openai) throw new Error('OPENAI_API_KEY is not configured on the server');

  const content = [{ type: 'text', text: buildPrompt(scope, profile, logs, trackers) }];
  const usableImages = screenshotPaths.filter(p => fs.existsSync(p)).slice(0, MAX_IMAGES);
  usableImages.forEach(p => content.push({ type: 'image_url', image_url: { url: fileToDataUrl(p) } }));

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content }],
    max_tokens: 700
  });

  return { summary: completion.choices[0].message.content, raw: completion };
}

module.exports = { analyze };
