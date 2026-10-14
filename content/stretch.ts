// The 10 minute stretch routine: daily, after football, or before bed.
// Exercise cards for each slug live in exercises.ts.
import { exerciseImage, type ExerciseImage } from './exercises';

export type StretchStep = {
  slug: string;
  name: string;
  /** Sets and amount, as shown in the app. */
  prescription: string;
  sets: number;
  seconds?: number;
  reps?: number;
  perSide: boolean;
  why: string;
};

export const stretchRoutine: StretchStep[] = [
  {
    slug: 'kneeling_hip_flexor_stretch', name: 'Kneeling hip flexor stretch',
    prescription: '2 x 45 s a side', sets: 2, seconds: 45, perSide: true,
    why: 'Opens the front of the hip that sitting shortens. The main one for lower back tightness',
  },
  {
    slug: 'hip_90_90', name: '90/90 hip switch',
    prescription: '2 x 8 a side', sets: 2, reps: 8, perSide: true,
    why: 'Hip rotation for football',
  },
  {
    slug: 'cat_cow', name: 'Cat-cow',
    prescription: '2 x 10 slow', sets: 2, reps: 10, perSide: false,
    why: 'Moves the lower back gently',
  },
  {
    slug: 'lying_hamstring_stretch', name: 'Lying hamstring stretch (towel or band)',
    prescription: '2 x 45 s a side', sets: 2, seconds: 45, perSide: true,
    why: 'Tight hamstrings pull on the lower back',
  },
];

export const stretchProgression =
  'Once the kneeling hip flexor stretch is easy, move to the couch stretch (back knee against a wall).';

export function stretchImage(slug: string): ExerciseImage {
  return exerciseImage(slug);
}
