// Database types for Steady. Mirrors supabase/migrations/0001_init.sql.
// Regenerate from the live project with the Supabase MCP `generate_typescript_types`
// (or `supabase gen types typescript`) after every migration. This file uses small
// helpers (Table, View) instead of the generated per-table boilerplate, same shape.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SexT = "male" | "female";
export type SessionKeyT =
  | "gym_a"
  | "gym_b"
  | "gym_c"
  | "run"
  | "run_intervals"
  | "football"
  | "stretch"
  | "rest";
export type ActivityT =
  | "football"
  | "run"
  | "gym"
  | "circuit"
  | "walk"
  | "stretch"
  | "cycling"
  | "other";
export type SourceT = "voice" | "text" | "tap" | "photo" | "saved" | "barcode";
export type PhotoKindT = "meal" | "progress";
export type PoseT = "front" | "side" | "back";
export type SessionStatusT = "done" | "missed" | "rest" | "none";
export type DivisionT =
  | "starting_line"
  | "showing_up"
  | "building"
  | "consistent"
  | "strong"
  | "disciplined"
  | "proven"
  | "one_year";
export type NotifyKindT =
  | "wake_gym"
  | "wake_run"
  | "log_nudge"
  | "last_call"
  | "weekly"
  | "photo_day";

type Table<Row, OptionalOnInsert extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, OptionalOnInsert> & Partial<Pick<Row, OptionalOnInsert>>;
  Update: Partial<Row>;
  Relationships: [];
};

