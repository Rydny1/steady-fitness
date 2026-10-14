-- Run against LOCAL supabase only (supabase db reset first). Proves user B cannot read or write user A rows.
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-00000000000a','role','authenticated')::text, false);
insert into measurements (measured_on, weight_kg) values (current_date, 82.4);
insert into food_entries (day,name,kcal,protein_g,source) values (current_date,'skyr',95,16,'tap');
select 'A sees', count(*) from measurements;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b'; select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-00000000000b','role','authenticated')::text, false);
select 'B sees', count(*) from measurements;
select 'B sees food view', count(*) from v_day_food;
do $$ begin
  insert into measurements (user_id, measured_on, weight_kg) values ('00000000-0000-0000-0000-00000000000a', current_date - 1, 90);
  raise notice 'FAIL: B wrote as A';
exception when others then raise notice 'OK: B blocked writing as A';
end $$;
do $$ begin
  insert into measurements (measured_on, weight_kg) values (current_date, 500);
  raise notice 'FAIL: bad weight accepted';
exception when check_violation then raise notice 'OK: bad weight rejected';
end $$;
rollback;
