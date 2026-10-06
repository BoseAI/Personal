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
