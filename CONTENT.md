# Steady - content

All numbers below are estimates. Store this content as typed data in `/content/*.ts`, not in components. Exercises also go into `supabase/seed.sql` (table `exercises`) using the slugs below.

## Equipment assumed (hostel gym)
Dumbbells, flat bench, pull-up bar, mat. Missing something? Swap rules:
- No pull-up bar: inverted rows under a sturdy table, or band pulldowns
- No heavy dumbbells: slow the lowering to 3 seconds, add 2 to 4 reps
- No bench: floor press, step-ups on a solid box or stair

Progression (all gym sessions): each exercise has a rep range. When every set hits the top of the range, add weight next time or add 1 set.

Back-safe rule: no heavy barbell deadlifts or good mornings for now. Hinges stay light and controlled.

## Training days
Three gym days split by body part, plus football and a run. Each gym day: 5 main exercises + 1 core finisher, about 45 min.
| Day | Session key | Name in app | Muscles |
|---|---|---|---|
| Tue | gym_a | Legs | Legs, core |
| Fri | gym_b | Chest and shoulders | Chest, shoulders, triceps, core |
| Sat | gym_c | Back and arms | Back, biceps, rear shoulders, core |

Train also has a library filtered by muscle: **Chest, Back, Shoulders, Arms, Legs, Core**. Tapping an exercise shows its card. The user can swap any exercise in a session for another from the same muscle group.

Equipment: dumbbell versions first, machine or cable listed as `alt` when it exists. Missing kit gets sorted case by case with the swap button.

### Exercise card format (every exercise, keep it this short)
- **How**: 1 to 2 short sentences.
- **Tip**: one cue that fixes the most common mistake.
- **Works**: muscles + one reason it matters.

### Legs (gym_a)
| Exercise | Sets x reps | Rest | How | Tip | Works |
|---|---|---|---|---|---|
| goblet_squat | 3 x 10-12 | 90 s | Hold one dumbbell at your chest. Sit down between your heels until thighs are level, then stand. | Chest up, knees follow your toes. | Thighs and glutes. The base of leg strength. |
| db_romanian_deadlift | 3 x 10-12 | 90 s | Dumbbells in front of your thighs, soft knees. Push hips back, slide the weights down your legs, stand by squeezing your glutes. | Back flat. Stop when you feel the stretch behind your knees. | Hamstrings and glutes. Keep it light, it protects your lower back long term. |
| bulgarian_split_squat | 3 x 8 a leg | 90 s | Back foot on a bench, front foot a big step ahead. Lower until the back knee nearly touches, push up through the front heel. | Most of your weight on the front leg. Go slow. | Thighs, glutes, balance. Football legs. |
| hip_thrust | 3 x 12-15 | 60 s | Upper back on a bench, dumbbell on your hips, feet flat. Drive hips up to a straight line, pause, lower. | Chin tucked. Squeeze 1 second at the top. | Glutes. Sprint power. |
| calf_raise | 3 x 15 | 45 s | Stand on a step edge, heels hanging. Rise high on your toes, lower slowly below the step. | Pause at the top. No bouncing. | Calves and ankles. Fewer ankle knocks on the pitch. |
| dead_bug (core) | 3 x 10 a side | 45 s | On your back, arms up, knees bent at 90 degrees. Lower opposite arm and leg slowly, return, switch. | Lower back stays pressed to the floor. | Deep core. Back-friendly. |