type View<Row> = { Row: Row; Relationships: [] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      profiles: Table<
        {
          user_id: string;
          display_name: string;
          height_cm: number;
          birth_date: string;
          sex: SexT;
          goal_weight_kg: number;
          wake_time: string;
          timezone: string;
          second_run_unlocked: boolean;
          created_at: string;
        },
        "user_id" | "wake_time" | "timezone" | "second_run_unlocked" | "created_at"
      >;
      targets: Table<
        {
          id: string;
          user_id: string;
          effective_from: string;
          bmr_kcal: number;
          budget_kcal: number;
          protein_g: number;
        },
        "id" | "user_id"
      >;
      weekly_plan: Table<
        { user_id: string; weekday: number; session_key: SessionKeyT },
        "user_id"
      >;
      notification_prefs: Table<
        { user_id: string; kind: NotifyKindT; at_time: string; enabled: boolean },
        "user_id" | "enabled"
      >;
      push_subscriptions: Table<
        {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        },
        "id" | "user_id" | "created_at"
      >;
      habits: Table<
        {
          id: string;
          user_id: string;
          name: string;
          position: number;
          archived_at: string | null;
        },
        "id" | "user_id" | "archived_at"
      >;
      habit_checks: Table<
        { habit_id: string; user_id: string; day: string },
        "user_id"
      >;
      logs: Table<
        {
          id: string;
          user_id: string;
          day: string;
          raw_text: string;
          source: SourceT;
          model: string | null;
          created_at: string;
        },
        "id" | "user_id" | "model" | "created_at"
      >;
      food_entries: Table<
        {
          id: string;
          user_id: string;
          log_id: string | null;
          day: string;
          name: string;
          quantity: number | null;
          unit: string | null;
          kcal: number;
          protein_g: number;
          source: SourceT;
          confidence: number | null;
          created_at: string;
        },
        | "id"
        | "user_id"
        | "log_id"
        | "quantity"
        | "unit"
        | "protein_g"
        | "confidence"
        | "created_at"
      >;
      activity_entries: Table<
        {
          id: string;
          user_id: string;
          log_id: string | null;
          day: string;
          activity_type: ActivityT;
          session_key: SessionKeyT | null;
          duration_min: number;
          kcal_burned: number;
          rpe: number | null;
          label: string | null;
          source: SourceT;
          created_at: string;
        },
        "id" | "user_id" | "log_id" | "session_key" | "rpe" | "label" | "created_at"
      >;
      saved_foods: Table<
        {
          id: string;
          user_id: string;
          name: string;
          quantity: number | null;
          unit: string | null;
          kcal: number;
          protein_g: number;
          use_count: number;
          per100_kcal: number | null;
          per100_protein: number | null;
        },
        "id" | "user_id" | "quantity" | "unit" | "protein_g" | "use_count" | "per100_kcal" | "per100_protein"
      >;
      day_checkins: Table<
        {
          user_id: string;
          day: string;
          sleep_hours: number | null;
          energy: number | null;
          water_ml: number | null;
          cravings: string | null;
          note: string | null;
          sick: boolean;
        },
        "user_id" | "sleep_hours" | "energy" | "water_ml" | "cravings" | "note" | "sick"
      >;
      measurements: Table<
        {
          id: string;
          user_id: string;
          measured_on: string;
          weight_kg: number | null;
          waist_cm: number | null;
          neck_cm: number | null;
          chest_cm: number | null;
          hips_cm: number | null;
          thigh_cm: number | null;
          arm_cm: number | null;
        },
        | "id"
        | "user_id"
        | "weight_kg"
        | "waist_cm"
        | "neck_cm"
        | "chest_cm"
        | "hips_cm"
        | "thigh_cm"
        | "arm_cm"
      >;
      photos: Table<
        {
          id: string;
          user_id: string;
          kind: PhotoKindT;
          storage_path: string;
          taken_on: string;
          pose: PoseT | null;
          food_entry_id: string | null;
          created_at: string;
        },
        "id" | "user_id" | "pose" | "food_entry_id" | "created_at"
      >;
      exercises: Table<
        {
          slug: string;
          name: string;
          muscle: string;
          how: string;
          tip: string;
          works: string;
          alt_slug: string | null;
          image_path: string | null;
        },
        "alt_slug" | "image_path"
      >;
      workout_sessions: Table<
        {
          id: string;
          user_id: string;
          day: string;
          session_key: SessionKeyT;
          started_at: string;
          finished_at: string | null;
          rpe: number | null;
        },
        "id" | "user_id" | "started_at" | "finished_at" | "rpe"
      >;
      workout_sets: Table<
        {
          id: string;
          user_id: string;
          session_id: string;
          exercise_slug: string;
          set_no: number;
          reps: number | null;
          weight_kg: number | null;
          seconds: number | null;
        },
        "id" | "user_id" | "reps" | "weight_kg" | "seconds"
      >;
      daily_scores: Table<{
        user_id: string;
        day: string;
        logged: boolean;
        session_status: SessionStatusT;
        points: number;
        breakdown: Json;
        callus: number;
        division: DivisionT;
        career_days: number;
        streak: number;
      }>;
      weekly_reviews: Table<
        {
          user_id: string;
          week_start: string;
          result: string;
          rounds: Json;
          score_you: number;
          score_ghost: number;
          summary: string | null;
        },
        "summary"
      >;
      weekly_challenges: Table<
        {
          user_id: string;
          week_start: string;
          challenge_key: string;
          picked_at: string;
        },
        "user_id" | "picked_at"
      >;
      job_runs: Table<{ job_key: string; ran_at: string }, "ran_at">;
      user_flags: Table<
        { user_id: string; key: string; value: Json; updated_at: string },
        "user_id" | "value" | "updated_at"
      >;
      observer_notes: Table<
        {
          id: string;
          user_id: string;
          day: string;
          fact_id: string;
          text: string;
          ai: boolean;
          created_at: string;
        },
        "id" | "user_id" | "ai" | "created_at"
      >;
    };
    Views: {
      v_day_food: View<{
        user_id: string | null;
        day: string | null;
        kcal_in: number | null;
        protein_g: number | null;
        items: number | null;
      }>;
      v_day_activity: View<{
        user_id: string | null;
        day: string | null;
        kcal_burned: number | null;
        minutes: number | null;
        sessions: SessionKeyT[] | null;
      }>;
      v_weight_trend: View<{
        user_id: string | null;
        measured_on: string | null;
        weight_kg: number | null;
        avg_7d: number | null;
      }>;
    };
    Functions: { [_ in never]: never };
    Enums: {
      sex_t: SexT;
      session_key_t: SessionKeyT;
      activity_t: ActivityT;
      source_t: SourceT;
      photo_kind_t: PhotoKindT;
      pose_t: PoseT;
      session_status_t: SessionStatusT;
      level_t: DivisionT;
      notify_kind_t: NotifyKindT;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
