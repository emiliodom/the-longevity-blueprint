/**
 * supplements.js — evidence-based supplement stack for the Supplements tracker
 *
 * Static content, same pattern as templates.js/foods.js: not user data.
 * Deliberately the *same* 8 supplements already discussed with citations
 * in db.js pages 7 (Minimalist Supplement Stack) and 8 (Developer Athlete
 * Advanced Stack) — this is a trackable checklist for that existing,
 * already-reviewed content, not a new/separate supplement philosophy.
 */

const SUPPLEMENT_TEMPLATES = [
  { id: 'creatine',   name: 'Creatine Monohydrate',        dose: '5g',           timing: 'Daily, any time (with oatmeal)', refPage: 7, evidence: '700+ published studies. Resynthesizes ATP during lifting, pulls intracellular water into muscle, emerging evidence for cognitive neuroprotection.' },
  { id: 'whey',       name: 'Whey Protein Isolate',        dose: '30g',          timing: 'As needed, post-lifting',        refPage: 7, evidence: 'Fastest-digesting, highest-leucine protein source — ~3g leucine per 30g serving, the MPS (muscle protein synthesis) threshold.' },
  { id: 'collagen',   name: 'Hydrolyzed Collagen Peptides', dose: '10–15g + Vitamin C', timing: '60 min pre-run',           refPage: 7, evidence: 'A 2019 RCT (British Journal of Sports Medicine) showed collagen + Vitamin C doubles collagen synthesis in ligaments/tendons — relevant for a daily running streak.' },
  { id: 'omega3',     name: 'Omega-3 EPA/DHA',             dose: '2g+',          timing: 'Daily, with morning eggs',       refPage: 7, evidence: 'Omega-3 index above 8% correlates linearly with reduced all-cause mortality; also reduces post-exercise DOMS 15–30%.' },
  { id: 'd3_k2',      name: 'Vitamin D3 + K2',             dose: 'D3 5000 IU + K2 100–200mcg', timing: 'Daily, with morning eggs', refPage: 7, evidence: 'D3 is a master steroid hormone supporting immune function and testosterone production; K2 directs calcium into bone matrix rather than arteries.' },
  { id: 'lutein',     name: 'Lutein & Zeaxanthin',         dose: '10–20mg lutein', timing: 'Daily',                        refPage: 8, evidence: 'Accumulate in the macula, acting as internal blue-light filtering — reduces eye strain and helps preserve circadian melatonin timing for screen-heavy days.' },
  { id: 'glycine',    name: 'Glycine',                     dose: '3–5g',         timing: 'Pre-sleep',                     refPage: 8, evidence: 'A 2012 Sleep & Biological Rhythms study: 3g pre-sleep drops core body temperature, cuts sleep latency ~13 minutes, lowers morning fasting glucose.' },
  { id: 'magnesium',  name: 'Magnesium Glycinate',         dose: '300–400mg elemental', timing: 'Pre-sleep',               refPage: 8, evidence: 'Cofactor in 300+ enzymatic reactions; glycinate form relaxes the CNS pre-sleep, prevents cramps, improves deep-sleep architecture (also implicated in the Stage-3-SWS growth hormone pulse).' }
];

function findSupplement(id) {
  return SUPPLEMENT_TEMPLATES.find(s => s.id === id) || null;
}

module.exports = { SUPPLEMENT_TEMPLATES, findSupplement };
