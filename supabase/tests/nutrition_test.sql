-- Test alimentazione: dati personali e vincoli.
\set ON_ERROR_STOP 1
\o /dev/null

create or replace function pg_temp.login(p_email text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = p_email), false);
  set role authenticated;
end $$;

select pg_temp.login('mattia@test.it');
insert into public.nutrition_profiles (sex, birth_date, height_cm, goal) values ('m', '1995-05-10', 180, 'lose');
insert into public.body_weights (date, weight_kg) values ('2026-10-01', 80.4), ('2026-10-06', 79.8);
insert into public.foods (name, kcal, protein, carbs, fat, barcode, source) values ('Yogurt greco', 59, 10, 3.6, 0.4, '123', 'off');
insert into public.food_logs (date, meal, food_key, food_name, grams, kcal, protein) values ('2026-10-06', 'breakfast', 'cat:avena', 'Avena', 50, 190, 6.5);
insert into public.water_logs (date, ml) values ('2026-10-06', 500);

do $$ begin
  begin
    insert into public.body_weights (date, weight_kg) values ('2026-10-06', 79);
    raise exception 'doveva fallire';
  exception when unique_violation then null;
  end;
  begin
    insert into public.water_logs (date, ml) values ('2026-10-06', 0);
    raise exception 'doveva fallire';
  exception when check_violation then null;
  end;
end $$;

select pg_temp.login('lei@test.it');
do $$ begin
  assert not exists (select 1 from public.body_weights), 'pesate altrui invisibili';
  assert not exists (select 1 from public.food_logs), 'diario altrui invisibile';
  assert not exists (select 1 from public.nutrition_profiles), 'profilo altrui invisibile';
  -- stesso barcode per utenti diversi è permesso
  insert into public.foods (name, kcal, barcode) values ('Yogurt greco', 59, '123');
end $$;

reset role;
