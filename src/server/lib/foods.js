/**
 * foods.js — Guatemalan food database for the Calorie & Food Planner
 *
 * Plain config, same pattern as templates.js: editable content, not user
 * data. Deliberately kept to common, everyday Guatemalan staples — the
 * ones already discussed in db.js pages 5/6 (Guatemalan Nutrition Protocol,
 * Sunday Strategic Surplus) — not exotic or hard-to-source ingredients.
 * Macro values are per 100g/100ml (raw or cooked as noted), approximate
 * USDA/standard nutrition-database figures rounded to whole grams/kcal.
 */

const FOOD_TEMPLATES = [
  // Carbohydrates
  { id: 'frijoles_negros',  name: 'Frijoles negros (cooked)',    category: 'carb', kcal: 132, protein: 8.9,  carbs: 23.7, fat: 0.5,  servingG: 150, servingLabel: '1 cup' },
  { id: 'tortilla_maiz',    name: 'Tortilla de maíz',            category: 'carb', kcal: 218, protein: 5.7,  carbs: 44.6, fat: 2.8,  servingG: 30,  servingLabel: '1 tortilla' },
  { id: 'arroz_blanco',     name: 'Arroz blanco (cooked)',       category: 'carb', kcal: 130, protein: 2.7,  carbs: 28.0, fat: 0.3,  servingG: 150, servingLabel: '3/4 cup' },
  { id: 'platano_cocido',   name: 'Plátano cocido',              category: 'carb', kcal: 116, protein: 0.8,  carbs: 31.0, fat: 0.2,  servingG: 120, servingLabel: '1 plátano' },
  { id: 'papa',             name: 'Papa (boiled)',               category: 'carb', kcal: 87,  protein: 1.9,  carbs: 20.0, fat: 0.1,  servingG: 150, servingLabel: '1 medium' },
  { id: 'camote',           name: 'Camote (boiled)',             category: 'carb', kcal: 90,  protein: 2.0,  carbs: 21.0, fat: 0.1,  servingG: 150, servingLabel: '1 medium' },
  { id: 'avena',            name: 'Avena (dry oats)',            category: 'carb', kcal: 389, protein: 16.9, carbs: 66.0, fat: 6.9,  servingG: 40,  servingLabel: '1/2 cup dry' },
  { id: 'pan_frances',      name: 'Pan francés',                 category: 'carb', kcal: 265, protein: 9.0,  carbs: 51.0, fat: 2.0,  servingG: 60,  servingLabel: '1 pieza' },
  { id: 'elote',            name: 'Elote (corn on the cob)',     category: 'carb', kcal: 96,  protein: 3.4,  carbs: 21.0, fat: 1.5,  servingG: 150, servingLabel: '1 elote' },

  // Protein
  { id: 'pechuga_pollo',    name: 'Pechuga de pollo (cooked)',   category: 'protein', kcal: 165, protein: 31.0, carbs: 0,   fat: 3.6,  servingG: 150, servingLabel: '1 pechuga' },
  { id: 'huevo',            name: 'Huevo entero',                category: 'protein', kcal: 155, protein: 13.0, carbs: 1.1, fat: 11.0, servingG: 50,  servingLabel: '1 huevo' },
  { id: 'carne_res_magra',  name: 'Carne de res magra (posta/lomito, cooked)', category: 'protein', kcal: 205, protein: 26.0, carbs: 0, fat: 11.0, servingG: 150, servingLabel: '1 corte' },
  { id: 'pescado_blanco',   name: 'Pescado blanco (cooked)',     category: 'protein', kcal: 105, protein: 22.0, carbs: 0,   fat: 1.5,  servingG: 150, servingLabel: '1 filete' },
  { id: 'queso_fresco',     name: 'Queso fresco',                category: 'protein', kcal: 264, protein: 18.0, carbs: 3.0, fat: 21.0, servingG: 40,  servingLabel: '1 rebanada' },
  { id: 'whey_isolate',     name: 'Whey protein isolate (scoop)', category: 'protein', kcal: 377, protein: 80.0, carbs: 5.0, fat: 2.0,  servingG: 30,  servingLabel: '1 scoop' },

  // Fats
  { id: 'aguacate',         name: 'Aguacate',                    category: 'fat', kcal: 160, protein: 2.0, carbs: 8.5,  fat: 14.7, servingG: 100, servingLabel: '1/2 aguacate' },
  { id: 'crema',            name: 'Crema',                       category: 'fat', kcal: 214, protein: 2.5, carbs: 3.0,  fat: 21.0, servingG: 30,  servingLabel: '2 cdas' },
  { id: 'pepitoria',        name: 'Pepitoria (pumpkin seeds)',   category: 'fat', kcal: 559, protein: 30.0, carbs: 11.0, fat: 49.0, servingG: 30,  servingLabel: '1 puñado' },
  { id: 'aceite_vegetal',   name: 'Aceite vegetal',              category: 'fat', kcal: 884, protein: 0,   carbs: 0,    fat: 100.0, servingG: 10,  servingLabel: '1 cda' },

  // Vegetables / fruit
  { id: 'tomate',           name: 'Tomate',                      category: 'veggie', kcal: 18, protein: 0.9, carbs: 3.9,  fat: 0.2, servingG: 100, servingLabel: '1 tomate' },
  { id: 'cebolla',          name: 'Cebolla',                     category: 'veggie', kcal: 40, protein: 1.1, carbs: 9.3,  fat: 0.1, servingG: 50,  servingLabel: '1/2 cebolla' },
  { id: 'chile_pimiento',   name: 'Chile pimiento',              category: 'veggie', kcal: 31, protein: 1.0, carbs: 6.0,  fat: 0.3, servingG: 50,  servingLabel: '1/2 chile' },
  { id: 'banano',           name: 'Banano',                      category: 'veggie', kcal: 89, protein: 1.1, carbs: 23.0, fat: 0.3, servingG: 120, servingLabel: '1 banano' },

  // Dairy
  { id: 'leche',            name: 'Leche entera',                category: 'dairy', kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, servingG: 240, servingLabel: '1 vaso' }
];

function findFood(id) {
  return FOOD_TEMPLATES.find(f => f.id === id) || null;
}

/** Macro totals (kcal/protein/carbs/fat) for `grams` of the given food id. Returns null if the food id is unknown. */
function macrosFor(foodId, grams) {
  const food = findFood(foodId);
  if (!food) return null;
  const factor = grams / 100;
  return {
    kcal:    Math.round(food.kcal * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs:   Math.round(food.carbs * factor * 10) / 10,
    fat:     Math.round(food.fat * factor * 10) / 10
  };
}

module.exports = { FOOD_TEMPLATES, findFood, macrosFor };