### Chest and shoulders (gym_b)
| Exercise | Sets x reps | Rest | How | Tip | Works |
|---|---|---|---|---|---|
| db_bench_press | 4 x 8-12 | 90 s | Lie on a bench, dumbbells over your chest. Lower to the sides of your chest, press back up. | Shoulder blades pinched, elbows at about 45 degrees. | Chest, front shoulders, triceps. |
| incline_db_press | 3 x 10-12 | 90 s | Bench at 30 degrees. Press dumbbells from upper chest to above your face. | Keep your back on the bench. | Upper chest and shoulders. Alt: incline machine press. |
| seated_db_shoulder_press | 3 x 10-12 | 90 s | Sit tall, dumbbells at ear height. Press up until arms are straight, lower to your ears. | Ribs down. Don't lean back. | Shoulders and triceps. |
| lateral_raise | 3 x 12-15 | 60 s | Dumbbells at your sides. Raise out to shoulder height, lower slowly. | Light weight. Lead with your elbows, no swinging. | Side shoulders. Wider frame. Alt: cable lateral raise. |
| overhead_triceps_extension | 3 x 12 | 60 s | Hold one dumbbell overhead with both hands. Lower behind your head, extend back up. | Elbows point forward and stay close. | Triceps, the back of the arm. Alt: cable pushdown. |
| plank (core) | 3 x 40 s | 45 s | Forearms on the floor, body straight from head to heels. Hold. | Squeeze your glutes. Don't let hips sag. | Whole core. |

### Back and arms (gym_c)
| Exercise | Sets x reps | Rest | How | Tip | Works |
|---|---|---|---|---|---|
| pull_up | 3 x max | 90 s | Hang from the bar, palms away. Pull until your chin passes the bar, lower all the way. Can't do one yet: jump up, lower for 5 seconds. | Chest to the bar. No kicking. | Back and biceps. Alt: lat pulldown 3 x 10-12. |
| one_arm_db_row | 3 x 10-12 a side | 60 s | Hand and knee on a bench, dumbbell in the other hand. Pull it to your hip, lower slowly. | Back flat, elbow close to your side. | Upper back and lats. Better posture. Alt: seated cable row. |
| rear_delt_fly | 3 x 15 | 60 s | Lean forward with a flat back, light dumbbells hanging. Raise them out to the sides, squeeze, lower. | Light and slow. | Back of the shoulders. Fixes desk posture. Alt: cable or band face pull. |
| db_curl | 3 x 10-12 | 60 s | Dumbbells at your sides, palms forward. Curl up, lower slowly. | Elbows pinned to your sides. | Biceps. |
| hammer_curl | 3 x 10-12 | 60 s | Same as a curl with palms facing each other. | No swinging. 2 seconds down. | Biceps and forearms. Grip. |
| side_plank (core) | 3 x 30 s a side | 45 s | On one forearm, feet stacked, lift your hips into a straight line. Hold, switch sides. | Hips high and pushed forward. | Side core. Protects the lower back. |

### run (Wed)
30 min at a pace where you can talk in full sentences. Football gives you the sprints. This builds the engine underneath.

### run_intervals (unlockable Sunday option)
5 min easy, then 8 x (1 min hard, 2 min easy), 5 min easy.

### football (Mon, Thu)
Log the minutes. Do the stretch routine after.

### Progression (all gym exercises)
When every set hits the top of the rep range, the next session shows "+2 kg" (or +1 rep for bodyweight moves). Code, not AI.

## Stretch routine (10 min, daily, after football, or before bed)
| Stretch | Time | Why |
|---|---|---|
| Kneeling hip flexor stretch | 2 x 45 s / side | Opens the front of the hip that sitting shortens. The main one for lower back tightness |
| 90/90 hip switch | 2 x 8 / side | Hip rotation for football |
| Cat-cow | 2 x 10 slow | Moves the lower back gently |
| Lying hamstring stretch (towel or band) | 2 x 45 s / side | Tight hamstrings pull on the lower back |

Progression for the first one: once easy, move to the couch stretch (back knee against a wall).

## Fuel

### Batch plan
Sunday: cook 2 recipes = 8 portions = lunch and dinner Mon to Thu. Thursday night: 1 recipe for Fri and Sat. Rotate so no recipe repeats two weeks running. Fridge max 3 days. Freeze anything for day 4.

Each recipe makes 4 portions. Per portion approx. 510-580 kcal, about 50 g protein.

