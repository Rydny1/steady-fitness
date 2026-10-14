-- Levels replace the football-themed divisions. Nothing had been scored when this ran, so a rename is safe.
alter type division_t rename to level_t;
alter type level_t rename value 'sunday_league' to 'starting_line';
alter type level_t rename value 'academy' to 'showing_up';
alter type level_t rename value 'reserves' to 'building';
alter type level_t rename value 'first_team' to 'consistent';
alter type level_t rename value 'starter' to 'strong';
alter type level_t rename value 'captain' to 'disciplined';
alter type level_t rename value 'champions_league' to 'proven';
alter type level_t rename value 'ballon_dor' to 'one_year';

-- The fortnightly progress photo nudge is its own notification kind.
alter type notify_kind_t add value if not exists 'photo_day';
