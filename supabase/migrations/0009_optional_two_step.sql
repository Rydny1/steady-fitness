-- Two-step sign-in is now optional (less friction at sign-up), and enforced for anyone who turns it on.
-- A session may read and write when it is two-step verified (aal2), OR the person has no verified
-- authenticator app. Once they enrol one, a password-only session (aal1) sees nothing, even through
-- the REST API. The check lives in a security definer function because clients cannot read auth.mfa_factors.

create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (auth.jwt() ->> 'aal') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','targets','weekly_plan','notification_prefs','push_subscriptions',
    'habits','habit_checks','logs','food_entries','activity_entries','saved_foods',
    'day_checkins','measurements','photos','workout_sessions','workout_sets',
    'weekly_challenges','user_flags','observer_notes','daily_scores','weekly_reviews','exercises'
  ] loop
    execute format('drop policy if exists require_aal2 on %I', t);
    execute format($p$create policy require_aal2 on %I as restrictive for all to authenticated
                     using ((select public.mfa_satisfied()))
                     with check ((select public.mfa_satisfied()))$p$, t);
  end loop;
end $$;

drop policy if exists require_aal2 on storage.objects;
create policy require_aal2 on storage.objects as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));
