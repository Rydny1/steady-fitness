-- Promises are no longer exactly five: any number up to nine active. Retired promises keep their
-- history (archived, parked at a high position so the unique position rule is not in the way).
alter table habits drop constraint if exists habits_position_check;
alter table habits add constraint habits_position_check check (position between 1 and 999);
