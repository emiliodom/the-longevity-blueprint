/**
 * calculators.js — Vue 3 Calculator Components
 *
 * Each component:
 *   - Accepts a `:profile` prop (object) with keys:
 *       age, weight (kg), height (cm), gender ('male'|'female'),
 *       restingHr, maxHr
 *   - Initializes local reactive state from profile on mount
 *   - Emits no events — purely display/calc
 *
 * Register all components before mounting the main Vue app.
 */

/* global app */

// ── BMR Calculator ────────────────────────────────────────────────────────

app.component('BmrCalc', {
  props: ['profile'],
  data() {
    return {
      weight: this.profile?.weight  || 70,
      height: this.profile?.height  || 170,
      age:    this.profile?.age     || 30,
      gender: this.profile?.gender  || 'male',
      activity: 1.55
    };
  },
  computed: {
    bmr() {
      const base = (10 * this.weight) + (6.25 * this.height) - (5 * this.age);
      return Math.round(this.gender === 'female' ? base - 161 : base + 5);
    },
    tdee() { return Math.round(this.bmr * this.activity); },
    deficit() { return Math.max(0, this.tdee - 2100); }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">BMR / TDEE Calculator</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
          <input v-model.number="weight" type="number" class="calc-input" min="30" max="200">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Height (cm)</label>
          <input v-model.number="height" type="number" class="calc-input" min="100" max="250">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Age</label>
          <input v-model.number="age" type="number" class="calc-input" min="15" max="100">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Gender</label>
          <select v-model="gender" class="calc-input">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-xs text-slate-400 mb-1 block">Activity Multiplier</label>
        <select v-model.number="activity" class="calc-input">
          <option :value="1.2">Sedentary (desk job, no exercise)</option>
          <option :value="1.375">Light (1–3 days/week)</option>
          <option :value="1.55">Moderate (3–5 days/week) — Your Level</option>
          <option :value="1.725">Active (6–7 days/week)</option>
          <option :value="1.9">Athlete (2× daily training)</option>
        </select>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="stat-box">
          <div class="text-2xl font-bold text-sky-400">{{ bmr.toLocaleString() }}</div>
          <div class="text-xs text-slate-400 mt-1">BMR (kcal/day)</div>
        </div>
        <div class="stat-box">
          <div class="text-2xl font-bold text-emerald-400">{{ tdee.toLocaleString() }}</div>
          <div class="text-xs text-slate-400 mt-1">TDEE (kcal/day)</div>
        </div>
        <div class="stat-box">
          <div class="text-2xl font-bold text-amber-400">{{ deficit.toLocaleString() }}</div>
          <div class="text-xs text-slate-400 mt-1">vs. 2,100 deficit</div>
        </div>
      </div>
    </div>
  `
});

// ── Body Fat Calculator (US Navy) ─────────────────────────────────────────

app.component('BodyFatCalc', {
  props: ['profile'],
  data() {
    return {
      gender: this.profile?.gender || 'male',
      height: this.profile?.height || 170,
      neck:   38,
      waist:  85,
      hip:    95
    };
  },
  computed: {
    bf() {
      if (this.gender === 'male') {
        const v = 495 / (1.0324 - 0.19077 * Math.log10(this.waist - this.neck) + 0.15456 * Math.log10(this.height)) - 450;
        return isFinite(v) && v > 0 ? v.toFixed(1) : '—';
      } else {
        const v = 495 / (1.29579 - 0.35004 * Math.log10(this.waist + this.hip - this.neck) + 0.22100 * Math.log10(this.height)) - 450;
        return isFinite(v) && v > 0 ? v.toFixed(1) : '—';
      }
    },
    category() {
      const v = parseFloat(this.bf);
      if (isNaN(v)) return '';
      if (this.gender === 'male') {
        if (v < 6)  return { label: 'Essential Fat', color: 'text-amber-400' };
        if (v < 14) return { label: 'Athletic', color: 'text-emerald-400' };
        if (v < 18) return { label: 'Fitness', color: 'text-sky-400' };
        if (v < 25) return { label: 'Average', color: 'text-yellow-400' };
        return { label: 'Obese', color: 'text-red-400' };
      } else {
        if (v < 14) return { label: 'Essential Fat', color: 'text-amber-400' };
        if (v < 21) return { label: 'Athletic', color: 'text-emerald-400' };
        if (v < 25) return { label: 'Fitness', color: 'text-sky-400' };
        if (v < 32) return { label: 'Average', color: 'text-yellow-400' };
        return { label: 'Obese', color: 'text-red-400' };
      }
    }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">Body Fat % — US Navy Method</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Gender</label>
          <select v-model="gender" class="calc-input">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Height (cm)</label>
          <input v-model.number="height" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Neck (cm)</label>
          <input v-model.number="neck" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Waist (cm)</label>
          <input v-model.number="waist" type="number" class="calc-input">
        </div>
      </div>
      <div v-if="gender === 'female'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Hip (cm) — females only</label>
          <input v-model.number="hip" type="number" class="calc-input">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-box">
          <div class="text-3xl font-bold text-sky-400">{{ bf }}%</div>
          <div class="text-xs text-slate-400 mt-1">Estimated Body Fat</div>
        </div>
        <div class="stat-box flex flex-col items-center justify-center">
          <div class="text-lg font-bold" :class="category.color">{{ category.label }}</div>
          <div class="text-xs text-slate-400 mt-1">Classification</div>
        </div>
      </div>
      <p class="text-xs text-slate-500">Measure at the widest point. Neck just below larynx. Waist at navel. All values in cm.</p>
    </div>
  `
});

// ── Macro Calculator ──────────────────────────────────────────────────────

app.component('MacroCalc', {
  props: ['profile'],
  data() {
    return {
      weight:   this.profile?.weight || 70,
      calories: 2100,
      goal:     'recomp'
    };
  },
  computed: {
    protein() { return Math.round(this.weight * 1.6); },
    proteinCals() { return this.protein * 4; },
    fat() { return Math.round((this.calories * 0.22) / 9); },
    fatCals() { return this.fat * 9; },
    carbs() { return Math.round((this.calories - this.proteinCals - this.fatCals) / 4); }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">Macro Targets</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Body Weight (kg)</label>
          <input v-model.number="weight" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Total Calories</label>
          <input v-model.number="calories" type="number" class="calc-input">
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="stat-box">
          <div class="text-2xl font-bold text-sky-400">{{ protein }}g</div>
          <div class="text-xs text-slate-400 mt-1">Protein</div>
          <div class="text-xs text-slate-500">{{ proteinCals }} kcal</div>
        </div>
        <div class="stat-box">
          <div class="text-2xl font-bold text-amber-400">{{ carbs }}g</div>
          <div class="text-xs text-slate-400 mt-1">Carbs</div>
          <div class="text-xs text-slate-500">{{ carbs * 4 }} kcal</div>
        </div>
        <div class="stat-box">
          <div class="text-2xl font-bold text-emerald-400">{{ fat }}g</div>
          <div class="text-xs text-slate-400 mt-1">Fat</div>
          <div class="text-xs text-slate-500">{{ fatCals }} kcal</div>
        </div>
      </div>
      <p class="text-xs text-slate-500">Protein = 1.6 g/kg body weight. Fat = 22% of total calories. Carbs fill remaining.</p>
    </div>
  `
});

// ── VO₂ Max Calculator (Cooper 12-min or Garmin estimate) ─────────────────

app.component('Vo2MaxCalc', {
  props: ['profile'],
  data() {
    return {
      method:  'cooper',
      distance: 2800,
      age:      this.profile?.age || 30,
      gender:   this.profile?.gender || 'male',
      restHr:   this.profile?.restingHr || 60,
      maxHr:    this.profile?.maxHr || 185
    };
  },
  computed: {
    vo2() {
      if (this.method === 'cooper') {
        return ((this.distance - 504.9) / 44.73).toFixed(1);
      } else {
        return ((15 * this.maxHr) / this.restHr).toFixed(1);
      }
    },
    percentile() {
      const v = parseFloat(this.vo2);
      if (this.gender === 'male') {
        if (this.age < 40) {
          if (v >= 52) return { label: 'Superior', color: 'text-emerald-400' };
          if (v >= 45) return { label: 'Excellent', color: 'text-sky-400' };
          if (v >= 38) return { label: 'Good', color: 'text-blue-400' };
          if (v >= 34) return { label: 'Fair', color: 'text-yellow-400' };
          return { label: 'Poor', color: 'text-red-400' };
        } else {
          if (v >= 49) return { label: 'Superior', color: 'text-emerald-400' };
          if (v >= 42) return { label: 'Excellent', color: 'text-sky-400' };
          if (v >= 36) return { label: 'Good', color: 'text-blue-400' };
          if (v >= 31) return { label: 'Fair', color: 'text-yellow-400' };
          return { label: 'Poor', color: 'text-red-400' };
        }
      } else {
        if (v >= 45) return { label: 'Superior', color: 'text-emerald-400' };
        if (v >= 38) return { label: 'Excellent', color: 'text-sky-400' };
        if (v >= 32) return { label: 'Good', color: 'text-blue-400' };
        if (v >= 26) return { label: 'Fair', color: 'text-yellow-400' };
        return { label: 'Poor', color: 'text-red-400' };
      }
    }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">VO₂ Max Estimator</h3>
      <div class="flex gap-2">
        <button @click="method='cooper'" class="pill-btn" :class="method==='cooper' ? 'active-run' : ''">Cooper 12-min</button>
        <button @click="method='hr'"     class="pill-btn" :class="method==='hr'     ? 'active-run' : ''">HR Ratio</button>
      </div>
      <div v-if="method === 'cooper'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Distance run in 12 min (m)</label>
          <input v-model.number="distance" type="number" class="calc-input" step="50">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Age</label>
          <input v-model.number="age" type="number" class="calc-input">
        </div>
      </div>
      <div v-else class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Max HR (bpm)</label>
          <input v-model.number="maxHr" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Resting HR (bpm)</label>
          <input v-model.number="restHr" type="number" class="calc-input">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-box">
          <div class="text-3xl font-bold text-sky-400">{{ vo2 }}</div>
          <div class="text-xs text-slate-400 mt-1">mL/kg/min</div>
        </div>
        <div class="stat-box flex flex-col items-center justify-center">
          <div class="text-lg font-bold" :class="percentile.color">{{ percentile.label }}</div>
          <div class="text-xs text-slate-400 mt-1">Fitness Category</div>
        </div>
      </div>
    </div>
  `
});

// ── Heart Rate Zone Calculator ────────────────────────────────────────────

app.component('HrZoneCalc', {
  props: ['profile'],
  data() {
    return {
      maxHr:  this.profile?.maxHr     || 185,
      restHr: this.profile?.restingHr || 60
    };
  },
  computed: {
    hrr() { return this.maxHr - this.restHr; },
    zones() {
      const karvonen = (lo, hi) => ({
        lo: Math.round(this.restHr + this.hrr * lo),
        hi: Math.round(this.restHr + this.hrr * hi)
      });
      return [
        { label: 'Zone 1 — Active Recovery', ...karvonen(0.50, 0.60), color: 'text-sky-300',   bg: 'bg-sky-900/30'   },
        { label: 'Zone 2 — Aerobic Base',     ...karvonen(0.60, 0.70), color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
        { label: 'Zone 3 — Tempo',            ...karvonen(0.70, 0.80), color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
        { label: 'Zone 4 — Threshold',        ...karvonen(0.80, 0.90), color: 'text-orange-400', bg: 'bg-orange-900/30' },
        { label: 'Zone 5 — VO₂ Max',          ...karvonen(0.90, 1.00), color: 'text-red-400',    bg: 'bg-red-900/30'   }
      ];
    }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">Heart Rate Zones (Karvonen)</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Max HR (bpm)</label>
          <input v-model.number="maxHr"  type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Resting HR (bpm)</label>
          <input v-model.number="restHr" type="number" class="calc-input">
        </div>
      </div>
      <div class="space-y-2">
        <div v-for="z in zones" :key="z.label" class="flex items-center justify-between rounded-lg px-3 py-2" :class="z.bg">
          <span class="text-sm font-medium" :class="z.color">{{ z.label }}</span>
          <span class="text-sm font-bold text-white">{{ z.lo }}–{{ z.hi }} bpm</span>
        </div>
      </div>
    </div>
  `
});

// ── One-Rep Max Calculator ────────────────────────────────────────────────

app.component('OneRmCalc', {
  props: ['profile'],
  data() {
    return { weight: 60, reps: 5 };
  },
  computed: {
    epley()   { return this.reps === 1 ? this.weight : Math.round(this.weight * (1 + this.reps / 30)); },
    brzycki() { return Math.round(this.weight / (1.0278 - 0.0278 * this.reps)); },
    avg()     { return Math.round((this.epley + this.brzycki) / 2); },
    percentages() {
      return [100, 95, 90, 85, 80, 75, 70, 65].map(pct => ({
        pct,
        kg: Math.round(this.avg * pct / 100)
      }));
    }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">1-Rep Max Estimator</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Weight Lifted (kg)</label>
          <input v-model.number="weight" type="number" class="calc-input" step="2.5">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Reps Performed</label>
          <input v-model.number="reps" type="number" class="calc-input" min="1" max="20">
        </div>
      </div>
      <div class="stat-box">
        <div class="text-3xl font-bold text-sky-400">{{ avg }} kg</div>
        <div class="text-xs text-slate-400 mt-1">Estimated 1RM (Epley + Brzycki avg)</div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <div v-for="p in percentages" :key="p.pct" class="stat-box py-2">
          <div class="text-base font-bold text-slate-200">{{ p.kg }}kg</div>
          <div class="text-xs text-slate-500">{{ p.pct }}%</div>
        </div>
      </div>
    </div>
  `
});

// ── Ideal Weight Calculator (multiple formulas) ───────────────────────────

app.component('IdealWeightCalc', {
  props: ['profile'],
  data() {
    return {
      height: this.profile?.height || 170,
      gender: this.profile?.gender || 'male'
    };
  },
  computed: {
    hIn() { return this.height / 2.54; },
    over5ft() { return Math.max(0, this.hIn - 60); },
    results() {
      const h = this.height, g = this.gender, o = this.over5ft;
      return [
        { formula: 'Devine',    kg: Math.round(g==='male' ? 50   + 2.3  * o : 45.5 + 2.3  * o) },
        { formula: 'Robinson',  kg: Math.round(g==='male' ? 52   + 1.9  * o : 49   + 1.7  * o) },
        { formula: 'Miller',    kg: Math.round(g==='male' ? 56.2 + 1.41 * o : 53.1 + 1.36 * o) },
        { formula: 'Hamwi',     kg: Math.round(g==='male' ? 48   + 2.7  * o : 45.5 + 2.2  * o) },
        { formula: 'BMI 22',    kg: Math.round(22 * (h / 100) ** 2) }
      ];
    },
    average() {
      return Math.round(this.results.reduce((s, r) => s + r.kg, 0) / this.results.length);
    }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">Ideal Weight (5 Formulas)</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Height (cm)</label>
          <input v-model.number="height" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Gender</label>
          <select v-model="gender" class="calc-input">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-2">
        <div v-for="r in results" :key="r.formula" class="stat-box py-2">
          <div class="text-base font-bold text-slate-200">{{ r.kg }} kg</div>
          <div class="text-xs text-slate-500">{{ r.formula }}</div>
        </div>
      </div>
      <div class="stat-box">
        <div class="text-2xl font-bold text-emerald-400">{{ average }} kg</div>
        <div class="text-xs text-slate-400 mt-1">Average Ideal Weight</div>
      </div>
    </div>
  `
});

// ── Belly Fat Measurement Calculator (page 22) ────────────────────────────

app.component('BellyMeasureCalc', {
  props: ['profile'],
  data() {
    return {
      height: this.profile?.height || 170,
      waist:  85,
      hip:    95,
      gender: this.profile?.gender || 'male'
    };
  },
  computed: {
    whtr() { return (this.waist / this.height).toFixed(3); },
    whtrRisk() {
      const v = this.waist / this.height;
      if (v < 0.40) return { label: 'Possibly Underweight', color: 'text-yellow-400' };
      if (v < 0.50) return { label: 'Healthy', color: 'text-emerald-400' };
      if (v < 0.60) return { label: 'Overweight Risk', color: 'text-orange-400' };
      return { label: 'High Cardiovascular Risk', color: 'text-red-400' };
    },
    whr() { return (this.waist / this.hip).toFixed(2); },
    whrRisk() {
      const v = this.waist / this.hip;
      if (this.gender === 'male') {
        if (v < 0.90) return { label: 'Low Risk', color: 'text-emerald-400' };
        if (v < 1.00) return { label: 'Moderate Risk', color: 'text-yellow-400' };
        return { label: 'High Risk', color: 'text-red-400' };
      } else {
        if (v < 0.80) return { label: 'Low Risk', color: 'text-emerald-400' };
        if (v < 0.85) return { label: 'Moderate Risk', color: 'text-yellow-400' };
        return { label: 'High Risk', color: 'text-red-400' };
      }
    },
    whoClass() {
      if (this.gender === 'male') {
        if (this.waist < 94)  return { label: 'No Increased Risk', color: 'text-emerald-400' };
        if (this.waist < 102) return { label: 'Increased Risk', color: 'text-yellow-400' };
        return { label: 'Substantially Increased Risk', color: 'text-red-400' };
      } else {
        if (this.waist < 80)  return { label: 'No Increased Risk', color: 'text-emerald-400' };
        if (this.waist < 88)  return { label: 'Increased Risk', color: 'text-yellow-400' };
        return { label: 'Substantially Increased Risk', color: 'text-red-400' };
      }
    },
    targetWaist() { return Math.round(this.height * 0.499); },
    waistToLose()  { return Math.max(0, this.waist - this.targetWaist); }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">Belly Fat Risk Calculator</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Gender</label>
          <select v-model="gender" class="calc-input">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Height (cm)</label>
          <input v-model.number="height" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Waist (cm) — at navel</label>
          <input v-model.number="waist" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Hip (cm) — widest point</label>
          <input v-model.number="hip" type="number" class="calc-input">
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="stat-box">
          <div class="text-2xl font-bold text-sky-400">{{ whtr }}</div>
          <div class="text-xs text-slate-400 mt-0.5">Waist-to-Height</div>
          <div class="text-xs font-semibold mt-1" :class="whtrRisk.color">{{ whtrRisk.label }}</div>
        </div>
        <div class="stat-box">
          <div class="text-2xl font-bold text-purple-400">{{ whr }}</div>
          <div class="text-xs text-slate-400 mt-0.5">Waist-to-Hip</div>
          <div class="text-xs font-semibold mt-1" :class="whrRisk.color">{{ whrRisk.label }}</div>
        </div>
        <div class="stat-box">
          <div class="text-xl font-bold text-slate-200">{{ waist }} cm</div>
          <div class="text-xs text-slate-400 mt-0.5">WHO Classification</div>
          <div class="text-xs font-semibold mt-1" :class="whoClass.color">{{ whoClass.label }}</div>
        </div>
      </div>

      <div v-if="waistToLose > 0" class="info-notice">
        <strong>Target waist ≤ {{ targetWaist }} cm</strong> (50% of height, WHtR ≤ 0.50).
        You are currently <strong>{{ waistToLose }} cm above the low-risk threshold</strong>.
        Each 1 cm of waist reduction corresponds to approximately 0.5–1 kg of visceral fat loss.
      </div>
      <div v-else class="alert-green">
        ✓ Your waist-to-height ratio is in the healthy range. Maintain through consistent training.
      </div>

      <p class="text-xs text-slate-500">Sources: WHO Expert Consultation 2008. Ashwell & Hsieh, Int J Food Sci Nutr, 2005.</p>
    </div>
  `
});

// ── Environment & Caloric Adjustment Calculator (page 24) ─────────────────

app.component('EnvCalc', {
  props: ['profile'],
  data() {
    return {
      elevation:    1500,
      humidity:     70,
      temperature:  22,
      vo2max:       45,
      runDuration:  30,
      weight:       this.profile?.weight || 70
    };
  },
  computed: {
    altitudeFactor() {
      const above = Math.max(0, this.elevation - 1500);
      return Math.max(0.70, 1 - (above / 100) * 0.0032);
    },
    adjustedVo2() {
      return (this.vo2max * this.altitudeFactor).toFixed(1);
    },
    vo2Reduction() {
      return ((1 - this.altitudeFactor) * 100).toFixed(1);
    },
    heatFactor() {
      const tempExtra  = Math.max(0, this.temperature - 25);
      const humFactor  = this.humidity > 75 ? 1.12 : this.humidity > 60 ? 1.06 : 1.0;
      return (1 + tempExtra * 0.012) * humFactor;
    },
    baseCals() {
      return Math.round(this.weight * 8.3 * (this.runDuration / 60));
    },
    adjustedCals() {
      return Math.round(this.baseCals * this.heatFactor);
    },
    extraCals() {
      return this.adjustedCals - this.baseCals;
    },
    baseHydration() {
      return (0.5 * (this.runDuration / 30)).toFixed(1);
    },
    adjustedHydration() {
      return (parseFloat(this.baseHydration) * this.heatFactor).toFixed(1);
    },
    heatIndex() {
      const T = this.temperature, H = this.humidity;
      if (T < 27) return T.toFixed(1);
      const hi = -8.78469475556 + 1.61139411 * T + 2.33854883889 * H
                 - 0.14611605 * T * H - 0.012308094 * T * T
                 - 0.0164248277778 * H * H + 0.002211732 * T * T * H
                 + 0.00072546 * T * H * H - 0.000003582 * T * T * H * H;
      return hi.toFixed(1);
    },
    paceWarning() {
      return this.temperature > 25 || this.humidity > 70;
    },
    paceAdjustment() {
      const tempAdj = Math.max(0, this.temperature - 25) * 6;
      const humAdj  = this.humidity > 75 ? 12 : this.humidity > 60 ? 6 : 0;
      return Math.round(tempAdj + humAdj);
    }
  },
  template: `
    <div class="module-card mt-4 space-y-4">
      <h3 class="text-sky-400 font-semibold text-sm uppercase tracking-wider">Environment & Performance Calculator</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Elevation (m)</label>
          <input v-model.number="elevation" type="number" step="50" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Humidity (%)</label>
          <input v-model.number="humidity" type="number" min="0" max="100" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Temperature (°C)</label>
          <input v-model.number="temperature" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Your VO₂ Max (ml/kg/min)</label>
          <input v-model.number="vo2max" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Run Duration (min)</label>
          <input v-model.number="runDuration" type="number" class="calc-input">
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">Body Weight (kg)</label>
          <input v-model.number="weight" type="number" step="0.5" class="calc-input">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="stat-box">
          <div class="text-xl font-bold text-sky-400">{{ adjustedVo2 }}</div>
          <div class="text-xs text-slate-400 mt-1">Effective VO₂ Max</div>
          <div v-if="vo2Reduction > 0" class="text-xs text-orange-400">−{{ vo2Reduction }}%</div>
        </div>
        <div class="stat-box">
          <div class="text-xl font-bold text-emerald-400">{{ adjustedCals }}</div>
          <div class="text-xs text-slate-400 mt-1">Calories Burned</div>
          <div v-if="extraCals > 0" class="text-xs text-orange-400">+{{ extraCals }} from heat</div>
        </div>
        <div class="stat-box">
          <div class="text-xl font-bold text-blue-400">{{ adjustedHydration }}L</div>
          <div class="text-xs text-slate-400 mt-1">Hydration Needed</div>
          <div class="text-xs text-slate-500">vs {{ baseHydration }}L baseline</div>
        </div>
        <div class="stat-box">
          <div class="text-xl font-bold" :class="parseFloat(heatIndex) > 32 ? 'text-red-400' : 'text-yellow-400'">{{ heatIndex }}°C</div>
          <div class="text-xs text-slate-400 mt-1">Heat Index</div>
          <div class="text-xs text-slate-500">(Feels Like)</div>
        </div>
      </div>

      <div v-if="paceWarning" class="warn-notice">
        <strong>Pace adjustment recommended:</strong> In these conditions, slow your Zone 2 pace by
        approximately <strong>{{ paceAdjustment }} sec/km</strong> to maintain the same true physiological
        intensity. This is not weakness — it is evidence-based environmental calibration.
      </div>
    </div>
  `
});
