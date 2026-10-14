-- Accounts are created only by the Steady server (12+ characters, consent, rate guard).
-- The server puts a secret token in the new user's metadata. The same token lives in Vault.
-- Direct calls to the public Auth sign-up endpoint cannot know it, so they are refused.
-- Create the secret once, by hand, with the same value as the SIGNUP_TOKEN env var:
--   select vault.create_secret('<SIGNUP_TOKEN value>', 'steady_signup_token');
create or replace function public.require_steady_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name = 'steady_signup_token';
  if expected is null
     or coalesce(new.raw_user_meta_data ->> 'steady_signup_token', '') <> expected then
    raise exception 'Create your account in the Steady app';
  end if;
  return new;
end;
$$;

revoke all on function public.require_steady_signup() from public, anon, authenticated;
