-- Steady has one owner. Sign-ups are closed while an account exists, and when none exists
-- (first run, or after "Delete everything") only the owner's email may create it.
create or replace function public.block_new_signups()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users)
     or lower(coalesce(new.email, '')) <> 'rydny01@gmail.com' then
    raise exception 'Sign-ups are closed';
  end if;
  return new;
end;
$$;

revoke all on function public.block_new_signups() from public, anon, authenticated;
