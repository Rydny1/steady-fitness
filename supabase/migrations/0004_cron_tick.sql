-- Scheduler: one job every 15 minutes calls POST /api/cron/tick (idempotent through job_runs).
-- The Bearer secret lives in Supabase Vault, never in this file. Create it once, by hand:
--   select vault.create_secret('<same value as the CRON_SECRET env var>', 'steady_cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'steady-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://steady-fitness.vercel.app/api/cron/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'steady_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
