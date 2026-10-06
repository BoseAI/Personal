-- Test amministratore, sezioni per utente e liste della spesa.
-- Gira dopo finance_test.sql: utenti mattia/lei/altro già presenti.
\set ON_ERROR_STOP 1
\o /dev/null

create or replace function pg_temp.login(p_email text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = p_email), false);
  set role authenticated;
end $$;

do $$
begin
  assert (select count(*) from public.profiles where is_admin) = 1, 'un solo amministratore';
  assert (select p.is_admin from public.profiles p join auth.users u on u.id = p.id where u.email = 'mattia@test.it'),
    'il primo utente è amministratore';
  assert (select count(*) from public.shopping_lists) = 6, 'due liste predefinite per utente';
end $$;

-- ---------------------------------------------------------------------------
-- Amministratore e sezioni
-- ---------------------------------------------------------------------------
select pg_temp.login('lei@test.it');
do $$
begin
  -- Non può promuoversi amministratore
  begin
    update public.profiles set is_admin = true where id = auth.uid();
    raise exception 'doveva fallire';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_users();
    raise exception 'doveva fallire';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.user_module_access (user_id, module, enabled) values (auth.uid(), 'workout', true);
    raise exception 'doveva fallire';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set display_name = 'Giulia B' where id = auth.uid();
  assert (select display_name from public.profiles where id = auth.uid()) = 'Giulia B', 'può cambiare il proprio nome';
  assert (select count(*) from public.shopping_lists) = 2, 'Giulia vede solo le sue liste';
end $$;

select pg_temp.login('mattia@test.it');
do $$
declare v_lei uuid := (select id from public.admin_list_users() where email = 'lei@test.it');
begin
  assert (select count(*) from public.admin_list_users()) = 3, 'admin vede tutti gli utenti';
  insert into public.user_module_access (user_id, module, enabled) values (v_lei, 'workout', false);
  begin
    perform public.set_user_admin(auth.uid(), false);
    raise exception 'doveva fallire';
  exception when others then
    assert sqlerrm like '%almeno un amministratore%', sqlerrm;
  end;
end $$;

select pg_temp.login('lei@test.it');
do $$ begin
  assert (select enabled from public.user_module_access where module = 'workout') = false, 'Giulia vede la propria restrizione';
end $$;

-- ---------------------------------------------------------------------------
-- Liste: creazione, condivisione, permessi
-- ---------------------------------------------------------------------------
select pg_temp.login('mattia@test.it');
insert into public.shopping_lists (name, icon, checked_behavior) values ('Farmacia', 'pill', 'delete');
do $$
declare v_list uuid := (select id from public.shopping_lists where name = 'Farmacia');
begin
  assert public.list_role(v_list) = 'owner', 'creatore proprietario';
  insert into public.shopping_items (list_id, name) values (v_list, '  Tachipirina  ');
  assert (select name from public.shopping_items where list_id = v_list) = 'Tachipirina', 'nome ripulito';
  assert (select quantity from public.shopping_items where list_id = v_list) = 1, 'quantità di default 1';
  perform public.add_list_member(v_list, 'lei@test.it', 'viewer');
end $$;

select pg_temp.login('lei@test.it');
do $$
declare v_list uuid := (select id from public.shopping_lists where name = 'Farmacia');
begin
  assert v_list is not null, 'Giulia vede la lista condivisa';
  assert exists (select 1 from public.profiles where display_name = 'Mattia'),
    'vede il nome di chi condivide';
  begin
    insert into public.shopping_items (list_id, name) values (v_list, 'Cerotti');
    raise exception 'doveva fallire';
  exception when insufficient_privilege then null;
  end;
  update public.shopping_items set checked = true where list_id = v_list;
  assert not (select checked from public.shopping_items where list_id = v_list), 'viewer non spunta';
end $$;

select pg_temp.login('mattia@test.it');
select public.add_list_member((select id from public.shopping_lists where name = 'Farmacia'), 'lei@test.it', 'editor');

select pg_temp.login('lei@test.it');
do $$
declare v_list uuid := (select id from public.shopping_lists where name = 'Farmacia');
begin
  insert into public.shopping_items (list_id, name, quantity) values (v_list, 'Cerotti', 2);
  update public.shopping_items set checked = true where list_id = v_list and name = 'Cerotti';
  assert (select checked_by from public.shopping_items where name = 'Cerotti') = auth.uid(), 'registra chi spunta';
  assert (select checked_at from public.shopping_items where name = 'Cerotti') is not null, 'registra quando';
  update public.shopping_items set checked = false where name = 'Cerotti';
  assert (select checked_at from public.shopping_items where name = 'Cerotti') is null, 'togliere la spunta azzera';
  -- l'editor non cambia le impostazioni della lista
  update public.shopping_lists set name = 'Hack' where id = v_list;
  assert (select name from public.shopping_lists where id = v_list) = 'Farmacia', 'editor non rinomina';
  -- può uscire dalla lista
  delete from public.shopping_list_members where list_id = v_list and user_id = auth.uid();
  assert not exists (select 1 from public.shopping_lists where id = v_list), 'uscita dalla lista';
end $$;

-- L'estraneo non vede nulla
select pg_temp.login('altro@test.it');
do $$ begin
  assert not exists (select 1 from public.shopping_items), 'nessun elemento altrui visibile';
end $$;

-- Eliminazione lista con cascade
select pg_temp.login('mattia@test.it');
delete from public.shopping_lists where name = 'Farmacia';
do $$ begin
  assert not exists (select 1 from public.shopping_items where name = 'Cerotti'), 'elementi eliminati con la lista';
end $$;

reset role;
