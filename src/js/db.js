/**
 * db.js — Page Content Database
 *
 * All pages of the Longevity Blueprint are defined here as plain data.
 * To add a page: push a new object into DB and add it to the correct NAV_GROUP.
 * To edit content: find the page by id and modify its `content` array.
 *
 * Content item types:
 *   { type: 'paragraph', text: '<HTML string>' }
 *   { type: 'quote',     text: '<HTML string>' }
 *   { type: 'list',      items: ['<HTML string>', ...] }
 *   { type: 'equation',  text: '$$LaTeX$$' }
 *   { type: 'calculator', component: '<ComponentName>' }
 *
 * Available calculator components (defined in calculators.js):
 *   BmrCalc, BodyFatCalc, MacroCalc, Vo2MaxCalc,
 *   HrZoneCalc, OneRmCalc, IdealWeightCalc
 */

/* global DB, NAV_GROUPS */

const DB = [
  {
    id: 1, icon: '🗺️', title: 'Master Blueprint & Longevity',
    heroQuery: 'mountain sunrise trail runner',
    content: [
      { type: 'paragraph', text: '<strong>The Paradigm Shift:</strong> The goal is no longer just finishing rides or maintaining a streak; the ultimate objective is high-performance longevity and aggressive structural recomposition. You are building a massive cardiovascular engine capable of extreme endurance, while simultaneously using precise hypertrophic signals to strip visceral fat and construct a solid, athletic core.' },
      { type: 'paragraph', text: 'Longevity researchers like Seam have achieved a biological age of 10.2 using the "Bor\'s Age" calculator analyzing 22 clinical blood markers. This establishes a scientific precedent: with targeted nutrition, caloric cycling, and specific training stressors, the body can radically reverse its aging markers.' },
      { type: 'paragraph', text: '<strong>Cellular Science:</strong> Recomposition relies on two competing cellular pathways: <strong>mTOR</strong> (mechanistic target of rapamycin) and <strong>AMPK</strong> (AMP-activated protein kinase). Fasting and endurance running stimulate AMPK, promoting mitochondrial biogenesis and fat oxidation. Heavy lifting and protein feeding spike mTOR, signaling muscle protein synthesis. Activating both simultaneously is impossible — our schedule is designed to masterfully oscillate between these states.' },
      { type: 'list', items: [
        '<strong>Daily:</strong> Fasted morning Zone 2 work to maximize AMPK and mitochondrial density, followed by concentrated evening protein feeding to trigger mTOR.',
        '<strong>Weekly:</strong> 3 precise hypertrophic barbell sessions to retain lean mass, combined with the 2,800 kcal Sunday surplus to replenish cellular glycogen and upregulate leptin.',
        '<strong>Monthly:</strong> Track visceral fat reduction via waist circumference, autonomic recovery via resting HR, and progressive overload via the barbell 1RM calculator.'
      ]},
      { type: 'quote', text: 'Biology is not destiny — it is a variable you can engineer. Every decision compounds. The protocol is the product.' }
    ]
  },
  {
    id: 2, icon: '🎯', title: 'Visceral Fat & Biomarkers',
    heroQuery: 'measuring tape waist fitness',
    content: [
      { type: 'paragraph', text: 'Midsection flaccidity is not a cosmetic issue — it is a critical metabolic warning. This is <strong>visceral fat</strong> (VAT). Unlike subcutaneous fat, it accumulates around internal organs and secretes pro-inflammatory cytokines (IL-6, TNF-alpha) directly into the portal vein, driving systemic insulin resistance, cardiovascular disease, and accelerated cellular aging.' },
      { type: 'paragraph', text: 'The male body operates at peak hormonal efficiency between 10–12% body fat. In this zone estrogen conversion via aromatase is minimized, free testosterone is optimized, insulin sensitivity is maximized, and mitochondrial density peaks. Above 15%, toxic adipose tissue raises all-cause mortality risk linearly.' },
      { type: 'list', items: [
        '<strong>The Optimal Range:</strong> 10–12% body fat — estrogen conversion minimized, testosterone optimized, insulin sensitivity maximized.',
        '<strong>The Danger Zone:</strong> Above 15%, all-cause mortality risk rises linearly as adipose tissue becomes a toxic inflammatory organ.',
        '<strong>The Visceral Benchmark:</strong> Average humans carry 500+ grams of visceral fat. Elite optimization pushes this below 50 grams — a 10× reduction achievable within 6–12 months.'
      ]},
      { type: 'calculator', component: 'BodyFatCalc' },
      { type: 'paragraph', text: '<strong>Monthly Tracking:</strong> Waist circumference measured fasted, post-bathroom, every 30 days at the exact same time. A shrinking waistline while maintaining body weight is the definitive signature of successful recomposition.' }
    ]
  },
  {
    id: 3, icon: '⚡', title: 'Caloric Engine & Metabolic Math',
    heroQuery: 'healthy meal prep kitchen',
    content: [
      { type: 'paragraph', text: 'To strip visceral fat without starving your daily 5k or catabolizing muscle tissue, we rely entirely on <strong>precise metabolic math</strong>. Guesswork leads to muscle wasting (too low) or fat storage (too high). We begin with Basal Metabolic Rate — the energy required to keep your organs functioning at complete rest.' },
      { type: 'paragraph', text: 'From BMR, three critical expenditure layers stack: <strong>NEAT</strong> (Non-Exercise Activity Thermogenesis — typing, fidgeting; can vary 700 kcal/day between individuals), <strong>TEF</strong> (Thermic Effect of Food — digesting protein burns up to 30% of its calories), and <strong>EAT</strong> (Exercise Activity Thermogenesis — your 5k and rides).' },
      { type: 'equation', text: '$$ \\text{BMR} = (10 \\times W_{kg}) + (6.25 \\times H_{cm}) - (5 \\times A) + 5 $$' },
      { type: 'calculator', component: 'BmrCalc' },
      { type: 'quote', text: 'Because your weekly activity oscillates between extreme endurance and heavy resistance, your caloric intake must actively fluctuate. Static diets fail dynamic athletes.' },
      { type: 'list', items: [
        '<strong>Standard Recomposition Days (Mon–Sat): 2,100 kcal.</strong> A calculated mild deficit that forces the body to upregulate lipolysis and tap stored visceral fat.',
        '<strong>The Sunday Surplus Protocol: 2,800 kcal.</strong> After immense weekend output, forcefully feed the machine to replenish intramuscular glycogen, blunt cortisol, and protect lean muscle from gluconeogenesis.'
      ]}
    ]
  },
  {
    id: 4, icon: '🧬', title: 'Protein Mandate & Macro Engineering',
    heroQuery: 'grilled chicken protein meal',
    content: [
      { type: 'paragraph', text: 'Optimal recomposition for endurance-heavy athletes centers on moderate-to-high protein, moderate-to-high carbohydrates (for glycogen), and deliberately lower fat. Fat contains 9 kcal/gram — biologically expensive when maintaining a deficit while eating sufficient volume.' },
      { type: 'paragraph', text: 'The primary lever for retaining lean mass in a deficit is hitting the <strong>Leucine Threshold</strong>. Leucine flips the metabolic switch for muscle protein synthesis (MPS). You need ~3g leucine per meal to maximally stimulate MPS, equating to 30–40g of high-quality complete protein per sitting. Spreading across 3–4 feedings produces 25–40% more total daily MPS versus one or two large meals.' },
      { type: 'list', items: [
        '<strong>The Protein Target (McMaster University):</strong> 1.4–1.6 g/kg of body weight is the clinical inflection point. Your profile-specific minimum is calculated below.',
        '<strong>The Carbohydrate Engine:</strong> High-intensity running and cycling run exclusively on carbohydrates. Carb restriction leads to nervous system burnout, plummeting testosterone, and cortisol elevation.',
        '<strong>The Golden Rule:</strong> The only non-negotiable exclusion is ultra-processed foods. Emulsifiers, seed oils, and refined sugars destroy the gut microbiome, spike hs-CRP, and impair mitochondrial function.'
      ]},
      { type: 'calculator', component: 'MacroCalc' },
      { type: 'calculator', component: 'IdealWeightCalc' },
      { type: 'paragraph', text: '<strong>Daily Action:</strong> Pre-plan protein blocks. If you wait until 6 PM and need 90 more grams — you will fail. Distribute into 3–4 discrete 35g blocks throughout the day.' }
    ]
  },
  {
    id: 5, icon: '🇬🇹', title: 'Guatemalan Nutrition Protocol',
    heroQuery: 'latin american food black beans',
    content: [
      { type: 'paragraph', text: 'No expensive imported superfoods required. We construct a mathematically precise "clinically Mediterranean" macro profile using high-density, highly accessible local Guatemalan staples — rich in phytochemicals, antioxidants, polyphenols, and trace minerals essential for massive cellular turnover.' },
      { type: 'list', items: [
        '<strong>Carbohydrates (Glycogen Resupply):</strong> <em>Frijoles negros</em> — anthocyanins and soluble fiber; cook with minimal oil. <em>Plátano cocido</em> for resistant starch. <em>Tortillas de maíz</em> — nixtamalized calcium source; limit 3–4 daily. <em>Arroz blanco</em> for rapid post-workout absorption. <em>Avena</em> and oven-baked sweet potatoes for sustained energy.',
        '<strong>Protein (Structural Blocks):</strong> <em>Pechuga de pollo</em> — 31g protein per 100g. <em>Huevos</em> — biological value of 100. <em>Cortes magros de res</em> (puyazo/viuda) — heme iron and B12 unavailable from plants. <em>Queso fresco</em> for calcium and casein. Whey isolate for post-session gaps.',
        '<strong>Fats (Hormonal Regulation):</strong> <em>Aguacate</em> — monounsaturated oleic acid supporting testosterone biosynthesis. <em>Pepitoria</em> — pumpkin seeds are nature\'s magnesium powerhouse, critical for sleep quality and cramp prevention.'
      ]},
      { type: 'paragraph', text: '<strong>Daily Template:</strong> Breakfast — 3 eggs + black beans + small plantain. Lunch — 150g chicken + rice/beans + vegetables. Dinner — lean beef or chicken + large vegetable volume + avocado. Pre-sleep — casein or cottage cheese for overnight MPS.' }
    ]
  },
  {
    id: 6, icon: '🎲', title: 'Sunday Strategic Surplus',
    heroQuery: 'grilled steak feast table',
    content: [
      { type: 'paragraph', text: 'Sunday is your scientifically-sanctioned caloric surplus day. After a week of maintained deficit, the body\'s metabolic rate begins to downregulate: leptin falls, thyroid output decreases, cortisol rises — the triple threat of metabolic adaptation. The Sunday surplus actively resets all three, preventing the starvation-mode plateau.' },
      { type: 'paragraph', text: 'Research on <strong>glycogen supercompensation</strong> shows a massive carbohydrate influx following depletion allows endurance athletes to load muscle glycogen above baseline. Studies demonstrate 10–15% higher power outputs during Monday and Tuesday sessions following a Sunday surplus.' },
      { type: 'list', items: [
        '<strong>The Rule of One:</strong> One massive, unrestricted meal. A cheat meal must not become a cheat day. The physiological benefit evaporates within 24 hours.',
        '<strong>The Ideal Execution:</strong> A large <em>Churrasco chapín</em> — grilled meat, chirmol, guacamol, roasted potatoes, black beans — is metabolically perfect. An explosion of protein, complex carbs, and healthy fats.',
        '<strong>Damage Control:</strong> For junk food, immediately pair it with 30g whey protein isolate. The whey lowers the meal\'s glycemic index, blunts the insulin spike, and ensures amino acids route surplus calories toward muscle repair.'
      ]},
      { type: 'quote', text: 'The surplus is not a reward. It is a hormonal reset mechanism. Execute it with clinical precision.' }
    ]
  },
  {
    id: 7, icon: '💊', title: 'Minimalist Supplement Stack',
    heroQuery: 'vitamin supplements pills',
    content: [
      { type: 'paragraph', text: 'The supplement industry thrives on complexity. You do not need 200 pills. A minimalist stack of highly researched compounds yields 99% of available physiological benefit. Criteria: multiple independent meta-analyses confirming efficacy, safe at standard doses, addressing a genuine gap in food-based nutrition.' },
      { type: 'list', items: [
        '<strong>Creatine Monohydrate (5g daily):</strong> 700+ published studies. Resynthesizes ATP during lifting, pulls intracellular water into the muscle, and has emerging evidence for cognitive neuroprotection — relevant for a developer-athlete.',
        '<strong>Whey Protein Isolate (30g as needed):</strong> Fastest-digesting, highest-leucine protein source. ~3g leucine per 30g serving — precisely the MPS threshold. Use post-lifting and as a dietary gap filler.',
        '<strong>Hydrolyzed Collagen Peptides (10–15g + Vitamin C, 60 min pre-run):</strong> A 2019 RCT in the <em>British Journal of Sports Medicine</em> showed this combination doubles collagen synthesis in ligaments and tendons. Critical for a daily running streak.',
        '<strong>Omega-3 EPA/DHA (2g+ daily):</strong> Omega-3 index above 8% correlates linearly with reduced all-cause mortality. Also reduces post-exercise DOMS by 15–30%.',
        '<strong>Vitamin D3 (5000 IU) + K2 (100–200mcg):</strong> D3 is a master steroid hormone supporting immune function and testosterone production. K2 directs calcium out of arteries and into bone matrix. Non-negotiable together.'
      ]},
      { type: 'paragraph', text: '<strong>Protocol:</strong> D3/K2 and Omega-3 with morning eggs (fat-soluble absorption). Creatine and Collagen in morning oatmeal. Whey as needed post-lifting.' }
    ]
  },
  {
    id: 8, icon: '🖥️', title: 'Developer Athlete Advanced Stack',
    heroQuery: 'programmer desk night coding',
    content: [
      { type: 'paragraph', text: 'Your professional life is a physiological risk factor. 8–10 hours daily of high-luminance IDE displays and intense cognitive work places immense oxidative stress on ocular nerves and chronically activates the sympathetic nervous system — precisely the system you need to down-regulate for recovery.' },
      { type: 'list', items: [
        '<strong>Lutein & Zeaxanthin — Macular Armor (10–20mg lutein):</strong> These carotenoids accumulate in the macula and act as internal blue-light blocking glasses. Clinical trials show drastic reduction in eye strain, prevention of macular degeneration, and preservation of circadian clock function by limiting late-day blue-light melatonin suppression.',
        '<strong>Glycine (3–5g pre-sleep):</strong> A 2012 <em>Sleep & Biological Rhythms</em> study showed 3g glycine before bed drops core body temperature, reduces sleep latency by 13 minutes, and lowers morning fasting blood glucose — all critical for recovery.',
        '<strong>Magnesium Glycinate (300–400mg elemental):</strong> Magnesium is a cofactor in 300+ enzymatic reactions. Daily sweating from your 5k depletes it faster than diet replenishes. Glycinate form before bed relaxes the CNS, prevents cramps during Sunday rides, and improves deep sleep architecture.'
      ]},
      { type: 'paragraph', text: '<strong>Monthly Assessment:</strong> Eye twitching after coding sessions, persistent headaches, or DOMS lasting 72+ hours are classic magnesium deficiency signals. Temporarily double the dose.' }
    ]
  },
  {
    id: 9, icon: '🏃', title: 'Daily 5k & VO₂ Max Engine',
    heroQuery: 'runner running road morning',
    content: [
      { type: 'paragraph', text: 'Your 5k daily streak is a magnificent testament to consistency. However, execution dictates whether it builds a massive aerobic engine or chronically degrades your joints. Most amateur endurance athletes train in the "grey zone" — too fast to maximize aerobic adaptation, too slow to produce meaningful anaerobic adaptation. This produces chronic fatigue with minimal gain.' },
      { type: 'list', items: [
        '<strong>The Zone 2 Mandate:</strong> The daily streak MUST be strictly moderate-intensity Zone 2 cardio. Keep the pace incredibly relaxed. If you cannot breathe exclusively through your nose, or cannot hold a full sentence aloud, you are above Zone 2. Slow down without ego.',
        '<strong>Mitochondrial Biogenesis:</strong> Zone 2 selectively recruits slow-twitch Type I fibers — metabolically superior, packed with mitochondria, reliant on fat oxidation. Over months, this triggers new mitochondria creation and increases capillary density — the two pillars of elite endurance.',
        '<strong>VO₂ Max — The Longevity Metric:</strong> VO₂ max is the single greatest predictor of longevity in medical literature, surpassing blood pressure, smoking, and BMI. Moving from "below average" to "above average" reduces all-cause mortality by 45%.'
      ]},
      { type: 'calculator', component: 'Vo2MaxCalc' },
      { type: 'quote', text: 'Leave ego at the door. Let slower runners pass you. Your heart rate dictates the pace, not your pride. In 6 months, you will pass them effortlessly.' }
    ]
  },
  {
    id: 10, icon: '👟', title: 'Structural Armor — Shoe Geometry',
    heroQuery: 'running shoes close up',
    content: [
      { type: 'paragraph', text: 'Running 5km daily means feet absorb ground-reaction forces of 2.5–3× body weight per stride. Over 5km at a 1.5m stride length, approximately 3,300 strides accumulate per session. The geometry of your footwear is structural engineering, not cosmetics.' },
      { type: 'list', items: [
        '<strong>The Drop (10–12mm):</strong> Continue standard heel-to-toe drop shoes. Do not adopt zero-drop minimalism. Shifting places immediate extreme strain on the Achilles and plantar fascia — catastrophic given your existing left heel pathology.',
        '<strong>Medial Guide Rails:</strong> As you fatigue at kilometer 4, the arch collapses inward (overpronation), causing internal tibial rotation and medial knee stress. Rigid medial support prevents this collapse when intrinsic foot muscles are fatigued.',
        '<strong>Mileage Tracking:</strong> EVA and PEBA foams permanently compress after 500–600km. Running on dead foam eliminates the primary injury-protective mechanism — energy return. Track mercilessly, rotate two pairs giving each 48 hours to decompress.'
      ]},
      { type: 'paragraph', text: '<strong>Monthly Action:</strong> Log cumulative kilometers per pair in the Exercise Journal. Replace at 500km. The 48-hour rotation also microalternates biomechanical stress, measurably reducing repetitive strain injuries.' }
    ]
  },
  {
    id: 11, icon: '🚴', title: 'Sunday Ride — Power & Endurance',
    heroQuery: 'cyclist road bike',
    content: [
      { type: 'paragraph', text: 'To get faster on road, drop local riders on climbs, and build endurance for 70.3 Ironman ambitions, you must reform power application. The amateur "surge and coast" methodology creates massive lactate spikes, prevents fat adaptation at aerobic threshold, and burns limited neurological "matches" per ride.' },
      { type: 'list', items: [
        '<strong>Flatten the Power Curve:</strong> Ride at steady, unyielding power. A rider who averages 220W for 3 hours is faster than one who surges to 350W and drops to 150W repeatedly.',
        '<strong>The Sweet Spot:</strong> Target 84–90% of FTP (high Zone 3 / low Zone 4). This zone produces the greatest aerobic adaptation per unit of fatigue. It drives VO₂ max upward while remaining sustainable across multi-hour efforts.',
        '<strong>Fueling the Engine:</strong> On rides exceeding 90 minutes, ingest 30–60g carbohydrates per hour. Below this, the body shifts to gluconeogenesis — catabolizing muscle protein for fuel. Use local honey, ripe bananas, or maltodextrin mixes.'
      ]},
      { type: 'calculator', component: 'HrZoneCalc' },
      { type: 'paragraph', text: '<strong>Weekly Protocol:</strong> Set a hard HR ceiling alarm on your Garmin or Samsung watch. If HR climbs above Zone 4 on a standard climb, immediately drop gear and reduce cadence. The alarm is non-negotiable.' }
    ]
  },
  {
    id: 12, icon: '🏋️', title: 'Barbell Recomposition Protocol',
    heroQuery: 'barbell weightlifting gym',
    content: [
      { type: 'paragraph', text: 'Endurance cardio shrinks the body — makes you a lighter version of the same shape. Heavy resistance training architectures the body — changes structural proportions. Renee Landers began lifting at age 60 after spinal fusion surgery and completely transformed her physique, proving that structured mechanical tension is the fountain of youth for connective tissue and bone density at any age.' },
      { type: 'paragraph', text: '<strong>The Science of Hypertrophy:</strong> Muscle grows in response to two stimuli: <strong>mechanical tension</strong> (force on muscle fibers under load) and <strong>proximity to failure</strong> (pushing until the muscle cannot contract). Research by Stuart Phillips and Brad Schoenfeld confirms: reps within 3–5 of muscular failure produce near-identical hypertrophy regardless of rep count. If a set is easy, it is a warm-up.' },
      { type: 'calculator', component: 'OneRmCalc' },
      { type: 'paragraph', text: '<strong>Monthly Objective:</strong> If you lifted a weight for 5 reps last month and now perform 7 reps, your estimated 1RM has increased. The muscle is growing. Progressive overload — more weight, more reps, shorter rest — is the only truth in hypertrophy training.' }
    ]
  },
  {
    id: 13, icon: '💪', title: 'Workout A — Upper Body & Core',
    heroQuery: 'pushup workout gym',
    content: [
      { type: 'paragraph', text: 'This session targets chest, upper back, and core using pushup handles, 17.8 lb dumbbell, ab wheel, and resistance bands. Rest strictly 90 seconds between sets. Perform Monday and Thursday. Target: 35 minutes maximum.' },
      { type: 'list', items: [
        '<strong>Deficit Pushups (handles): 3 sets to absolute failure.</strong> Handles allow chest to drop 10–15cm below hand level, loading pectoral fibers through full range. This loaded stretch is the primary driver of chest hypertrophy. Pause 1 second at the bottom — never bounce.',
        '<strong>Single-Arm Dumbbell Rows (17.8 lbs): 3 × 12–15 per arm.</strong> Pull from the elbow — imagine your hand as a hook. Drives latissimus dorsi hypertrophy, building the V-taper. Add a 1-second peak squeeze.',
        '<strong>Ab Wheel Rollouts: 3 × 10–12.</strong> Roll until spine begins to hyperextend — stop there and reverse. Forces the entire abdominal wall to brace violently against extension, building dense core musculature.',
        '<strong>Band Pull-Aparts: 3 × 20.</strong> Targets rear deltoids and rhomboids — the structural antidote to forward-head posture caused by cycling and desk work.'
      ]},
      { type: 'quote', text: 'Form Cue: At the bottom of each deficit pushup, pause 1 second and feel the chest stretch. Bouncing uses tendon elasticity, not muscle fibers. Force the muscle to initiate every rep.' }
    ]
  },
  {
    id: 14, icon: '🦵', title: 'Workout B — Lower Body & Posterior Chain',
    heroQuery: 'barbell squat gym',
    content: [
      { type: 'paragraph', text: 'This session utilizes the barbell with ~60 lbs of plates to target the posterior chain — hamstrings, glutes, and spinal erectors. The primary power generator for both cycling and running. A strong posterior chain is the most effective protection for lower back and knees. Perform Tuesday.' },
      { type: 'list', items: [
        '<strong>Barbell Zercher Squats: 4 × 10–12.</strong> Cradle bar in elbow crooks — forcefully engages the core and demands an upright torso. Go to full depth, below parallel.',
        '<strong>Barbell Romanian Deadlifts: 4 × 12.</strong> Push hips backward, not knees forward. Lower until you feel a deep hamstring stretch. This eccentric overload drives hypertrophy and builds bulletproof knee-braking muscles.',
        '<strong>Barbell Bent-Over Rows: 3 × 12–15.</strong> Back parallel to floor, bar into the navel. Torso angle places lats in elongated position. Squeeze shoulder blades at top — do not shrug.',
        '<strong>Ab Wheel Rollouts: 3 × 10–12.</strong> Core density requires frequency. The posterior chain session creates spinal loading — ab wheel reinforces anterior core stability as counterbalance.'
      ]},
      { type: 'quote', text: 'Safety: Never round the lower back during RDLs. If form breaks down, the set is over. A herniated L4–L5 disc ends your streak for six months.' }
    ]
  },
  {
    id: 15, icon: '🤸', title: 'Pull-Up Benchmark',
    heroQuery: 'pull up bar exercise',
    content: [
      { type: 'paragraph', text: 'The strict dead-hang pull-up is the undisputed benchmark of upper body relative strength. Unlike any barbell lift, it normalizes strength against body weight — directly penalizing excess body fat. You cannot fake a pull-up. It is the most honest single metric of the recomposition process.' },
      { type: 'list', items: [
        '<strong>Clinical Standard for Males 20–40:</strong> 15–20 unbroken dead-hang reps = elite. 10–14 = excellent (also the body fat tipping point where the exercise becomes dramatically easier). Fewer than 5 = significant excess body fat.',
        '<strong>Greasing the Groove Protocol:</strong> Install a pull-up bar in a frequently-passed doorframe. Every pass, perform 50–60% of current maximum — never going to failure. This builds neuromuscular pattern and tendon strength without fatigue.',
        '<strong>Eccentric Overload:</strong> Jump to the top position, hold 2 seconds, fight gravity for 5 full seconds descending. The eccentric phase creates the most muscle micro-damage and subsequent hypertrophic response.'
      ]},
      { type: 'paragraph', text: '<strong>Monthly Test:</strong> First Sunday of every month — one maximum effort set of strict dead-hang pull-ups to absolute failure. Record the count. This number is your most direct proxy for body composition progress.' }
    ]
  },
  {
    id: 16, icon: '🦶', title: 'Ankle & Heel Rehabilitation',
    heroQuery: 'physical therapy ankle stretch',
    content: [
      { type: 'paragraph', text: 'Your unilateral left heel pathology — most likely Achilles tendinopathy or plantar fasciitis — will not resolve through passive rest. Tendons are avascular (extremely low blood flow). Without active loading, the tendon becomes progressively stiffer and more brittle. You must mechanically load it in a controlled, progressive manner to stimulate collagen remodeling.' },
      { type: 'list', items: [
        '<strong>The Rathleff Heavy Slow Resistance (HSR) Protocol — Clinical Gold Standard:</strong> Ball of left foot on stair edge, rolled towel under toes to pre-stretch plantar fascia. 3 seconds up → 2 seconds hold → 3 seconds down, below stair level. 3 sets × 12 reps every other day. The slow tempo is non-negotiable — it drives collagen synthesis via mechanotransduction.',
        '<strong>Progressive Loading:</strong> Once bodyweight is manageable (pain ≤3/10), hold the 17.8 lb dumbbell in the ipsilateral hand. The tendon must be progressively challenged to continue remodeling.',
        '<strong>The Zero Barefoot Rule — Non-Negotiable:</strong> Never take a barefoot step on hard tile, especially first thing in the morning. The plantar fascia contracts overnight. Stepping barefoot causes micro-tears that restart the inflammatory cycle. Keep supportive slides (OOFOS or thick Crocs) directly beside the bed.'
      ]},
      { type: 'quote', text: 'The Rathleff protocol takes 6 minutes. It is boring. Tendons adapt on a 6–12 week timeline — patience is the prescription.' }
    ]
  },
  {
    id: 17, icon: '🩸', title: 'Blood Markers & Biological Age',
    heroQuery: 'blood test laboratory',
    content: [
      { type: 'paragraph', text: 'Physical fitness metrics are lagging indicators. Blood markers are leading indicators — they reveal dysfunction years before clinical symptoms. Once lifestyle protocols are established, biological age optimization requires annual laboratory testing.' },
      { type: 'list', items: [
        '<strong>hs-CRP:</strong> The definitive measure of systemic chronic inflammation. Standard physicians accept under 3.0 mg/L. For longevity, target under 0.5 mg/L. Elevated hs-CRP indicates a constant internal fire accelerating telomere shortening.',
        '<strong>HbA1c:</strong> 3-month rolling average of blood glucose exposure. Conventional medicine accepts up to 5.6%. Longevity physicians target 4.8–5.0%. Every 0.1% above 5.0% is associated with measurable increases in all-cause mortality.',
        '<strong>Fasting Insulin:</strong> Optimal: 2–4 µU/mL. Will spike years before blood glucose goes out of range. Above 8 µU/mL, insulin resistance is developing silently.',
        '<strong>Triglycerides:</strong> Primarily driven by refined carbohydrates and alcohol. Optimal: under 70 mg/dL. Above 150 mg/dL predicts metabolic syndrome.',
        '<strong>ApoB:</strong> More accurate predictor of cardiovascular disease than LDL. Measures actual count of atherogenic lipoprotein particles. Target: under 80 mg/dL.',
        '<strong>Fasting Blood Glucose:</strong> Ideally under 90 mg/dL. Chronically above 95 mg/dL indicates early insulin resistance.'
      ]},
      { type: 'paragraph', text: '<strong>Annual Action:</strong> Schedule a comprehensive blood draw on your birthday. Track the delta year over year. The trend line across 3–5 years reveals whether the protocol is working at the cellular level.' }
    ]
  },
  {
    id: 18, icon: '😴', title: 'Recovery & Nervous System Regulation',
    heroQuery: 'meditation breathing calm',
    content: [
      { type: 'paragraph', text: 'Waking resting heart rates of 64 bpm and crashed HRV after weekend efforts signal the autonomic nervous system is locked in chronic "fight or flight" (sympathetic) state. This state instructs the body to preferentially store visceral fat and catabolize lean muscle. Growth, repair, and fat loss all require the opposing "rest and digest" (parasympathetic) state. You cannot out-train a dysregulated nervous system.' },
      { type: 'list', items: [
        '<strong>The Vagus Nerve Protocol:</strong> 5–10 minutes of Box Breathing (4s inhale → 4s hold → 4s exhale → 4s hold) or Huberman\'s Physiological Sighs (double inhale through nose, long complete exhale) directly before sleep. This mechanically stimulates the vagus nerve and immediately lowers heart rate.',
        '<strong>Rest Days Are Sacred:</strong> Muscle growth, tendon repair, and fat oxidation occur during deep slow-wave sleep (Stage 3) and REM — not in the gym. Chronic cortisol from insufficient recovery actively instructs adipocytes to store visceral fat while upregulating muscle protein breakdown.',
        '<strong>Thermal Regulation:</strong> Keep the bedroom at 17–19°C (63–67°F). Core body temperature must drop 1–2°C to initiate deep sleep architecture. Warmer environments suppress SWS and growth hormone secretion.'
      ]},
      { type: 'paragraph', text: '<strong>Daily HRV Rule:</strong> If morning resting HR is elevated 5+ bpm above baseline — reduce training to Zone 1 or pure active recovery. Training hard on a compromised nervous system produces negative adaptation.' }
    ]
  },
  {
    id: 19, icon: '🧠', title: 'Mindset & Discipline Architecture',
    heroQuery: 'focused athlete mindset',
    content: [
      { type: 'paragraph', text: 'Physical transformation is fundamentally anchored in mental architecture. The biology will respond to the stimulus without exception. What fails is the consistency of stimulus application. The mind must generate the stimulus daily, particularly when motivation is completely absent. Motivation is an emotion; it fluctuates hourly. Discipline is a structured system; it requires no emotional input.' },
      { type: 'list', items: [
        '<strong>The Stoic Framework:</strong> Renee Landers — who transformed her physique post-60 through pure protocol adherence — emphasizes deliberate, scripted positive self-talk and a formal gratitude practice each morning. She ruthlessly removes chronic stressors. Every chronic stressor elevates cortisol; cortisol stores visceral fat.',
        '<strong>Consistency Annihilates Intensity:</strong> Keep resistance sessions under 45 minutes — beyond this, cortisol rises, testosterone falls, and the net hormonal signal goes catabolic. One consistent 35-minute daily session outperforms four 90-minute sessions followed by two rest days, measured over any 12-month period.',
        '<strong>Identity-Based Execution:</strong> The dashboard is a psychological commitment contract. Every checkbox clicked reinforces the identity: "I am a developer-athlete who executes the protocol." Identity is built through repeated action, not intention.'
      ]},
      { type: 'quote', text: 'Motivation is a fleeting emotion. Discipline is a forged protocol. Rely on the protocol. The protocol does not care how you feel today.' }
    ]
  },
  {
    id: 20, icon: '📊', title: 'Daily Mission Control',
    isDashboard: true, hero: '',
    content: [
      { type: 'paragraph', text: 'This is your daily mission control. Every module represents a critical variable in the recomposition system. Interact with them — checkboxes are psychological commitment contracts that reinforce identity.' },
      { type: 'paragraph', text: 'State saves automatically to the JSON database per profile. Return tomorrow and ensure the board is green. Two consecutive days with incomplete modules is the beginning of a failure habit.' }
    ]
  },
  {
    id: 21, icon: '📓', title: 'Exercise Journal & Analytics',
    isJournal: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Track every session — running, cycling, and lifting — to build an objective performance record. The journal drives the charts below, revealing trends invisible to subjective perception: progressive overload on the barbell, weekly running volume accumulation, and aerobic base expansion over months.' },
      { type: 'paragraph', text: 'Log consistently. Data is saved to your profile in the JSON database — it persists across browser restarts and devices (via the same server). A 6-month view of weekly running distance will show exactly when your aerobic engine began to develop.' }
    ]
  },
  // ── New Reference Pages ──────────────────────────────────────────────────
  {
    id: 22, icon: '📏', title: 'Belly Fat Measurement Guide',
    heroQuery: 'tape measure waist fitness',
    content: [
      { type: 'paragraph', text: '<strong>Why waist measurement beats the scale:</strong> Body weight fluctuates 1–3 kg daily from water, food, and glycogen. Waist circumference measured identically each month is a direct proxy for visceral fat reduction — the fat that matters most for health and longevity. A shrinking waist at stable or increasing weight is the definitive signature of successful recomposition.' },
      { type: 'paragraph', text: '<strong>Love handles vs visceral fat:</strong> Love handles (lateral hip fat) are primarily <em>subcutaneous</em> fat — the pinchable kind stored beneath the skin. While cosmetically unwanted, subcutaneous fat secretes beneficial adiponectin and is metabolically less dangerous. The real enemy is <em>visceral fat</em> — the deep intra-abdominal fat wrapping your organs. You cannot pinch visceral fat; you detect it through waist circumference. A large, firm, protruding belly that does not pinch easily signals high visceral fat load.' },
      { type: 'list', items: [
        '<strong>Waist circumference protocol:</strong> Measure immediately upon waking, post-bathroom, before eating or drinking. Stand relaxed (do not suck in). Place a soft tape horizontally at the navel — not at the narrowest point. Take 3 readings, use the average.',
        '<strong>Hip circumference protocol:</strong> Stand with feet together. Measure at the widest point of the buttocks. Same time of day as waist for valid waist-to-hip ratio.',
        '<strong>Neck protocol:</strong> Mid-point of the neck, just below the larynx (Adam\'s apple). Used in the US Navy body fat formula on page 2.',
        '<strong>Tracking frequency:</strong> Monthly is ideal. Weekly causes psychological distress from normal fluid fluctuations. Record with date in the Exercise Journal.'
      ]},
      { type: 'paragraph', text: '<strong>WHO Risk Thresholds (men):</strong> Waist ≥ 94 cm = increased metabolic risk. Waist ≥ 102 cm = substantially increased risk. <strong>Waist-to-height ratio > 0.5 = elevated cardiovascular risk</strong> — validated in a meta-analysis of 300,000+ individuals (Ashwell & Hsieh, 2005). Keep waist below half your height in cm.' },
      { type: 'calculator', component: 'BellyMeasureCalc' },
      { type: 'quote', text: 'The tape measure is the most honest fitness tool you own. The scale lies. The mirror lies. The tape, measured correctly and consistently, does not.' }
    ]
  },
  {
    id: 23, icon: '📋', title: 'Science Cheatsheet',
    heroQuery: 'notebook science desk',
    content: [
      { type: 'paragraph', text: 'A dense, reference-grade cheatsheet of the most important principles. Zero fluff. Use this when someone questions the protocol, when motivation fades, or when you need to re-anchor to the science.' },
      { type: 'list', items: [
        '<strong>FAT LOSS — 5 Non-Negotiables</strong>',
        '① <strong>CICO is unavoidable.</strong> Calories In vs Calories Out is thermodynamic law. No food is uniquely "fattening" or "fat-burning" — only caloric surplus causes fat gain.',
        '② <strong>Protein preserves muscle in a deficit.</strong> 1.6 g/kg prevents skeletal muscle catabolism (McMaster meta-analysis, 350+ RCTs). Below this, you lose as much lean mass as fat.',
        '③ <strong>Sleep doubles fat-loss rate.</strong> Nedeltcheva 2010 RCT: same deficit, 8.5h vs 5.5h sleep — short sleepers lost 60% less fat and 55% more muscle. Non-negotiable.',
        '④ <strong>NEAT is a 700 kcal/day wildcard.</strong> Caloric restriction automatically suppresses fidgeting, standing, and incidental movement — reducing TDEE beyond your intentional deficit. Walking more counteracts this.',
        '⑤ <strong>Visceral fat responds 2× faster to aerobic training than subcutaneous fat.</strong> 150+ min/week Zone 2 amplifies fat loss quality beyond deficit alone.'
      ]},
      { type: 'list', items: [
        '<strong>MUSCLE GAIN — 5 Non-Negotiables</strong>',
        '① <strong>Progressive overload is the ONLY stimulus.</strong> More weight, more reps, or more volume over time. Without it, training is maintenance.',
        '② <strong>Protein ceiling at 2.2 g/kg.</strong> Above this, no further hypertrophic benefit (Morton 2018, 49 RCTs). 3–4 g/kg wastes money.',
        '③ <strong>Train each muscle 2×/week minimum.</strong> Once-weekly frequency produces ~70% of twice-weekly hypertrophy at equal total volume.',
        '④ <strong>200–500 kcal surplus is optimal.</strong> Aggressive bulks gain the same muscle but 3–4× more fat.',
        '⑤ <strong>90% of Growth Hormone is secreted during Stage 3 SWS.</strong> Glycine (3g) + Magnesium Glycinate (300mg) pre-sleep improve deep sleep architecture and amplify this GH pulse.'
      ]},
      { type: 'list', items: [
        '<strong>SUPPLEMENT MYTHS — Debunked with Evidence</strong>',
        '🔴 <strong>BCAAs standalone:</strong> Cannot build complete muscle proteins without the other 6 essential amino acids. Zero additional benefit if daily protein targets are met from food. Expensive flavored water.',
        '🔴 <strong>Fat burners:</strong> In every independent RCT, 100% of the fat-loss effect is attributable to caffeine — which habituates in 7–10 days of daily use. Zero evidence for thermogenic ingredients (synephrine, raspberry ketones, yohimbine) at safe doses.',
        '🔴 <strong>OTC testosterone boosters:</strong> Tribulus terrestris and D-aspartic acid produce 2–7% testosterone increases — within normal daily circadian variation. Lifestyle optimization (sleep, body fat < 15%, zinc, vitamin D3) moves testosterone 30–50%.',
        '🔴 <strong>Detox / cleanses:</strong> No clinical mechanism exists. The liver processes 1L blood/min continuously. "Detox" teas frequently contain senna, causing water weight loss misread as fat loss.',
        '🔴 <strong>Collagen for muscle:</strong> Lowest PDCAAS score of any protein (deficient in leucine and tryptophan). Use for tendon/ligament support — not hypertrophy.',
        '🟡 <strong>Pre-workout:</strong> The "tingle" (beta-alanine) is harmless. The performance effect is caffeine. Cycle usage to prevent tolerance. Zero magic beyond caffeine + placebo.'
      ]},
      { type: 'list', items: [
        '<strong>OVERTRAINING — Myth vs Confirmed Reality</strong>',
        '✅ <strong>Daily Zone 2 running is safe and adaptive.</strong> The body\'s General Adaptation Syndrome (Selye, 1936): stimulus → alarm → supercompensation → new baseline. Daily low-intensity exercise is a chronic, manageable stimulus. Mitochondria multiply. Capillaries grow. Heart becomes more efficient. This is health, not damage.',
        '✅ <strong>Overtraining Syndrome (OTS) requires weeks of overreaching without rest.</strong> Clinical OTS needs: persistent performance decline despite rest, chronically elevated morning cortisol, testosterone suppression, and confirmed absence of illness. Extremely rare in structured training.',
        '⚠️ <strong>Real risk: cumulative mechanical stress, not biochemistry.</strong> Tendons adapt 3–5× slower than muscles. Running daily strains the Achilles, plantar fascia, and tibial cortex. The risk is structural micro-trauma accumulation — NOT cellular metabolic exhaustion.',
        '⚠️ <strong>The 10% rule:</strong> Never increase weekly training volume > 10% per week. Most amateur running injuries occur during rapid load increases (the "Too Much Too Soon" principle, validated by Nielsen et al., 2014).',
        '⚠️ <strong>HRV and resting HR are your objective signals.</strong> Resting HR elevated 5+ bpm above 7-day baseline = reduce to Zone 1 or rest. Respect the signal. Training through fatigue flags is how overreaching becomes injury.'
      ]}
    ]
  },
  {
    id: 24, icon: '🌡️', title: 'Environment & Caloric Factors',
    heroQuery: 'hot humid weather sun',
    content: [
      { type: 'paragraph', text: 'Where you train determines how hard training is. Elevation, humidity, and temperature are invisible performance modifiers that directly affect oxygen availability, thermoregulation, caloric burn, and hydration requirements. Ignoring them means training blind.' },
      { type: 'paragraph', text: '<strong>Guatemala City at ~1,500m elevation</strong> sits precisely at the threshold where altitude begins affecting aerobic performance. The partial pressure of oxygen is ~83% of sea-level values. Borderline — not enough to cause severe altitude symptoms, but enough to notice faster breathing and an elevated HR at identical paces. After 10–14 days, EPO-driven acclimatization compensates. Athletes who then compete at sea level have a brief 10–15 day performance advantage.' },
      { type: 'list', items: [
        '<strong>Elevation & VO₂ max:</strong> Below 1500m — no significant effect. At 2000m — ~1.6% VO₂ max reduction. At 3000m — ~4.8% reduction. Acclimatization (10–14 days) partially compensates via increased EPO and red cell mass.',
        '<strong>Humidity & thermoregulation:</strong> Above 75% humidity, sweat cannot evaporate efficiently. Core temperature rises faster at identical intensity. HR increases 5–10 bpm at the same power output. Rainy season (May–Oct) requires reducing pace 20–30 sec/km to stay in true Zone 2.',
        '<strong>Caloric expenditure adjustment:</strong> High heat + humidity increases caloric burn 10–15% above temperate values for identical duration. This partially offsets your deficit — expect weight loss to slow in peak summer without changing protocol. Track, don\'t panic.',
        '<strong>Hydration escalation:</strong> Baseline: 500mL/hour Zone 2. Add 300–500mL/hour per 10°C above 20°C. Add 200–300mL/hour when humidity > 70%. Beyond 90 minutes: sodium replacement (400–700mg/hr) becomes critical to prevent exercise-associated hyponatremia.'
      ]},
      { type: 'calculator', component: 'EnvCalc' },
      { type: 'paragraph', text: '<strong>Seasonal training plan:</strong> Dry season (November–April) = optimal for hard training blocks (lower humidity, consistent performance). Rainy season (May–October) = base building, technique, Zone 1–2 focus. Never compare split times across seasons without adjusting for heat index.' }
    ]
  },
  // ── Training Builder Pages ───────────────────────────────────────────────
  {
    id: 25, icon: '🗓️', title: 'Week Builder',
    isTrainingBuilder: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Build your week from the palette below — tap 📍 Place for the fastest path on mobile (pick a day and position from a popup), or drag a block onto a day on desktop. Link a goal below to auto-build a full week around its target date, then export as PDF, CSV, or an .ics calendar file.' }
    ]
  },
  {
    id: 26, icon: '🎯', title: 'Goal Dashboard',
    isGoals: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Track milestones — races, weight targets, lift PRs — and jump straight into the Week Builder with a plan generated around any goal\'s target date.' }
    ]
  },
  {
    id: 27, icon: '📸', title: 'Daily Tracker',
    isTracker: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Log each activity for the day — name, Strava link, notes, and screenshots, "+ Add activity" for more than one — then run the AI analyzer for a day, week, or month summary — powered by OpenAI, reading both your logged data and any attached screenshots.' }
    ]
  },
  {
    id: 31, icon: '⏱️', title: 'Sprint Timer',
    isSprintTimer: true, hero: '',
    content: []
  },
  {
    id: 28, icon: '⚙️', title: 'Settings',
    isSettings: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Manage your password, see your current daily upload/AI usage against the account-wide limits, and set your preferred language and theme.' }
    ]
  },
  {
    id: 29, icon: '🍽️', title: 'Food Planner',
    isNutrition: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Plan meals for the week from common Guatemalan staples and see calories/macros against your daily target — 2,100 kcal Mon–Sat, 2,800 kcal Sunday, 1.6g/kg protein.' }
    ]
  },
  {
    id: 30, icon: '💊', title: 'Supplements',
    isSupplements: true, hero: '',
    content: [
      { type: 'paragraph', text: 'Track daily adherence to the 8-supplement stack already covered in the Minimalist Supplement Stack and Developer Athlete Advanced Stack pages — dose, timing, and the evidence behind each, one tap away.' }
    ]
  }
];

const NAV_GROUPS = [
  { label: 'Framework',        pages: DB.filter(p => [1,2,3,4].includes(p.id)) },
  { label: 'Nutrition',        pages: DB.filter(p => [5,6,7,8].includes(p.id)) },
  { label: 'Training',         pages: DB.filter(p => p.id >= 9 && p.id <= 15) },
  { label: 'Health',           pages: DB.filter(p => [16,17,18,19,22].includes(p.id)) },
  { label: 'Reference',        pages: DB.filter(p => [23,24].includes(p.id)) },
  { label: 'System',           pages: DB.filter(p => [20,21].includes(p.id)) },
  { label: 'Training Builder', pages: DB.filter(p => [25,26,27,31].includes(p.id)) },
  { label: 'Planner',          pages: DB.filter(p => [29,30].includes(p.id)) },
  { label: 'Account',          pages: DB.filter(p => [28].includes(p.id)) }
];
