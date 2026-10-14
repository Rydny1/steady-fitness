-- Steady: initial schema
-- Rules: every user table has user_id + RLS. Derived numbers live in views, not columns.
-- Exception: daily_scores and weekly_reviews are an immutable ledger written by the nightly job,
-- so past results never change when rules change.
-- Child rows use composite foreign keys (parent_id, user_id) so no row can point at another user's data.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type sex_t           as enum ('male','female');
create type session_key_t   as enum ('gym_a','gym_b','gym_c','run','run_intervals','football','stretch','rest');
create type activity_t      as enum ('football','run','gym','circuit','walk','stretch','cycling','other');
create type source_t        as enum ('voice','text','tap','photo','saved','barcode');
create type photo_kind_t    as enum ('meal','progress');
create type pose_t          as enum ('front','side','back');
create type session_status_t as enum ('done','missed','rest','none');
create type division_t      as enum ('sunday_league','academy','reserves','first_team','starter','captain','champions_league','ballon_dor');
create type notify_kind_t   as enum ('wake_gym','wake_run','log_nudge','last_call','weekly');

-- ---------- Profile + settings ----------
create table profiles (
  user_id        uuid primary key references auth.users on delete cascade default auth.uid(),
  display_name   text not null check (char_length(display_name) between 1 and 40),
  height_cm      numeric(5,1) not null check (height_cm between 120 and 230),
  birth_date     date not null check (birth_date between '1940-01-01' and current_date - interval '13 years'),
  sex            sex_t not null,
  goal_weight_kg numeric(5,2) not null check (goal_weight_kg between 35 and 250),
  wake_time      time not null default '06:30',
  timezone       text not null default 'Europe/Riga',
  second_run_unlocked boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Calorie/protein targets with history. The target for a day = latest row with effective_from <= day.
create table targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade default auth.uid(),
  effective_from date not null,
  bmr_kcal       int not null check (bmr_kcal between 800 and 4000),
  budget_kcal    int not null check (budget_kcal between 1000 and 5000),
  protein_g      int not null check (protein_g between 40 and 350),
  unique (user_id, effective_from)
);

create table weekly_plan (
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  weekday     smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday
  session_key session_key_t not null,
  primary key (user_id, weekday)
);

create table notification_prefs (
  user_id  uuid not null references auth.users on delete cascade default auth.uid(),
  kind     notify_kind_t not null,
  at_time  time not null,
  enabled  boolean not null default true,
  primary key (user_id, kind)
);

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  endpoint   text not null unique check (endpoint like 'https://%'),
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- ---------- Daily promises (legacy "five promises") ----------
create table habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  name        text not null check (char_length(name) between 1 and 40),
  position    smallint not null check (position between 1 and 5),
  archived_at timestamptz,
  unique (user_id, position),
  unique (id, user_id)
);

create table habit_checks (
  habit_id uuid not null,
  user_id  uuid not null references auth.users on delete cascade default auth.uid(), -- kept for fast RLS
  day      date not null,
  primary key (habit_id, day),
  foreign key (habit_id, user_id) references habits (id, user_id) on delete cascade -- cannot point at someone else's habit
);

-- ---------- Logging ----------
-- Raw capture. Source of truth for what was said or typed. Entries point back to it.
create table logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  day        date not null,
  raw_text   text not null check (char_length(raw_text) between 1 and 4000),
  source     source_t not null,
  model      text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table food_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  log_id     uuid,
  day        date not null,
  name       text not null check (char_length(name) between 1 and 80),
  quantity   numeric(7,2) check (quantity > 0),
  unit       text check (char_length(unit) <= 16),
  kcal       int not null check (kcal between 0 and 5000),
  protein_g  numeric(5,1) not null default 0 check (protein_g between 0 and 300),
  source     source_t not null,
  confidence numeric(3,2) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (log_id, user_id) references logs (id, user_id) on delete set null (log_id)
);

