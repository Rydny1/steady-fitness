// Exercise reference data. Source of truth: CONTENT.md.
// Written by curator (no row, or no how/tip/works text, in CONTENT.md):
//   lat_pulldown, seated_cable_row, push_up, couch_stretch (all fields),
//   kneeling_hip_flexor_stretch, hip_90_90, cat_cow, lying_hamstring_stretch
//   (how and tip; works adapted from the "Why" column).
// Where CONTENT.md ended a Works cell with "Alt: ...", that text lives in
// altNote (and altSlug when the alternative is itself an exercise in this file).

export type Muscle = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'stretch';
export type SessionKey = 'gym_a' | 'gym_b' | 'gym_c';

export type Exercise = {
  slug: string;
  name: string;
  muscle: Muscle;
  sets: number;
  /** Rep range. Omitted for timed holds and for "max" exercises. */
  repMin?: number;
  repMax?: number;
  /** Timed hold or stretch, in seconds. */
  seconds?: number;
  /** True when sets, reps or seconds are done on each side. */
  perSide?: boolean;
  /** True for "3 x max" (pull-ups). */
  toFailure?: boolean;
  /** Rest between sets, in seconds. */
  rest: number;
  how: string;
  tip: string;
  works: string;
  /** Another exercise in this file that can replace it. */
  altSlug?: string;
  /** Free-text alternative (machine or cable version). */
  altNote?: string;
};