### 1. Jollof chicken rice - ~575 kcal, 50 g P
Chicken breast 800 g, basmati rice 240 g dry, tomato paste 140 g, 2 red peppers, 2 onions, 1 chilli (or scotch bonnet if Rimi has it), 300 g frozen mixed veg, 2 tbsp oil, stock cube, thyme, curry powder, bay leaf.
Blend peppers, onion, chilli. Fry paste in oil 5 min, add blend, cook down 15 min. Add spices, stock, rice, water. Lid on, low heat 25 min. Bake or pan-sear chicken separately, slice, portion on top.

### 2. Suya beef with sweet potato - ~575 kcal, 48 g P
Lean beef strips or 5% mince 800 g, sweet potato 900 g, 40 g roasted peanuts (ground), 2 peppers, 2 onions, 1 tbsp oil. Suya mix: ground peanuts, chilli flakes, ginger, garlic powder, paprika, onion powder, salt.
Coat beef in suya mix, sear hot. Roast sweet potato cubes 200 C 30 min. Raw onion slices on top when serving.

### 3. Spicy turkey bean chilli - ~510 kcal, 50 g P
Turkey mince 800 g, 2 cans kidney beans (drained), 2 cans chopped tomatoes, 1 onion, 2 peppers, 1 tbsp oil, cumin, smoked paprika, chilli, garlic.
Brown turkey, add veg 5 min, spices, tomatoes, beans. Simmer 30 min. Rice optional (adds ~200 kcal per 150 g cooked).

### 4. Chicken yassa (Senegalese onion-lemon) - ~590 kcal, 51 g P
Chicken breast 800 g, onions 800 g, 3 lemons, 3 tbsp mustard, 2 tbsp oil, garlic, chilli, stock cube, rice 240 g dry.
Marinate chicken in lemon, mustard, garlic overnight Saturday. Sear chicken. Cook sliced onions slowly 25 min in the marinade until soft. Combine, simmer 10 min. Serve on rice.

### 5. West African fish stew with potatoes - ~540 kcal, 50 g P
Frozen cod or pollock 1 kg, potatoes 1 kg, 2 cans chopped tomatoes, 2 peppers, 1 onion, ginger, garlic, chilli, 2 tbsp oil, thyme.
Blend tomatoes, peppers, onion, ginger, garlic, chilli. Fry 15 min. Add fish chunks, simmer 10 min gently. Boil potatoes separately.

### Supermarket quick buys (Rimi, Maxima, Lidl)
Typical values. Check the label.
| Item | Amount | kcal | Protein |
|---|---|---|---|
| Low-fat biezpiens (quark) | 200 g | ~150 | ~24 g |
| Skyr / high-protein yogurt, plain | 150 g | ~95 | ~16 g |
| Kefir, 1% | 500 ml | ~200 | ~15 g |
| Boiled eggs | 2 | ~140 | ~12 g |
| Tuna in water + 2 rice cakes | 1 can | ~200 | ~26 g |
| High-protein milk drink | 1 bottle | ~150-200 | ~25 g |
| Chicken breast slices | 100 g | ~100 | ~20 g |
| Frozen edamame | 150 g | ~180 | ~17 g |
| Banana or apple | 1 | ~100 | ~1 g |

## Exercise slugs (seed)
Each with `muscle` in (chest, back, shoulders, arms, legs, core, stretch) and how / tip / works text from the tables above.
goblet_squat, db_romanian_deadlift, bulgarian_split_squat, hip_thrust, calf_raise, dead_bug, db_bench_press, incline_db_press, seated_db_shoulder_press, lateral_raise, overhead_triceps_extension, plank, pull_up, lat_pulldown, one_arm_db_row, seated_cable_row, rear_delt_fly, db_curl, hammer_curl, side_plank, push_up, kneeling_hip_flexor_stretch, couch_stretch, hip_90_90, cat_cow, lying_hamstring_stretch

## Images

### Rules
- Download at build time into `public/images/{group}/{slug}.webp`, max 1200 px, quality 80. Never hotlink.
- Log source URL, author and licence for each in `CREDITS.md`.
- Every slot below needs an image. If no good match: use the fallback, never an off-topic photo.
- Before keeping an image, check it: does it show exactly this movement or this dish? If not, try the next result.

