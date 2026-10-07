-- Test allenamento: dati personali e serie legate al proprietario della sessione.
\set ON_ERROR_STOP 1
\o /dev/null

create or replace function pg_temp.login(p_email text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = p_email), false);
  set role authenticated;
end $$;

select pg_temp.login('mattia@test.it');
insert into public.workout_plans (name, blocks) values ('Push', '[{"kind":"single","items":[{"exerciseKey":"panca-piana","sets":4,"reps":"8"}]}]');
insert into public.workout_sessions (kind, name) values ('strength', 'Push');
insert into public.workout_sets (session_id, exercise_key, exercise_name, set_index, weight_kg, reps)
select id, 'panca-piana', 'Panca piana', 0, 80, 8 from public.workout_sessions where name = 'Push';
insert into public.workout_sessions (kind, name, duration_sec, distance_m) values ('run', 'Corsa', 1800, 5000);
insert into public.user_module_access (user_id, module, enabled) values (auth.uid(), 'nutrition', true);

do $$ begin
  assert (select count(*) from public.workout_sets) = 1, 'serie salvata';
  assert (select user_id from public.workout_sets limit 1) = auth.uid(), 'serie del proprietario';
end $$;

select pg_temp.login('lei@test.it');
do $$
declare v_session uuid;
begin
  assert not exists (select 1 from public.workout_plans), 'schede altrui invisibili';
  assert not exists (select 1 from public.workout_sessions), 'sessioni altrui invisibili';
  -- Non può aggiungere serie alla sessione di un altro (nemmeno conoscendone l'id)
  reset role;
  select id into v_session from public.workout_sessions where name = 'Push';
  set role authenticated;
  begin
    insert into public.workout_sets (session_id, exercise_key, exercise_name) values (v_session, 'x', 'x');
    raise exception 'doveva fallire';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Unità di misura: serie a tempo e a distanza, esercizi personalizzati a tempo
select pg_temp.login('mattia@test.it');
insert into public.workout_sets (session_id, exercise_key, exercise_name, duration_sec)
select id, 'plank', 'Plank', 60 from public.workout_sessions where name = 'Push';
insert into public.workout_sets (session_id, exercise_key, exercise_name, weight_kg, distance_m)
select id, 'farmer-walk', 'Farmer walk', 24, 40 from public.workout_sessions where name = 'Push';
insert into public.custom_exercises (name, primary_muscles, measure) values ('Plank su fitball', '{abs}', 'time');
insert into public.user_module_access (user_id, module, enabled) values (auth.uid(), 'work', true);
do $$ begin
  assert (select duration_sec from public.workout_sets where exercise_key = 'plank') = 60, 'serie a tempo';
  assert (select distance_m from public.workout_sets where exercise_key = 'farmer-walk') = 40, 'serie a distanza';
  begin
    insert into public.custom_exercises (name, measure) values ('X', 'boh');
    raise exception 'doveva fallire';
  exception when check_violation then null;
  end;
end $$;
reset role;
