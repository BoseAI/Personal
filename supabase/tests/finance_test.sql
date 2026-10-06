-- Test dello schema finanze. Ogni assert fallito interrompe lo script.
\set ON_ERROR_STOP 1
\o /dev/null

create or replace function pg_temp.login(p_email text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = p_email), false);
  set role authenticated;
end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- Utenti creati "da dashboard" (senza sessione)
insert into auth.users (email, raw_user_meta_data) values
  ('mattia@test.it', '{"display_name":"Mattia"}'),
  ('lei@test.it', '{"display_name":"Giulia"}'),
  ('altro@test.it', '{}');

do $$
begin
  assert (select count(*) from public.profiles) = 3, 'profili creati';
  assert (select count(*) from public.accounts where kind = 'personal') = 3, 'conti personali creati';
  assert (select count(*) from public.account_members where role = 'owner') = 3, 'proprietari assegnati';
  assert (select display_name from public.profiles p join auth.users u on u.id = p.id where u.email = 'altro@test.it') = 'altro',
    'nome di default dalla email';
  assert (select count(*) from public.categories c join public.accounts a on a.id = c.account_id
          where a.name = 'Mattia' and c.name = 'Benzina') = 1, 'sottocategorie predefinite';
end $$;

-- ---------------------------------------------------------------------------
-- Isolamento: ognuno vede solo il proprio conto
-- ---------------------------------------------------------------------------
select pg_temp.login('mattia@test.it');
do $$
begin
  assert (select count(*) from public.accounts) = 1, 'Mattia vede solo il suo conto';
  assert (select count(*) from public.profiles) = 1, 'Mattia vede solo il suo profilo';
end $$;

-- Conto condiviso creato da Mattia
insert into public.accounts (name, kind, icon) values ('Casa', 'shared', 'house');
do $$
declare v_shared uuid := (select id from public.accounts where name = 'Casa');
begin
  assert public.account_role(v_shared) = 'owner', 'creatore proprietario del condiviso';
  assert exists (select 1 from public.categories where account_id = v_shared and name = 'Versamenti'), 'categorie condiviso';
  assert exists (select 1 from public.categories c where c.name = 'Versamento Casa' and c.transfer_category_id is not null),
    'categoria di trasferimento creata nel personale di Mattia';
end $$;

-- Invito Giulia come editor sul condiviso
select public.add_account_member((select id from public.accounts where name = 'Casa'), 'LEI@test.it', 'editor');

-- Un estraneo non può gestire i membri
select pg_temp.login('altro@test.it');
do $$
begin
  begin
    perform public.add_account_member((select id from public.accounts where name = 'Casa' limit 1), 'altro@test.it', 'owner');
    raise exception 'doveva fallire';
  exception when others then
    assert sqlerrm <> 'doveva fallire', 'add_account_member senza permessi deve fallire';
  end;
  assert (select count(*) from public.accounts) = 1, 'altro vede solo il suo conto';
end $$;

select pg_temp.login('lei@test.it');
do $$
begin
  assert (select count(*) from public.accounts) = 2, 'Giulia vede il suo conto e il condiviso';
  assert (select count(*) from public.profiles) = 2, 'Giulia vede il profilo di Mattia';
  assert exists (select 1 from public.categories c join public.accounts a on a.id = c.account_id
                 where a.name = 'Giulia' and c.name = 'Versamento Casa'), 'trasferimento creato anche per Giulia';
end $$;

-- ---------------------------------------------------------------------------
-- Trasferimento: uscita personale -> entrata nel condiviso
-- ---------------------------------------------------------------------------
insert into public.transactions (account_id, category_id, amount, date, description)
select a.id, c.id, 500, '2026-10-01', 'Ottobre'
from public.accounts a join public.categories c on c.account_id = a.id
where a.name = 'Giulia' and c.name = 'Versamento Casa';

do $$
declare v_mirror public.transactions;
begin
  select t.* into v_mirror from public.transactions t join public.accounts a on a.id = t.account_id
  where a.name = 'Casa';
  assert v_mirror.amount = 500, 'entrata speculare creata';
  assert v_mirror.transfer_source_id is not null, 'collegata alla sorgente';
  assert v_mirror.description = 'Versamento da Giulia · Ottobre', 'descrizione speculare: ' || v_mirror.description;
  assert (select balance from public.account_balances b join public.accounts a on a.id = b.account_id where a.name = 'Casa') = 500,
    'saldo condiviso';
  assert (select balance from public.account_balances b join public.accounts a on a.id = b.account_id where a.name = 'Giulia') = -500,
    'saldo personale';

  -- La speculare non è modificabile direttamente
  update public.transactions set amount = 1 where id = v_mirror.id;
  assert (select amount from public.transactions where id = v_mirror.id) = 500, 'speculare non modificabile';
end $$;

-- Modifica e sospensione della sorgente si propagano
update public.transactions set amount = 450, date = '2026-10-02'
where transfer_source_id is null and amount = 500;
do $$
begin
  assert (select amount from public.transactions where transfer_source_id is not null) = 450, 'importo propagato';
  assert (select date from public.transactions where transfer_source_id is not null) = '2026-10-02', 'data propagata';