### Exercises and stretches
Source: free-exercise-db (github.com/yuhonas/free-exercise-db). Confirm its licence file first. It has two photos per exercise (start, end): show both as a 2-frame strip.
Fallback for anything missing (likely the stretches): a clean line drawing, 1.5 px `--ink` stroke on white, made as SVG in `public/images/moves/`. Same style for all fallbacks.

### Meals (Unsplash or Pexels, food only, no people, no logos, no text)
| Slot | Search query |
|---|---|
| meals/jollof-chicken | "jollof rice chicken" |
| meals/suya-beef | "suya beef skewers" then "spicy beef sweet potato" |
| meals/turkey-chilli | "turkey chili beans bowl" |
| meals/chicken-yassa | "chicken yassa" then "lemon onion chicken rice" |
| meals/fish-stew | "fish stew tomato pepper" |
| fuel/batch-prep (Fuel header) | "meal prep containers chicken rice" |

### Quick buys
| Slot | Search query |
|---|---|
| snacks/quark | "cottage cheese bowl" |
| snacks/skyr | "plain yogurt bowl berries" |
| snacks/kefir | "kefir glass" |
| snacks/eggs | "boiled eggs halved" |
| snacks/tuna | "tuna rice cakes" |
| snacks/protein-drink | "protein milk bottle" (no brand visible) |
| snacks/chicken-slices | "sliced chicken breast deli" |
| snacks/edamame | "edamame bowl" |
| snacks/fruit | "banana apple" |

### Empty states and onboarding
No photos. Use the app icon mark (steps + amber dot) at 64 px on white. Calm, consistent, not stock.

## Today's line (daily card)
One line a day on Today, in the ink card. Changes at midnight Europe/Riga. Store in `content/lines.ts`.

Mix: about 5 days a week the Gaffer's own lines (below), about 2 days a week a real quote.
- On Off form days, pick from lines marked `comeback`.
- No line repeats within 30 days.

Rules for real quotes (the content-curator agent builds this list, target 40):
- Sources: Stoic writers in public-domain translations (Seneca, Marcus Aurelius, Epictetus), athletes, coaches, and David Goggins. Forbes' "Thoughts on the Business of Life" page is fine for finding quotes, never as the source.
- Every quote is 15 words or fewer, with author and a link to a primary source or a "Sourced" entry on Wikiquote. Unverifiable = cut. Many famous quotes are misattributed.
- No song lyrics, no poems, no long passages from books.

The Gaffer's lines (original, use as written):
| Line | Tag |
|---|---|
| Nobody cares how you feel at 06:30. Get up anyway. | |
| Motivation shows up late. Start without it. | |
| The bed has never made anyone stronger. | |
| Boring days build the body. Have one. | |
| You don't need a perfect day. You need a logged one. | comeback |
| One meal doesn't ruin you. The next choice decides. | comeback |
| Rain is not a reason. It's weather. | |
| Talent is a head start. Habits finish the race. | |
| Last week's you set the bar. Go clear it. | |
| The hard part is the first five minutes. Do those. | comeback |
| Tired is information, not an instruction. | |
| You've done harder things than one more set. | |
| Small promises, kept daily. That's the whole trick. | comeback |
| Nobody scores from the bench. | |
| Eat like you're training for something. You are. | |
| Protein first. Then argue with yourself. | |
| The scale lies daily. The trend doesn't. | comeback |
| Comfort is a loan. You pay it back later. | |
| Your body keeps the receipts. | |
| Do it badly. Then do it again tomorrow. | comeback |
| Stretch now or limp later. | |
| A missed day is a fact. Two is a pattern. Don't make three. | comeback |
| Thursday's ninety minutes start with Wednesday's sleep. | |
| You beat last week by being boring on Tuesday. | |
| Write the log. Ugly days count too. | comeback |
| Hungry at 22:00? Water, then bed. Breakfast will thank you. | |
| Strong people get tired too. They just go anyway. | |
| The plan is simple. That's why it's hard. | |
| Today counts. That's the whole message. | comeback |
| Off form is a week, not a person. | comeback |
