-- The owner asked for normal open sign-up. Row Level Security keeps every account's data private.
drop trigger if exists block_new_signups on auth.users;
drop function if exists public.block_new_signups();
