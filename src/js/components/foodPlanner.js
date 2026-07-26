/**
 * foodPlanner.js — Calorie & Food Planner (Guatemalan food, per week)
 *
 * One day is shown at a time (day tabs across the top) — a 7-column grid
 * like the Week Builder's would be too cramped once each day holds 4 meal
 * slots plus a food picker. A compact week-overview strip (kcal vs target
 * per day) still gives the same "plan a whole week" view at a glance.
 *
 * All macro math happens server-side (routes/nutrition.js, from grams +
 * lib/foods.js) — this component only displays what the API returns.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why: plain
 * <script> tags share one global scope, and a top-level `const` here
 * (DAY_LABELS, etc.) would collide with another component file's identically-
 * named one.
 */
(function () {

/* global app, Storage */

function toIsoDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_SLOTS = [
  { id: 'breakfast', label: '🌅 Breakfast' },
  { id: 'lunch',     label: '☀️ Lunch' },
  { id: 'dinner',    label: '🌙 Dinner' },
  { id: 'snack',     label: '🍎 Snack' }
];

app.component('FoodPlanner', {
  props: ['profile'],
  data() {
    return {
      weekStartDate: toIsoDateLocal(mondayOf(new Date())),
      plan: null,
      foods: [],
      activeDay: 0,
      newItem: { mealSlot: 'breakfast', foodId: '', grams: 100 },
      loading: false,
      DAY_LABELS,
      MEAL_SLOTS
    };
  },
  computed: {
    weekEndDate() {
      const d = new Date(`${this.weekStartDate}T00:00:00`);
      d.setDate(d.getDate() + 6);
      return toIsoDateLocal(d);
    },
    foodsByCategory() {
      const groups = {};
      this.foods.forEach(f => { (groups[f.category] ||= []).push(f); });
      return groups;
    },
    activeDayTotals() {
      return this.plan?.totalsByDay?.[this.activeDay] || null;
    }
  },
  async mounted() {
    this.foods = await Storage.getFoods(this.profile.id);
    await this.loadPlan();
  },
  methods: {
    async loadPlan() {
      this.loading = true;
      try { this.plan = await Storage.ensureMealPlan(this.profile.id, this.weekStartDate); }
      finally { this.loading = false; }
    },
    async shiftWeek(days) {
      const d = new Date(`${this.weekStartDate}T00:00:00`);
      d.setDate(d.getDate() + days);
      this.weekStartDate = toIsoDateLocal(mondayOf(d));
      await this.loadPlan();
    },
    dayLabel(dayIndex) {
      const d = new Date(`${this.weekStartDate}T00:00:00`);
      d.setDate(d.getDate() + dayIndex);
      return toIsoDateLocal(d).slice(5);
    },
    itemsFor(dayIndex, mealSlot) {
      if (!this.plan) return [];
      return this.plan.items.filter(i => i.dayOfWeek === dayIndex && i.mealSlot === mealSlot);
    },
    foodName(foodId) {
      return this.foods.find(f => f.id === foodId)?.name || foodId;
    },
    dayPct(day) {
      if (!day) return 0;
      return Math.min(150, Math.round((day.totals.kcal / day.target.calories) * 100));
    },
    async addItem(mealSlot) {
      if (!this.newItem.foodId || !this.newItem.grams) return;
      await Storage.addMealItem(this.profile.id, this.plan.id, {
        dayOfWeek: this.activeDay, mealSlot, foodId: this.newItem.foodId, grams: Number(this.newItem.grams)
      });
      this.newItem.foodId = '';
      await this.loadPlan();
    },
    async removeItem(itemId) {
      await Storage.deleteMealItem(this.profile.id, this.plan.id, itemId);
      await this.loadPlan();
    }
  },
  template: `
    <div class="space-y-5">
      <div class="module-card space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button @click="shiftWeek(-7)" class="pill-btn">‹ Prev</button>
            <span class="text-sm font-semibold text-white">{{ weekStartDate }} → {{ weekEndDate }}</span>
            <button @click="shiftWeek(7)" class="pill-btn">Next ›</button>
          </div>
        </div>

        <!-- Week overview strip: kcal vs target per day -->
        <div class="grid grid-cols-7 gap-2" v-if="plan">
          <button v-for="(label, day) in DAY_LABELS" :key="day" @click="activeDay = day"
                  class="day-overview-pill" :class="activeDay === day ? 'day-overview-active' : ''">
            <div class="text-[10px] text-slate-500">{{ label.slice(0,3) }}</div>
            <div class="text-xs font-semibold" :class="dayPct(plan.totalsByDay[day]) > 110 ? 'text-amber-400' : 'text-emerald-400'">
              {{ plan.totalsByDay[day].totals.kcal }}
            </div>
            <div class="text-[9px] text-slate-600">/ {{ plan.totalsByDay[day].target.calories }}</div>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4" v-if="plan">
        <!-- Selected day: meal slots -->
        <div class="space-y-3">
          <h2 class="text-sky-400 font-semibold uppercase tracking-wider text-sm">{{ DAY_LABELS[activeDay] }} · {{ dayLabel(activeDay) }}</h2>

          <div v-for="slot in MEAL_SLOTS" :key="slot.id" class="module-card space-y-2">
            <h3 class="text-xs font-semibold text-slate-300">{{ slot.label }}</h3>

            <div v-if="itemsFor(activeDay, slot.id).length === 0" class="text-xs text-slate-500">No items yet.</div>
            <div v-for="item in itemsFor(activeDay, slot.id)" :key="item.id"
                 class="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
              <span class="text-slate-300">{{ foodName(item.foodId) }} — {{ item.grams }}g</span>
              <span class="flex items-center gap-2">
                <span class="text-slate-500">{{ item.macros.kcal }} kcal</span>
                <button @click="removeItem(item.id)" class="text-slate-500 hover:text-red-400">✕</button>
              </span>
            </div>

            <div class="flex gap-2 pt-1">
              <select v-model="newItem.foodId" class="calc-input text-xs flex-1">
                <option value="">Add food…</option>
                <optgroup v-for="(items, cat) in foodsByCategory" :key="cat" :label="cat">
                  <option v-for="f in items" :key="f.id" :value="f.id">{{ f.name }}</option>
                </optgroup>
              </select>
              <input v-model.number="newItem.grams" type="number" min="1" class="calc-input text-xs w-20" placeholder="g">
              <button @click="addItem(slot.id)" class="px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition">+</button>
            </div>
          </div>
        </div>

        <!-- Daily totals vs target -->
        <div class="module-card space-y-3 h-fit">
          <h3 class="text-sky-400 font-semibold uppercase tracking-wider text-xs">Daily Totals</h3>
          <div v-if="activeDayTotals" class="space-y-2">
            <div class="stat-box">
              <div class="text-xl font-bold text-emerald-400">{{ activeDayTotals.totals.kcal }} / {{ activeDayTotals.target.calories }}</div>
              <div class="text-xs text-slate-400 mt-1">Calories (kcal)</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="stat-box">
                <div class="text-sm font-bold text-sky-400">{{ activeDayTotals.totals.protein }}g</div>
                <div class="text-[10px] text-slate-400">Protein</div>
                <div class="text-[9px] text-slate-600">target {{ activeDayTotals.target.protein }}g</div>
              </div>
              <div class="stat-box">
                <div class="text-sm font-bold text-amber-400">{{ activeDayTotals.totals.carbs }}g</div>
                <div class="text-[10px] text-slate-400">Carbs</div>
                <div class="text-[9px] text-slate-600">target {{ activeDayTotals.target.carbs }}g</div>
              </div>
              <div class="stat-box">
                <div class="text-sm font-bold text-purple-400">{{ activeDayTotals.totals.fat }}g</div>
                <div class="text-[10px] text-slate-400">Fat</div>
                <div class="text-[9px] text-slate-600">target {{ activeDayTotals.target.fat }}g</div>
              </div>
            </div>
            <p class="text-[10px] text-slate-500 leading-relaxed">
              Target follows the app's standing protocol: 2,100 kcal Mon–Sat, 2,800 kcal Sunday surplus, 1.6g/kg protein, 22% fat.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
});

})();
