-- Saved foods remember the exact per 100 g values (from a label), so any amount is exact.
alter table saved_foods
  add column if not exists per100_kcal numeric(6,1) check (per100_kcal between 0 and 900),
  add column if not exists per100_protein numeric(5,1) check (per100_protein between 0 and 100);
