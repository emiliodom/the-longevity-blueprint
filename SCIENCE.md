# Scientific Reference — Longevity Blueprint

> This document backs every formula, threshold, and recommendation in the app with primary research.
> Use it to audit calculations, explain choices to others, or extend the protocol.

---

## 1. Metabolic Rate Formulas

### Mifflin-St Jeor (BMR) — App Implementation
The most validated resting metabolic rate formula for non-athlete adults.

```
Male:    BMR = (10 × kg) + (6.25 × cm) - (5 × age) + 5
Female:  BMR = (10 × kg) + (6.25 × cm) - (5 × age) - 161
```

**Source:** Mifflin MD, et al. "A new predictive equation for resting energy expenditure in healthy individuals." *American Journal of Clinical Nutrition*, 1990;51(2):241–247.

**Validation:** In a 2005 Academy of Nutrition meta-analysis (Frankenfield et al., *Journal of the American Dietetic Association*), Mifflin-St Jeor was the most accurate formula for non-obese individuals, predicting measured RMR within 10% in 82% of cases.

### Activity Multipliers (TDEE)
| Factor | Multiplier | Definition |
|---|---|---|
| Sedentary | 1.2 | Desk job, no deliberate exercise |
| Light | 1.375 | 1–3 days/week moderate activity |
| Moderate | 1.55 | 3–5 days/week (this protocol's baseline) |
| Active | 1.725 | 6–7 days/week hard training |
| Athlete | 1.9 | Twice-daily training or manual labor |

**Note:** NEAT (Non-Exercise Activity Thermogenesis) varies up to 700 kcal/day between individuals at the same body weight and intentional exercise level (Levine JA, *Science*, 2005). The multiplier is a population average — individual calibration via weekly weight trend is more accurate.

### RMR vs BMR vs TDEE
- **BMR**: Energy to sustain organ function at complete rest, post-absorptive state (12h fast, 12h no movement). Rarely measured clinically.
- **RMR** (Resting Metabolic Rate): Measured under relaxed (not strict BMR) conditions. ~10% higher than true BMR. What the formula actually estimates.
- **TDEE** (Total Daily Energy Expenditure): RMR × activity multiplier. Includes TEF (~10% of calories from digestion) + EAT (exercise) + NEAT.

---

## 2. Body Composition

### US Navy Body Fat Method
Validated against DEXA scanning in active military populations. Gender-specific formulas account for sex-based fat distribution differences.

```
Male:
  BF% = 495 / (1.0324 - 0.19077×log10(waist - neck) + 0.15456×log10(height)) - 450

Female:
  BF% = 495 / (1.29579 - 0.35004×log10(waist + hip - neck) + 0.22100×log10(height)) - 450
```
All measurements in centimetres.

**Source:** Hodgdon JA, Beckett MB. "Prediction of percent body fat for US Navy men and women from body circumferences and height." *Naval Health Research Center Technical Reports*, 1984.

**Accuracy:** Mean absolute error ±3–4% vs DEXA for general population. Most accurate when measurements are taken at the widest point (waist at navel, neck just below larynx, hip at iliac crest for females).

### Body Fat Classification Standards (Male)
| Category | Range | Metabolic Implication |
|---|---|---|
| Essential fat | < 5% | Hormonal disruption risk |
| Athletic | 6–13% | Optimal testosterone/estrogen ratio |
| Fitness | 14–17% | Low chronic disease risk |
| Average | 18–24% | Moderate metabolic risk |
| Obese | ≥ 25% | High all-cause mortality risk |

**Source:** American Council on Exercise (ACE) body fat percentage categories, validated against NIH mortality data.

### Waist-to-Height Ratio (WHtR)
```
WHtR = Waist circumference (cm) / Height (cm)
```

| WHtR | Risk Level |
|---|---|
| < 0.40 | Possibly underweight |
| 0.40–0.50 | Healthy |
| 0.50–0.60 | Overweight / elevated risk |
| > 0.60 | Obese / high cardiovascular risk |

**Source:** Ashwell M, Hsieh SD. "Six reasons why the waist-to-height ratio is a rapid and effective global indicator for health risks of obesity and how its use could simplify the international public health message on obesity." *International Journal of Food Sciences and Nutrition*, 2005;56(5):303–307.

**Key finding:** WHtR > 0.5 predicted metabolic syndrome with higher sensitivity than BMI (AUC = 0.77 vs 0.69) in a meta-analysis of 78 studies (n = 300,000+).

### WHO Waist Circumference Standards
| Gender | No Increased Risk | Increased Risk | Substantially Increased |
|---|---|---|---|
| Male | < 94 cm | 94–101 cm | ≥ 102 cm |
| Female | < 80 cm | 80–87 cm | ≥ 88 cm |

**Source:** WHO. "Waist Circumference and Waist–Hip Ratio: Report of a WHO Expert Consultation." Geneva, 2008.

### Waist-to-Hip Ratio (WHR)
| Gender | Low Risk | Moderate Risk | High Risk |
|---|---|---|---|
| Male | < 0.90 | 0.90–0.99 | ≥ 1.00 |
| Female | < 0.80 | 0.80–0.84 | ≥ 0.85 |

### Visceral vs Subcutaneous Fat
- **Subcutaneous fat** (under the skin, "love handles"): Metabolically less dangerous, secretes adiponectin (anti-inflammatory).
- **Visceral fat** (around organs, deep abdominal): Secretes IL-6, TNF-alpha, and resistin directly into the portal vein → drives hepatic insulin resistance and systemic inflammation.
- **Clinical correlation:** Every 1 cm increase in waist circumference is associated with a 2% increase in cardiovascular mortality risk (Lean ME et al., *BMJ*, 1995).
- **Reduction timeline:** Visceral fat is metabolically active and responds faster to intervention than subcutaneous fat. With a 500 kcal/day deficit + aerobic exercise, visceral fat declines at ~2× the rate of subcutaneous fat (Ohkawara K et al., *International Journal of Obesity*, 2007).

---

## 3. Cardiovascular Science

### Karvonen Heart Rate Reserve Method
More accurate than simple age-based formulas because it accounts for individual fitness level (resting HR).

```
HRR  = Max HR - Resting HR
Zone % = Resting HR + (HRR × intensity %)
```

**Source:** Karvonen MJ, Kentala E, Mustala O. "The effects of training on heart rate." *Annales Medicinae Experimentalis et Biologiae Fenniae*, 1957;35(3):307–315.

### Heart Rate Zone Definitions
| Zone | Karvonen % | Primary Fuel | Adaptation |
|---|---|---|---|
| 1 — Active Recovery | 50–60% | Fat (90%) | Capillary density |
| 2 — Aerobic Base | 60–70% | Fat (85%) | Mitochondrial biogenesis, LT1 |
| 3 — Tempo | 70–80% | Mixed | Lactate clearance capacity |
| 4 — Threshold | 80–90% | Carbs (75%) | VO₂ max, LT2 |
| 5 — VO₂ Max | 90–100% | Carbs (95%) | Cardiac output |

**Zone 2 Mandate:** Iñigo San Millán, PhD (Sports Science Director, UAE Team Emirates) has published extensively on Zone 2's role in mitochondrial biogenesis and fat oxidation capacity. At Zone 2 intensity, PDK4 (pyruvate dehydrogenase kinase 4) is maximally upregulated, preferentially oxidizing fat and sparing glycogen.

### Maximum Heart Rate Formulas

**Fox Formula (1971):** `Max HR = 220 - Age`
- Most widely cited but least accurate (SD = ±10–12 bpm)
- **Source:** Fox SM, Naughton JP, Haskell WL. "Physical activity and the prevention of coronary heart disease." *Annals of Clinical Research*, 1971.

**Tanaka Formula (2001) — App Implementation:** `Max HR = 208 - (0.7 × Age)`
- More accurate, validated across 514 studies (n = 18,712)
- SD = ±7 bpm, more accurate for older adults and trained individuals
- **Source:** Tanaka H, Monahan KD, Seals DR. "Age-predicted maximal heart rate revisited." *Journal of the American College of Cardiology*, 2001;37(1):153–156.

### True Resting HR vs Sleeping HR
- **Resting HR**: Measured while awake, seated, calm for 5+ minutes, preferably morning before activity. This is the clinically relevant metric for Karvonen calculations.
- **Sleeping HR**: Recorded by wearables during sleep. Typically 10–30% lower than true resting HR due to parasympathetic dominance and physiological overnight processes (melatonin-mediated vasodilation).
- **Risk:** Using sleeping HR as resting HR in Karvonen formula shifts ALL zones 10–20 bpm too low, causing systematic under-training.

**Source:** Myllymäki T et al. "Effects of vigorous late-night exercise on sleep quality and cardiac autonomic activity." *Journal of Sleep Research*, 2011.

### VO₂ Max — The Longevity Metric
```
Cooper 12-min test:  VO₂ max = (Distance_m - 504.9) / 44.73
Karvonen HR ratio:   VO₂ max = (15 × Max HR) / Resting HR
```

**Longevity correlation:** A 2018 study in *JAMA Network Open* (Kokkinos et al., n = 122,007) found that individuals in the "high" VO₂ max category had a 45% lower all-cause mortality risk than "below average." Moving from "low" to "moderate" reduces risk by 31%. VO₂ max is a stronger predictor of longevity than smoking history, hypertension, or Type 2 diabetes diagnosis.

### VO₂ Max Classification (ml/kg/min) — Males
| Age 20–39 | Age 40–49 | Category |
|---|---|---|
| ≥ 52 | ≥ 49 | Superior |
| 45–51 | 42–48 | Excellent |
| 38–44 | 36–41 | Good |
| 34–37 | 31–35 | Fair |
| < 34 | < 31 | Poor |

**Source:** American College of Sports Medicine (ACSM). *ACSM's Guidelines for Exercise Testing and Prescription*, 11th ed.

---

## 4. Strength Science

### 1-Rep Max Estimation Formulas

**Epley (1985):** `1RM = Weight × (1 + reps/30)`
**Brzycki (1993):** `1RM = Weight / (1.0278 - 0.0278 × reps)`

The app averages both for improved accuracy. Valid for reps ≤ 10; accuracy degrades above 12 reps.

**Source:** Epley B. "Poundage chart." *Boyd Epley Workout*, 1985. Brzycki M. "Strength testing: predicting a one-rep max from reps to fatigue." *Journal of Physical Education, Recreation & Dance*, 1993.

### Hypertrophy Mechanisms
Two primary molecular pathways (they cannot be maximally activated simultaneously):

**mTOR (mechanistic target of rapamycin):**
- Activated by: mechanical tension (resistance training), leucine, insulin
- Effect: signals ribosomes to synthesize contractile proteins (actin, myosin)
- Upstream activator: Akt/PKB → inhibits mTORC1's natural suppressor TSC2
- **For the athlete:** maximally activated by heavy compound lifts (3–5 × failure proximity) + post-workout protein feeding

**AMPK (AMP-activated protein kinase):**
- Activated by: low cellular energy (fasting, Zone 2 cardio), metformin
- Effect: stimulates mitochondrial biogenesis (via PGC-1α), fatty acid oxidation, glucose uptake (GLUT4 translocation)
- Inhibits mTOR via TSC2 phosphorylation (the direct antagonism)
- **For the athlete:** maximally activated by fasted morning Zone 2 runs

**Practical implication:** Fasted morning cardio (AMPK) + evening lifting + protein feeding (mTOR) is the sequence that maximizes both fat oxidation and hypertrophic signaling without mutual inhibition.

**Source:** Hawley JA, Hargreaves M, Joyner MJ, Zierath JR. "Integrative biology of exercise." *Cell*, 2014;159(4):738–749.

### Proximity to Failure (Reps in Reserve)
A systematic review (Schoenfeld BJ, Grgic J. *Journal of Strength and Conditioning Research*, 2019) found that sets taken within 3–5 reps of technical failure (RIR 0–5) produce near-identical hypertrophy regardless of load (30% to 80% of 1RM), provided volume is equated. **The key variable is effort, not load.**

### Leucine Threshold for MPS
Approximately 3 grams of leucine per meal is required to maximally stimulate muscle protein synthesis (MPS). This corresponds to ~30–40g of high-quality protein (whey, eggs, meat). Leucine acts as the "trigger" — below threshold, the ribosomal machinery does not fully engage.

**Protein distribution:** Spreading intake across 3–4 meals produces 25–40% more total daily MPS than 1–2 large meals (Areta JL et al., *Journal of Physiology*, 2013).

---

## 5. Nutritional Science

### Protein Targets
```
Minimum for LBM preservation in deficit:  1.2 g/kg BW
Optimal for recomposition:                 1.6 g/kg BW (McMaster University RCT)
Upper boundary (diminishing returns):      2.2 g/kg BW (Morton RW et al., 2018)
Above 2.2 g/kg:                            No additional hypertrophic benefit
```

**Source:** Morton RW et al. "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength." *British Journal of Sports Medicine*, 2018;52(6):376–384.

### Carbohydrate Role in Endurance
Zone 2–4 running and cycling at moderate-to-high intensities oxidizes glycogen at 1–2g/minute. At a 5km run at Zone 3, approximately 60–80g glycogen is consumed. Severe carbohydrate restriction:
- Reduces training quality → lower accumulated training stress
- Elevates cortisol → promotes visceral fat storage
- Suppresses testosterone by 25% at < 10% kcal from carbs (Lane AR et al., 1997)

### Glycogen Supercompensation
Following glycogen depletion (endurance training), a carbohydrate surplus allows intramuscular glycogen storage to exceed baseline by 10–40%. This "supercompensation" window lasts ~48 hours.

**Source:** Bergström J, Hermansen L, Hultman E, Saltin B. "Diet, muscle glycogen and physical performance." *Acta Physiologica Scandinavica*, 1967;71(2–3):140–150.

### Leptin and Metabolic Adaptation
After 6+ days of caloric restriction, leptin falls ~50%. Reduced leptin:
- Suppresses TSH/thyroid output (~5% RMR reduction per week of restriction)
- Increases ghrelin (hunger hormone)
- Reduces NEAT via CNS signaling
- Elevates cortisol, promoting visceral fat storage

The Sunday surplus resets leptin, partially reversing this adaptation. A single day of isocaloric or surplus eating restores leptin to ~85% of baseline within 12 hours.

**Source:** Dirlewanger M et al. "Effects of short-term carbohydrate or fat overfeeding on energy expenditure and plasma leptin concentrations in healthy female subjects." *International Journal of Obesity*, 2000;24(11):1413–1418.

---

## 6. Supplement Evidence Matrix

| Supplement | Evidence Level | Effect Size | Notes |
|---|---|---|---|
| Creatine monohydrate | ★★★★★ | +8–14% strength, +1–2 kg LBM | 700+ RCTs, Cohen d = 0.24 for LBM |
| Omega-3 EPA/DHA | ★★★★☆ | −15–30% DOMS, omega-3 index improvement | 2+ g/day; anti-inflammatory via SPMs |
| Vitamin D3 + K2 | ★★★★☆ | Corrects deficiency; testosterone in D3-deficient males | Most adults deficient; D3 without K2 drives vascular calcification |
| Magnesium glycinate | ★★★☆☆ | Improved sleep architecture, cramp reduction | Evidence stronger in deficient individuals |
| Whey protein isolate | ★★★★☆ | Identical to food protein when controlling for leucine | No superior benefit to food protein if targets met |
| Hydrolyzed collagen + Vit C | ★★★☆☆ | +2× collagen synthesis in tendons | Shaw G et al., *British Journal of Sports Medicine*, 2019 |
| Caffeine | ★★★★☆ | +3–16% endurance performance | Tolerance develops in 7–10 days; cycle or use sparingly |
| BCAAs (standalone) | ★☆☆☆☆ | Redundant if protein target met | Can't build complete muscle proteins without EAAs |
| HMB | ★★☆☆☆ | Small effect in untrained; negligible in trained | Wilson JM et al.: works mainly in catabolic states |
| Glutamine | ★☆☆☆☆ | No benefit in healthy athletes | Gut support in clinical settings only |
| CLA | ★☆☆☆☆ | < 0.5 kg BF loss; potential insulin resistance worsening | Not recommended |
| Fat burners (proprietary blends) | ★☆☆☆☆ | < 1–2% BF reduction (caffeine-driven); no effect beyond caffeine | FTC action against many brands |
| "Pre-workout" blends | ★★☆☆☆ | Acute performance boost (caffeine + beta-alanine); habituates | Beta-alanine paresthesia is harmless; caffeine effect temporary |
| Detox teas / cleanses | ✗ | No clinical mechanism; liver + kidneys continuously detoxify | No RCTs showing benefit; some contain senna (laxative) |
| Testosterone boosters (non-prescription) | ★☆☆☆☆ | < 5% testosterone increase in most trials; not clinically significant | No substitute for training, protein, sleep, and body fat reduction |

**Evidence key:** ★★★★★ Multiple independent meta-analyses confirm; ✗ No plausible mechanism.

---

## 7. Overtraining Science

### Overtraining Syndrome (OTS) — What It Actually Is
OTS requires **weeks to months** of consecutive overreaching (training load exceeding recovery capacity) without adequate rest. It is characterized by:
- Persistent performance decline despite maintained/reduced training load
- Chronically elevated basal cortisol (> 20 μg/dL fasting)
- Suppressed total testosterone (men: < 300 ng/dL)
- Morning resting HR elevated 5+ bpm above personal baseline
- HRV reduced > 10 ms below personal baseline on multiple consecutive mornings
- Mood disturbances, sleep disruption, immune suppression

**Clinical diagnosis** requires excluding physiological illness, anemia, hormonal disorders, and depression. OTS is over-diagnosed in general fitness populations.

**Source:** Meeusen R et al. "Prevention, Diagnosis, and Treatment of the Overtraining Syndrome: Joint Consensus Statement." *European Journal of Sport Science / Medicine & Science in Sports & Exercise*, 2013.

### The Adaptation Principle (General Adaptation Syndrome)
Selye's GAS (1936) describes three stages:
1. **Alarm** (acute stress): Transient performance decrease, micro-trauma, cortisol spike
2. **Adaptation** (super-compensation): Performance ABOVE baseline if adequate recovery is given
3. **Exhaustion** (chronic overreaching without recovery): Persistent performance decline

**Daily running at Zone 2 does NOT cause OTS.** The body adapts to a stable daily stimulus within 3–6 weeks (mitochondrial density +15–20%, capillary density increase, cardiac hypertrophy). This IS the training goal, not a sign of damage.

**Source:** Selye H. "A syndrome produced by diverse nocuous agents." *Nature*, 1936;138:32.

### Real Injury Risk from Cumulative Load
What IS a genuine risk with daily running:
- **Bone stress reactions/fractures** — insufficient bone remodeling time if mileage increases > 10%/week
- **Achilles tendinopathy** — from sudden increases in training load (Dye's "envelope of function" exceeded)
- **Plantar fasciitis** — from cumulative tension on plantar aponeurosis, especially without proper footwear
- **IT band syndrome** — from repetitive hip abductor weakness + excessive stride crossover

**Prevention principle:** Progressive overload ≤ 10% weekly mileage increase, proper footwear geometry, adequate protein (collagen precursors), collagen + Vit C before training, and following the Rathleff HSR protocol for existing tendon pathology.

### Markers of Accumulated Fatigue (NOT OTS)
| Marker | Acceptable Range | Concern Threshold |
|---|---|---|
| Morning resting HR | ±3 bpm of baseline | > +5 bpm on 2+ consecutive days |
| HRV | ±10% of personal average | > −15% on 2+ consecutive days |
| Perceived exertion at Zone 2 pace | Normal | Significantly elevated for same speed |
| Mood/motivation | Normal variation | Persistent anhedonia (> 1 week) |

---

## 8. Environmental Physiology

### Altitude Effects on VO₂ Max and Performance
At altitude, reduced partial pressure of O₂ (PO₂) decreases oxygen delivery to working muscles.

```
VO₂ max altitude factor ≈ 1 - 0.0032 × max(0, (elevation_m - 1500) / 100)
```

- **Below 1500m:** No measurable effect on VO₂ max
- **1500m (Guatemala City elevation ~1500m):** Baseline — no adjustment needed
- **2000m:** ~1.6% VO₂ max reduction
- **3000m:** ~4.8% VO₂ max reduction
- **4000m:** ~8% VO₂ max reduction

**Acclimatization:** At altitude for 2–4 weeks, EPO increases, red cell mass rises, 2,3-DPG shifts the O₂-Hb dissociation curve rightward (better O₂ offloading). Full acclimatization at 1500m takes 10–14 days.

**Source:** Buskirk ER, Kollias J, Akers RF, Prokop EK, Reategui EP. "Maximal performance at altitude and on return from altitude in conditioned runners." *Journal of Applied Physiology*, 1967;23(2):259–266.

### Humidity and Heat Effects on Performance
**Wet-Bulb Globe Temperature (WBGT)** is the gold standard for environmental heat stress assessment.

At high humidity (> 75%) + temperature > 25°C:
- Evaporative cooling is impaired → core temperature rises faster for same workload
- HR is 5–10 bpm higher at identical pace → perceived intensity increases
- Caloric burn increases ~10–15% due to elevated thermoregulatory demand
- Carbohydrate oxidation rises disproportionately (anaerobic glycolysis supplements aerobic)

**Hydration math:**
- Sweat rate at moderate heat + 70% humidity = 1.0–1.5 L/hour
- Every 1% body weight lost to dehydration = ~8% performance decline (cardiovascular drift)
- Electrolyte replacement threshold: > 60 min of exercise in heat → add sodium (300–500 mg/hr)

**Source:** Armstrong LE, Casa DJ, et al. "American College of Sports Medicine position stand: exertional heat illness during training and competition." *Medicine & Science in Sports & Exercise*, 2007;39(3):556–572.

### Guatemala City Environmental Profile
- **Elevation:** ~1502m (La Reforma area) — borderline altitude, minimal VO₂ max impact
- **Temperature:** Year-round 15–25°C (Highland climate, "eternal spring")
- **Humidity:** Rainy season (May–October) 75–90%, Dry season (November–April) 50–65%
- **Practical impact:** During rainy season, hydration requirements increase ~20%. Add 0.5L water/hour of training. Watch for hyperthermia during afternoon outdoor exercise.

---

## 9. Recovery Science

### Cortisol and Body Composition
Cortisol (stress hormone) is released by the adrenal glands in response to psychological stress, sleep deprivation, caloric restriction, and excessive training.

**Chronic cortisol elevation:**
- Directly stimulates visceral adipocyte lipogenesis (fat creation) via glucocorticoid receptors
- Promotes muscle protein catabolism (gluconeogenesis from amino acids)
- Suppresses GnRH → reduces LH → reduces testosterone by 20–40%
- Impairs insulin sensitivity → elevates fasting glucose

**Cortisol control:** Adequate sleep (7.5–9h), managed caloric deficit (no lower than BMR − 500 kcal/day), Zone 2 over high-intensity, vagal activation techniques (box breathing), and chronically avoiding fasted strenuous exercise (which spikes cortisol 250% above baseline).

### Sleep Architecture and Performance
- **Stage 3 (Slow Wave Sleep / SWS):** 90% of growth hormone (GH) release occurs here. GH stimulates IGF-1 production → tissue repair, protein synthesis, lipolysis. A single night of < 6h sleep cuts GH pulse amplitude by ~50%.
- **REM Sleep:** Consolidates motor learning (critical for movement skills), regulates cortisol, restores prefrontal cortex function (executive decision-making, motivation).
- **Nedeltcheva 2010 RCT:** In a caloric deficit, subjects sleeping 5.5h/night lost 55% MORE LEAN MASS (and 60% less fat) than subjects sleeping 8.5h/night at the same caloric deficit.

**Source:** Nedeltcheva AV et al. "Insufficient sleep undermines dietary efforts to reduce adiposity." *Annals of Internal Medicine*, 2010;153(7):435–441.

### Heart Rate Variability (HRV)
HRV reflects the variation in time between consecutive heartbeats (milliseconds). High HRV = parasympathetic dominance = recovered and adaptive. Low HRV = sympathetic dominance = stressed/fatigued.

- **RMSSD** (Root Mean Square of Successive Differences): The gold standard HRV metric from a single short recording. Strongly correlates with vagal tone.
- **Measurement:** Taken lying still immediately upon waking, before any stimuli (phone, coffee, movement). 60-second or 5-minute measurement.
- **Practical threshold:** If HRV drops > 15ms below personal 7-day average → reduce training to Zone 1 or full rest.

---

## 10. Longevity Biomarkers

### Target Ranges (Longevity vs Conventional Medicine)

| Biomarker | Conventional "Normal" | Longevity Optimal | Clinical Significance |
|---|---|---|---|
| hs-CRP | < 3.0 mg/L | < 0.5 mg/L | Systemic inflammation; linear mortality risk |
| HbA1c | < 5.7% | 4.8–5.0% | 3-month glucose average; each 0.1% above 5.0% raises CV risk |
| Fasting insulin | < 25 µIU/mL | 2–4 µIU/mL | Earliest IR marker; elevated years before glucose dysregulation |
| Fasting glucose | < 100 mg/dL | < 90 mg/dL | Above 95 predicts T2DM 8–10 years early |
| Triglycerides | < 150 mg/dL | < 70 mg/dL | Driven by refined carbs + alcohol; CVD predictor |
| ApoB | < 130 mg/dL | < 80 mg/dL | Counts ALL atherogenic particles; superior to LDL-C |
| LDL-C | < 130 mg/dL | Context-dependent | Less predictive than ApoB when particle size varies |
| HDL-C | > 40 mg/dL (M) | > 60 mg/dL | Inverse CV risk; raised by endurance training and olive oil |
| Testosterone (total, male) | > 300 ng/dL | 600–900 ng/dL | Below 500 in < 50 = associated with metabolic syndrome |
| Free T3 | 2.3–4.2 pg/mL | Upper half of range | Correlates with metabolic rate; low in over-restriction |
| Ferritin | 20–300 ng/mL | 50–100 ng/mL | Iron overload (> 200) causes oxidative stress; below 30 = deficiency |
| 25-OH Vitamin D | > 30 ng/mL | 50–80 ng/mL | Deficiency affects 42% of US adults; impacts 1,000+ gene expressions |

### Annual Lab Panel Recommendation
Minimum annual panel (order as single draw, fasting 12h):
1. CBC with differential
2. CMP (comprehensive metabolic panel — includes glucose, kidney, liver)
3. Lipid panel + ApoB
4. HbA1c + fasting insulin
5. hs-CRP
6. 25-OH Vitamin D
7. Testosterone total + free + SHBG (males)
8. TSH + Free T3
9. Ferritin + iron + TIBC
10. Homocysteine (B vitamin status / methylation)

---

## 11. Ideal Weight Formulas

All app formulas implemented for reference:

| Formula | Male | Female |
|---|---|---|
| Devine (1974) | 50 + 2.3 × (inches over 5ft) | 45.5 + 2.3 × (inches over 5ft) |
| Robinson (1983) | 52 + 1.9 × (inches over 5ft) | 49 + 1.7 × (inches over 5ft) |
| Miller (1983) | 56.2 + 1.41 × (inches over 5ft) | 53.1 + 1.36 × (inches over 5ft) |
| Hamwi (1964) | 48 + 2.7 × (inches over 5ft) | 45.5 + 2.2 × (inches over 5ft) |
| BMI 22 target | 22 × (height_m)² | Same |

The app uses the average of all five. Note: these formulas were derived from insurance mortality data in the 1960s–1980s and don't account for muscle mass. An athlete may be "overweight" by these formulas while having optimal body fat percentage. Use alongside BF% assessment.

---

## 12. Key Research Papers (Full Citations)

1. Mifflin MD et al. Am J Clin Nutr. 1990;51(2):241–7.
2. Tanaka H et al. J Am Coll Cardiol. 2001;37(1):153–6.
3. Kokkinos P et al. JAMA Netw Open. 2022;5(5):e2212397.
4. Morton RW et al. Br J Sports Med. 2018;52(6):376–384.
5. Areta JL et al. J Physiol. 2013;591(9):2319–2331.
6. Schoenfeld BJ, Grgic J. J Strength Cond Res. 2019;33(12):3387–3400.
7. Nedeltcheva AV et al. Ann Intern Med. 2010;153(7):435–441.
8. Hawley JA et al. Cell. 2014;159(4):738–749.
9. Ashwell M, Hsieh SD. Int J Food Sci Nutr. 2005;56(5):303–7.
10. Hodgdon JA, Beckett MB. NHRC Tech Report 84-11. 1984.
11. Shaw G et al. Am J Clin Nutr. 2017;105(1):136–143.
12. Buskirk ER et al. J Appl Physiol. 1967;23(2):259–266.
13. Meeusen R et al. Med Sci Sports Exerc. 2013;45(1):186–205.
14. Levine JA. Science. 2005;307(5709):584.
15. Frankenfield D et al. J Am Diet Assoc. 2005;105(5):775–789.
