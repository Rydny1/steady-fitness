-- 1. Two-step sign-in is enforced by the database, not only by the app's redirects.
-- A restrictive policy means a password-only session (aal1) reads and writes nothing,
-- even straight through the REST API. The service role (cron, delete account) is unaffected.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','targets','weekly_plan','notification_prefs','push_subscriptions',
    'habits','habit_checks','logs','food_entries','activity_entries','saved_foods',
    'day_checkins','measurements','photos','workout_sessions','workout_sets',
    'weekly_challenges','user_flags','observer_notes','daily_scores','weekly_reviews','exercises'
  ] loop
    execute format($p$create policy require_aal2 on %I as restrictive for all to authenticated
                     using ((select auth.jwt() ->> 'aal') = 'aal2')
                     with check ((select auth.jwt() ->> 'aal') = 'aal2')$p$, t);
  end loop;
end $$;

create policy require_aal2 on storage.objects as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- 2. Force RLS on the remaining tables too.
alter table daily_scores   force row level security;
alter table weekly_reviews force row level security;
alter table exercises      force row level security;
alter table job_runs       force row level security;

-- 3. Accounts are created only through the Steady sign-up (12+ characters, consent, rate guard).
-- Direct calls to the public Auth sign-up endpoint cannot set app_metadata, so they are refused.
create or replace function public.require_steady_signup()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'steady_signup', '') <> 'true' then
    raise exception 'Create your account in the Steady app';
  end if;
  return new;
end;
$$;

revoke all on function public.require_steady_signup() from public, anon, authenticated;

create trigger require_steady_signup
  before insert on auth.users
  for each row execute function public.require_steady_signup();
