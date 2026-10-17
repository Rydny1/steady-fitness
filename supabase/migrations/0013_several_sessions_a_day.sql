-- A day can hold up to three sessions (a run in the morning, football in the evening).
alter table weekly_plan drop constraint if exists weekly_plan_pkey;
alter table weekly_plan add constraint weekly_plan_pkey primary key (user_id, weekday, session_key);