export const exercises: Exercise[] = [
  // Legs (gym_a)
  {
    slug: 'goblet_squat', name: 'Goblet squat', muscle: 'legs',
    sets: 3, repMin: 10, repMax: 12, rest: 90,
    how: 'Hold one dumbbell at your chest. Sit down between your heels until thighs are level, then stand.',
    tip: 'Chest up, knees follow your toes.',
    works: 'Thighs and glutes. The base of leg strength.',
  },
  {
    slug: 'db_romanian_deadlift', name: 'Dumbbell Romanian deadlift', muscle: 'legs',
    sets: 3, repMin: 10, repMax: 12, rest: 90,
    how: 'Dumbbells in front of your thighs, soft knees. Push hips back, slide the weights down your legs, stand by squeezing your glutes.',
    tip: 'Back flat. Stop when you feel the stretch behind your knees.',
    works: 'Hamstrings and glutes. Keep it light, it protects your lower back long term.',
  },
  {
    slug: 'bulgarian_split_squat', name: 'Bulgarian split squat', muscle: 'legs',
    sets: 3, repMin: 8, repMax: 8, perSide: true, rest: 90,
    how: 'Back foot on a bench, front foot a big step ahead. Lower until the back knee nearly touches, push up through the front heel.',
    tip: 'Most of your weight on the front leg. Go slow.',
    works: 'Thighs, glutes, balance. Football legs.',
  },
  {
    slug: 'hip_thrust', name: 'Hip thrust', muscle: 'legs',
    sets: 3, repMin: 12, repMax: 15, rest: 60,
    how: 'Upper back on a bench, dumbbell on your hips, feet flat. Drive hips up to a straight line, pause, lower.',
    tip: 'Chin tucked. Squeeze 1 second at the top.',
    works: 'Glutes. Sprint power.',
  },
  {
    slug: 'calf_raise', name: 'Calf raise', muscle: 'legs',
    sets: 3, repMin: 15, repMax: 15, rest: 45,
    how: 'Stand on a step edge, heels hanging. Rise high on your toes, lower slowly below the step.',
    tip: 'Pause at the top. No bouncing.',
    works: 'Calves and ankles. Fewer ankle knocks on the pitch.',
  },
  {
    slug: 'dead_bug', name: 'Dead bug', muscle: 'core',
    sets: 3, repMin: 10, repMax: 10, perSide: true, rest: 45,
    how: 'On your back, arms up, knees bent at 90 degrees. Lower opposite arm and leg slowly, return, switch.',
    tip: 'Lower back stays pressed to the floor.',
    works: 'Deep core. Back-friendly.',
  },

  // Chest and shoulders (gym_b)
  {
    slug: 'db_bench_press', name: 'Dumbbell bench press', muscle: 'chest',
    sets: 4, repMin: 8, repMax: 12, rest: 90,
    how: 'Lie on a bench, dumbbells over your chest. Lower to the sides of your chest, press back up.',
    tip: 'Shoulder blades pinched, elbows at about 45 degrees.',
    works: 'Chest, front shoulders, triceps.',
  },
  {
    slug: 'incline_db_press', name: 'Incline dumbbell press', muscle: 'chest',
    sets: 3, repMin: 10, repMax: 12, rest: 90,
    how: 'Bench at 30 degrees. Press dumbbells from upper chest to above your face.',
    tip: 'Keep your back on the bench.',
    works: 'Upper chest and shoulders.',
    altNote: 'Incline machine press',
  },
  {
    slug: 'seated_db_shoulder_press', name: 'Seated dumbbell shoulder press', muscle: 'shoulders',
    sets: 3, repMin: 10, repMax: 12, rest: 90,
    how: 'Sit tall, dumbbells at ear height. Press up until arms are straight, lower to your ears.',
    tip: "Ribs down. Don't lean back.",
    works: 'Shoulders and triceps.',
  },
  {
    slug: 'lateral_raise', name: 'Lateral raise', muscle: 'shoulders',
    sets: 3, repMin: 12, repMax: 15, rest: 60,
    how: 'Dumbbells at your sides. Raise out to shoulder height, lower slowly.',
    tip: 'Light weight. Lead with your elbows, no swinging.',
    works: 'Side shoulders. Wider frame.',
    altNote: 'Cable lateral raise',
  },
  {
    slug: 'overhead_triceps_extension', name: 'Overhead triceps extension', muscle: 'arms',
    sets: 3, repMin: 12, repMax: 12, rest: 60,
    how: 'Hold one dumbbell overhead with both hands. Lower behind your head, extend back up.',
    tip: 'Elbows point forward and stay close.',
    works: 'Triceps, the back of the arm.',
    altNote: 'Cable pushdown',
  },
  {
    slug: 'plank', name: 'Plank', muscle: 'core',
    sets: 3, seconds: 40, rest: 45,
    how: 'Forearms on the floor, body straight from head to heels. Hold.',
    tip: "Squeeze your glutes. Don't let hips sag.",
    works: 'Whole core.',
  },

  // Back and arms (gym_c)
  {
    slug: 'pull_up', name: 'Pull-up', muscle: 'back',
    sets: 3, toFailure: true, rest: 90,
    how: "Hang from the bar, palms away. Pull until your chin passes the bar, lower all the way. Can't do one yet: jump up, lower for 5 seconds.",
    tip: 'Chest to the bar. No kicking.',
    works: 'Back and biceps.',
    altSlug: 'lat_pulldown',
    altNote: 'Lat pulldown 3 x 10-12',
  },
  {
    slug: 'one_arm_db_row', name: 'One-arm dumbbell row', muscle: 'back',
    sets: 3, repMin: 10, repMax: 12, perSide: true, rest: 60,
    how: 'Hand and knee on a bench, dumbbell in the other hand. Pull it to your hip, lower slowly.',
    tip: 'Back flat, elbow close to your side.',
    works: 'Upper back and lats. Better posture.',
    altSlug: 'seated_cable_row',
    altNote: 'Seated cable row',
  },
  {
    slug: 'rear_delt_fly', name: 'Rear delt fly', muscle: 'shoulders',
    sets: 3, repMin: 15, repMax: 15, rest: 60,
    how: 'Lean forward with a flat back, light dumbbells hanging. Raise them out to the sides, squeeze, lower.',
    tip: 'Light and slow.',
    works: 'Back of the shoulders. Fixes desk posture.',
    altNote: 'Cable or band face pull',
  },
  {
    slug: 'db_curl', name: 'Dumbbell curl', muscle: 'arms',
    sets: 3, repMin: 10, repMax: 12, rest: 60,
    how: 'Dumbbells at your sides, palms forward. Curl up, lower slowly.',
    tip: 'Elbows pinned to your sides.',
    works: 'Biceps.',
  },
  {
    slug: 'hammer_curl', name: 'Hammer curl', muscle: 'arms',
    sets: 3, repMin: 10, repMax: 12, rest: 60,
    how: 'Same as a curl with palms facing each other.',
    tip: 'No swinging. 2 seconds down.',
    works: 'Biceps and forearms. Grip.',
  },
  {
    slug: 'side_plank', name: 'Side plank', muscle: 'core',
    sets: 3, seconds: 30, perSide: true, rest: 45,
    how: 'On one forearm, feet stacked, lift your hips into a straight line. Hold, switch sides.',
    tip: 'Hips high and pushed forward.',
    works: 'Side core. Protects the lower back.',
  },

  // Library extras (written by curator)
  {
    slug: 'lat_pulldown', name: 'Lat pulldown', muscle: 'back',
    sets: 3, repMin: 10, repMax: 12, rest: 90,
    how: 'Sit with thighs under the pad, grip just wider than your shoulders. Pull the bar to your upper chest, return slowly.',
    tip: "Lead with your elbows. Don't lean back to yank it.",
    works: 'Back and biceps. The swap when there is no pull-up bar.',
  },
  {
    slug: 'seated_cable_row', name: 'Seated cable row', muscle: 'back',
    sets: 3, repMin: 10, repMax: 12, rest: 60,
    how: 'Sit tall, feet braced, knees soft. Pull the handle to your belly, squeeze your shoulder blades, return slowly.',
    tip: "Don't rock your torso. Let the arms stretch fully at the front.",
    works: 'Upper back and lats. Better posture.',
  },
  {
    slug: 'push_up', name: 'Push-up', muscle: 'chest',
    sets: 3, repMin: 8, repMax: 12, rest: 60,
    how: 'Hands under your shoulders, body straight from head to heels. Lower your chest to just above the floor, press back up.',
    tip: "Elbows about 45 degrees from your body. Don't let hips sag.",
    works: 'Chest, front shoulders, triceps. No kit needed.',
  },

  // Stretches
  {
    slug: 'kneeling_hip_flexor_stretch', name: 'Kneeling hip flexor stretch', muscle: 'stretch',
    sets: 2, seconds: 45, perSide: true, rest: 0,
    how: 'Kneel on one knee, other foot flat in front. Tuck your tailbone under and shift forward until the front of the back hip stretches.',
    tip: "Squeeze the back glute. Don't arch your lower back.",
    works: 'Hip flexors. Opens the front of the hip that sitting shortens. The main one for lower back tightness.',
    altSlug: 'couch_stretch',
    altNote: 'Couch stretch once this feels easy',
  },
  {
    slug: 'couch_stretch', name: 'Couch stretch', muscle: 'stretch',
    sets: 2, seconds: 45, perSide: true, rest: 0,
    how: 'Back knee on the floor beside a wall, back foot up the wall behind you. Step the other foot forward and lift your torso upright.',
    tip: "Squeeze the back glute. Ease in, don't force it.",
    works: 'Front of the hip and thigh. The harder step up from the kneeling stretch.',
  },
  {
    slug: 'hip_90_90', name: '90/90 hip switch', muscle: 'stretch',
    sets: 2, repMin: 8, repMax: 8, perSide: true, rest: 0,
    how: 'Sit with both knees bent at 90 degrees, one shin in front and one to the side. Rotate your knees over to switch sides.',
    tip: 'Sit tall. Move slowly, inside a range that feels easy.',
    works: 'Hip rotation for football.',
  },
  {
    slug: 'cat_cow', name: 'Cat-cow', muscle: 'stretch',
    sets: 2, repMin: 10, repMax: 10, rest: 0,
    how: 'On hands and knees, round your back up toward the ceiling, then drop your belly and lift your chest. Move with your breath.',
    tip: 'Slow and smooth. Move the whole spine, not just the neck.',
    works: 'Lower back and spine. Moves the lower back gently.',
  },
  {
    slug: 'lying_hamstring_stretch', name: 'Lying hamstring stretch', muscle: 'stretch',
    sets: 2, seconds: 45, perSide: true, rest: 0,
    how: 'Lie on your back, loop a towel or band round one foot. Raise that leg and pull it gently toward you, other leg flat.',
    tip: 'Keep the knee as straight as is comfortable. No bouncing.',
    works: 'Hamstrings. Tight hamstrings pull on the lower back.',
  },
];

