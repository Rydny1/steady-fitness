-- Steady: small state the spec needs but 0001 left out.
-- user_flags: one row per remembered fact (Answer back state, trophies earned, safety lines shown, last nod).
-- observer_notes: the Gaffer's feed (one true line per day at most, kept for the Progress feed).
-- Both follow the 0001 rules: user_id on every row, RLS enabled and forced, one policy.

create table user_flags (
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  key        text not null check (char_length(key) between 1 and 80),
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table observer_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  day        date not null,
  fact_id    text not null check (char_length(fact_id) between 1 and 60),
  text       text not null check (char_length(text) between 1 and 300),
  ai         boolean not null default false,
  created_at timestamptz not null default now()
);
create index on observer_notes (user_id, day desc);

alter table user_flags     enable row level security;
alter table user_flags     force row level security;
alter table observer_notes enable row level security;
alter table observer_notes force row level security;

create policy own_rows on user_flags for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_rows on observer_notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on user_flags, observer_notes from anon;