create table activity_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade default auth.uid(),
  log_id        uuid,
  day           date not null,
  activity_type activity_t not null,
  session_key   session_key_t,
  duration_min  smallint not null check (duration_min between 1 and 600),
  kcal_burned   int not null check (kcal_burned between 0 and 3000), -- computed by code at save, uses weight that day
  rpe           smallint check (rpe between 1 and 10),
  source        source_t not null,
  created_at    timestamptz not null default now(),
  foreign key (log_id, user_id) references logs (id, user_id) on delete set null (log_id)
);

create table saved_foods (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users on delete cascade default auth.uid(),
  name      text not null check (char_length(name) between 1 and 80),
  quantity  numeric(7,2) check (quantity > 0),
  unit      text check (char_length(unit) <= 16),
  kcal      int not null check (kcal between 0 and 5000),
  protein_g numeric(5,1) not null default 0 check (protein_g between 0 and 300),
  use_count int not null default 0
);
create unique index saved_foods_name_uq on saved_foods (user_id, lower(name));

create table day_checkins (
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  day         date not null,
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 16),
  energy      smallint check (energy between 1 and 5),
  water_ml    int check (water_ml between 0 and 8000),
  cravings    text check (char_length(cravings) <= 1000), -- legacy "notice, don't judge"
  note        text check (char_length(note) <= 1000),
  sick        boolean not null default false, -- sick day: streak paused, no Callus change (max 3 a month, enforced in code)
  primary key (user_id, day)
);

-- ---------- Body ----------
create table measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  measured_on date not null,
  weight_kg   numeric(5,2) check (weight_kg between 35 and 300),
  waist_cm    numeric(5,1) check (waist_cm between 40 and 200),
  neck_cm     numeric(4,1) check (neck_cm between 20 and 70),
  chest_cm    numeric(5,1) check (chest_cm between 50 and 200),
  hips_cm     numeric(5,1) check (hips_cm between 50 and 200),
  thigh_cm    numeric(5,1) check (thigh_cm between 25 and 120),
  arm_cm      numeric(4,1) check (arm_cm between 15 and 70),
  unique (user_id, measured_on),
  check (coalesce(weight_kg, waist_cm, neck_cm, chest_cm, hips_cm, thigh_cm, arm_cm) is not null)
);

create table photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade default auth.uid(),
  kind          photo_kind_t not null,
  storage_path  text not null unique,
  taken_on      date not null,
  pose          pose_t,
  food_entry_id uuid,
  created_at    timestamptz not null default now(),
  check (kind = 'progress' or pose is null),
  check (kind = 'meal' or food_entry_id is null),
  check (storage_path like (user_id::text || '/%')),
  foreign key (food_entry_id, user_id) references food_entries (id, user_id) on delete set null (food_entry_id)
);

-- ---------- Training ----------
create table exercises ( -- seeded reference data, read-only for users
  slug        text primary key check (slug ~ '^[a-z0-9_]+$'),
  name        text not null,
  muscle      text not null check (muscle in ('chest','back','shoulders','arms','legs','core','stretch','cardio')),
  how         text not null check (char_length(how) <= 300),
  tip         text not null check (char_length(tip) <= 120),
  works       text not null check (char_length(works) <= 160),
  alt_slug    text,
  image_path  text
);

create table workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  day         date not null,
  session_key session_key_t not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  rpe         smallint check (rpe between 1 and 10),
  check (finished_at is null or finished_at >= started_at),
  unique (id, user_id)
);

create table workout_sets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade default auth.uid(),
  session_id    uuid not null,
  exercise_slug text not null references exercises,
  set_no        smallint not null check (set_no between 1 and 10),
  reps          smallint check (reps between 0 and 100),
  weight_kg     numeric(5,2) check (weight_kg between 0 and 300),
  seconds       smallint check (seconds between 0 and 600),
  unique (session_id, exercise_slug, set_no),
  check (reps is not null or seconds is not null),
  foreign key (session_id, user_id) references workout_sessions (id, user_id) on delete cascade
);

-- ---------- Game ledger (written only by the nightly job with the secret key) ----------
create table daily_scores (
  user_id        uuid not null references auth.users on delete cascade,
  day            date not null,
  logged         boolean not null,
  session_status session_status_t not null,
  points         smallint not null,
  breakdown      jsonb not null,
  callus         smallint not null check (callus between 0 and 100),
  division       division_t not null,
  career_days    int not null check (career_days >= 0),
  streak         int not null check (streak >= 0),
  primary key (user_id, day)
);