end $$;
update public.transactions set status = 'pending' where transfer_source_id is null and amount = 450;
do $$ begin
  assert not exists (select 1 from public.transactions where transfer_source_id is not null), 'speculare rimossa se in attesa';
end $$;
update public.transactions set status = 'confirmed' where amount = 450;
delete from public.transactions where transfer_source_id is null and amount = 450;
do $$ begin
  assert not exists (select 1 from public.transactions where transfer_source_id is not null), 'speculare eliminata con la sorgente';
end $$;

-- ---------------------------------------------------------------------------
-- Permessi: viewer non può scrivere
-- ---------------------------------------------------------------------------
select pg_temp.login('mattia@test.it');
select public.add_account_member((select id from public.accounts where name = 'Mattia'), 'lei@test.it', 'viewer');
select pg_temp.login('lei@test.it');
do $$
declare v_acc uuid := (select id from public.accounts where name = 'Mattia');
begin
  assert public.account_role(v_acc) = 'viewer', 'Giulia viewer su Mattia';
  begin
    insert into public.transactions (account_id, category_id, amount, date)
    values (v_acc, (select id from public.categories where account_id = v_acc and name = 'Benzina'), 10, current_date);
    raise exception 'doveva fallire';
  exception when insufficient_privilege then null;
  end;
  update public.accounts set name = 'Hack' where id = v_acc;
  assert (select name from public.accounts where id = v_acc) = 'Mattia', 'viewer non rinomina il conto';
end $$;

-- ---------------------------------------------------------------------------
-- Ultimo proprietario protetto
-- ---------------------------------------------------------------------------
select pg_temp.login('mattia@test.it');
do $$
begin
  begin
    update public.account_members set role = 'editor'
    where user_id = auth.uid() and account_id = (select id from public.accounts where name = 'Mattia');
    raise exception 'doveva fallire';
  exception when others then
    assert sqlerrm like '%almeno un proprietario%', 'ultimo proprietario: ' || sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Categorie: massimo due livelli, stesso tipo
-- ---------------------------------------------------------------------------
do $$
declare v_acc uuid := (select id from public.accounts where name = 'Mattia');
begin
  begin
    insert into public.categories (account_id, parent_id, kind, name)
    values (v_acc, (select id from public.categories where account_id = v_acc and name = 'Benzina'), 'expense', 'Troppo profonda');
    raise exception 'doveva fallire';
  exception when others then
    assert sqlerrm like '%due livelli%', 'tre livelli: ' || sqlerrm;
  end;
  begin
    insert into public.categories (account_id, parent_id, kind, name)
    values (v_acc, (select id from public.categories where account_id = v_acc and name = 'Auto'), 'income', 'Tipo sbagliato');
    raise exception 'doveva fallire';
  exception when others then
    assert sqlerrm like '%stesso conto e tipo%', 'tipo diverso: ' || sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Ricorrenti
-- ---------------------------------------------------------------------------
insert into public.recurring_transactions (account_id, category_id, amount, description, frequency, start_date, auto_confirm)
select a.id, c.id, 39.90, 'Palestra', 'monthly', '2026-01-31', true
from public.accounts a join public.categories c on c.account_id = a.id
where a.name = 'Mattia' and c.name = 'Palestra';

insert into public.recurring_transactions (account_id, category_id, amount, description, frequency, start_date, end_date, auto_confirm)
select a.id, c.id, 80, 'Luce', 'monthly', '2026-08-15', '2026-09-30', false
from public.accounts a join public.categories c on c.account_id = a.id
where a.name = 'Mattia' and c.name = 'Luce';

do $$
declare v_n integer;
begin
  v_n := public.generate_recurring('2026-10-06');
  assert v_n = 11, 'generate: 9 palestra + 2 luce, ottenuti ' || v_n;
  assert public.generate_recurring('2026-10-06') = 0, 'idempotente';
  assert (select array_agg(date order by date)::text from public.transactions where description = 'Palestra')
    = '{2026-01-31,2026-02-28,2026-03-31,2026-04-30,2026-05-31,2026-06-30,2026-07-31,2026-08-31,2026-09-30}',
    'date ancorate a fine mese';
  assert (select next_date from public.recurring_transactions where description = 'Palestra') = '2026-10-31', 'prossima data';
  assert (select count(*) from public.transactions where description = 'Luce' and status = 'pending') = 2, 'luce da confermare';
  assert not (select active from public.recurring_transactions where description = 'Luce'), 'luce terminata';
end $$;

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
do $$
declare v_acc uuid := (select id from public.accounts where name = 'Mattia');
begin
  assert (select expense from public.finance_monthly_totals(v_acc, '2026-02-01', '2026-02-28')) = 39.90, 'totale mensile';
  assert (select sum(total) from public.finance_category_totals(v_acc, '2026-01-01', '2026-12-31')) = 39.90 * 9,
    'totali per categoria escludono i pending';
end $$;

-- ---------------------------------------------------------------------------
-- Eliminazione conto condiviso (cascade nonostante la protezione proprietario)
-- ---------------------------------------------------------------------------
delete from public.accounts where name = 'Casa';
do $$ begin
  assert not exists (select 1 from public.accounts where name = 'Casa'), 'condiviso eliminato';
end $$;

select pg_temp.logout();