/** Ordered exercise slugs per gym session. The last one is the core finisher. */
export const sessions: Record<SessionKey, { name: string; day: string; slugs: string[] }> = {
  gym_a: {
    name: 'Legs', day: 'Tue',
    slugs: ['goblet_squat', 'db_romanian_deadlift', 'bulgarian_split_squat', 'hip_thrust', 'calf_raise', 'dead_bug'],
  },
  gym_b: {
    name: 'Chest and shoulders', day: 'Fri',
    slugs: ['db_bench_press', 'incline_db_press', 'seated_db_shoulder_press', 'lateral_raise', 'overhead_triceps_extension', 'plank'],
  },
  gym_c: {
    name: 'Back and arms', day: 'Sat',
    slugs: ['pull_up', 'one_arm_db_row', 'rear_delt_fly', 'db_curl', 'hammer_curl', 'side_plank'],
  },
};

const bySlug = new Map(exercises.map((e) => [e.slug, e]));

export function getExercise(slug: string): Exercise | undefined {
  return bySlug.get(slug);
}

export function exercisesForSession(key: SessionKey): Exercise[] {
  return sessions[key].slugs.map((s) => {
    const e = bySlug.get(s);
    if (!e) throw new Error(`Unknown exercise slug in session ${key}: ${s}`);
    return e;
  });
}

export function exercisesByMuscle(muscle: Muscle): Exercise[] {
  return exercises.filter((e) => e.muscle === muscle);
}

/** Slugs with no photo pair: they use a line drawing in /public/images/moves/. */
const DRAWING_ONLY = new Set(['plank', 'lying_hamstring_stretch', 'couch_stretch', 'hip_90_90', 'cat_cow']);

export type ExerciseImage =
  | { kind: 'photos'; frames: [string, string] }
  | { kind: 'drawing'; src: string };

/** Image(s) for an exercise slug. Photos are a start and an end frame. */
export function exerciseImage(slug: string): ExerciseImage {
  if (DRAWING_ONLY.has(slug)) return { kind: 'drawing', src: `/images/moves/${slug}.svg` };
  return {
    kind: 'photos',
    frames: [`/images/exercises/${slug}-0.webp`, `/images/exercises/${slug}-1.webp`],
  };
}

/** Single public path, as stored in the exercises.image_path column. */
export function exerciseImagePath(slug: string): string {
  const img = exerciseImage(slug);
  return img.kind === 'photos' ? img.frames[0] : img.src;
}