create table weekly_reviews ( -- You vs last week, frozen at full time
  user_id      uuid not null references auth.users on delete cascade,
  week_start   date not null check (extract(isodow from week_start) = 1),
  result       char(1) not null check (result in ('W','D','L','F')), -- F = first week, no ghost
  rounds       jsonb not null,   -- {"sessions":[you,ghost],"days_logged":[..],"fuel_closed":[..],"protein_closed":[..]}
  score_you    smallint not null check (score_you between 0 and 4),
  score_ghost  smallint not null check (score_ghost between 0 and 4),
  summary      text check (char_length(summary) <= 800),
  primary key (user_id, week_start)
);

-- The weekly challenge the user picked. Offers and completion are computed from data, never stored.
create table weekly_challenges (
  user_id       uuid not null references auth.users on delete cascade default auth.uid(),
  week_start    date not null check (extract(isodow from week_start) = 1),
  challenge_key text not null check (challenge_key in ('early_kickoff','protein_five','clean_week','full_ninety','ten_k_minutes','photo_day','weigh_in_three','sleep_seven')),
  picked_at     timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Idempotency for scheduled work. No client access at all.
create table job_runs (
  job_key  text primary key,  -- e.g. 'score:2026-10-14', 'push:log_nudge:2026-10-14'
  ran_at   timestamptz not null default now()
);

-- ---------- Indexes ----------
create index on logs (user_id, day);
create index on food_entries (user_id, day);
create index on activity_entries (user_id, day);
create index on measurements (user_id, measured_on desc);
create index on photos (user_id, kind, taken_on desc);
create index on workout_sessions (user_id, day);
create index on workout_sets (session_id);
create index on workout_sets (user_id, exercise_slug);
create index on habit_checks (user_id, day);
create index on targets (user_id, effective_from desc);

-- ---------- Views (derived, never stored) ----------
create view v_day_food with (security_invoker = true) as
  select user_id, day, sum(kcal)::int as kcal_in, sum(protein_g)::numeric(6,1) as protein_g, count(*) as items
  from food_entries group by user_id, day;

create view v_day_activity with (security_invoker = true) as
  select user_id, day, sum(kcal_burned)::int as kcal_burned, sum(duration_min)::int as minutes,
         array_agg(distinct session_key) filter (where session_key is not null) as sessions
  from activity_entries group by user_id, day;

create view v_weight_trend with (security_invoker = true) as
  select user_id, measured_on, weight_kg,
         round(avg(weight_kg) over (partition by user_id order by measured_on
               range between interval '6 days' preceding and current row), 2) as avg_7d
  from measurements where weight_kg is not null;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','targets','weekly_plan','notification_prefs','push_subscriptions',
    'habits','habit_checks','logs','food_entries','activity_entries','saved_foods',
    'day_checkins','measurements','photos','workout_sessions','workout_sets','weekly_challenges'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$create policy own_rows on %I for all to authenticated
                     using ((select auth.uid()) = user_id)
                     with check ((select auth.uid()) = user_id)$p$, t);
  end loop;
end $$;

-- Ledger: users read, never write
alter table daily_scores   enable row level security;
alter table weekly_reviews enable row level security;
create policy read_own on daily_scores   for select to authenticated using ((select auth.uid()) = user_id);
create policy read_own on weekly_reviews for select to authenticated using ((select auth.uid()) = user_id);

-- Reference data: read only
alter table exercises enable row level security;
create policy read_all on exercises for select to authenticated using (true);

-- Jobs: locked
alter table job_runs enable row level security;

-- Nobody signed-out gets anything
revoke all on all tables in schema public from anon;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos','meal-photos', false, 5242880, array['image/jpeg','image/webp']),
       ('progress-photos','progress-photos', false, 5242880, array['image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy photos_own on storage.objects for all to authenticated
  using (bucket_id in ('meal-photos','progress-photos')
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('meal-photos','progress-photos')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
