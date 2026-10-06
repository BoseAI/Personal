-- =============================================================================
-- Personal — core schema: profili, conti, membri/ruoli, finanze
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipi
-- -----------------------------------------------------------------------------
create type public.account_kind as enum ('personal', 'shared');
-- L'ordine conta: i confronti (role >= 'editor') si basano sull'ordine dell'enum.
create type public.member_role as enum ('viewer', 'editor', 'owner');
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_status as enum ('confirmed', 'pending');
create type public.recurrence_frequency as enum ('weekly', 'monthly', 'yearly');

-- -----------------------------------------------------------------------------
-- Tabelle
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  kind            public.account_kind not null,
  icon            text not null default 'wallet',
  color           text not null default '#2a78d6',
  opening_balance numeric(12, 2) not null default 0,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
alter table public.accounts enable row level security;

create table public.account_members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index account_members_user_idx on public.account_members (user_id);
alter table public.account_members enable row level security;

create table public.categories (
  id                   uuid primary key default gen_random_uuid(),
  account_id           uuid not null references public.accounts (id) on delete cascade,
  parent_id            uuid references public.categories (id) on delete restrict,
  kind                 public.category_kind not null,
  name                 text not null check (length(trim(name)) > 0),
  icon                 text not null default 'circle',
  color                text not null default '#2a78d6',
  -- Se valorizzata, ogni movimento confermato in questa categoria (uscita)
  -- genera un'entrata speculare nella categoria indicata (di un altro conto).
  transfer_category_id uuid references public.categories (id) on delete set null,
  sort_order           integer not null default 0,
  archived_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index categories_account_idx on public.categories (account_id);
create index categories_parent_idx on public.categories (parent_id);
create unique index categories_unique_name_idx
  on public.categories (account_id, kind, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
alter table public.categories enable row level security;

create table public.recurring_transactions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete restrict,
  amount       numeric(12, 2) not null check (amount > 0),
  description  text,
  frequency    public.recurrence_frequency not null default 'monthly',
  interval_count integer not null default 1 check (interval_count between 1 and 60),
  start_date   date not null,
  end_date     date,
  -- Numero di occorrenze già generate: la prossima è start_date + n * intervallo.
  -- Calcolare dall'ancora evita la deriva (31 gen -> 28 feb -> 28 mar ...).
  occurrences  integer not null default 0,
  next_date    date not null,
  auto_confirm boolean not null default true,
  active       boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index recurring_account_idx on public.recurring_transactions (account_id);
alter table public.recurring_transactions enable row level security;

create table public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.accounts (id) on delete cascade,
  category_id        uuid not null references public.categories (id) on delete restrict,
  amount             numeric(12, 2) not null check (amount > 0),
  date               date not null,
  description        text,
  status             public.transaction_status not null default 'confirmed',
  recurring_id       uuid references public.recurring_transactions (id) on delete set null,
  -- Valorizzato solo sui movimenti speculari generati da un trasferimento.
  transfer_source_id uuid unique references public.transactions (id) on delete cascade,
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index transactions_account_date_idx on public.transactions (account_id, date desc);
create index transactions_category_idx on public.transactions (category_id);
create unique index transactions_recurring_date_idx
  on public.transactions (recurring_id, date) where recurring_id is not null;
alter table public.transactions enable row level security;

-- -----------------------------------------------------------------------------
-- Helper permessi
-- -----------------------------------------------------------------------------
create function public.account_role(p_account uuid)
returns public.member_role
language sql stable security definer set search_path = ''
as $$
  select role from public.account_members
  where account_id = p_account and user_id = auth.uid()
$$;

create function public.has_account_role(p_account uuid, p_min public.member_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.account_role(p_account) >= p_min, false)
$$;

create function public.shares_account_with(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.account_members a
    join public.account_members b on b.account_id = a.account_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

-- -----------------------------------------------------------------------------
-- Categorie predefinite
-- -----------------------------------------------------------------------------
create function public.seed_category(
  p_account uuid, p_kind public.category_kind, p_name text, p_icon text, p_color text,
  p_sort integer, p_children text[][] default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  i integer;
begin
  insert into public.categories (account_id, kind, name, icon, color, sort_order)
  values (p_account, p_kind, p_name, p_icon, p_color, p_sort)
  returning id into v_id;

  if p_children is not null then
    for i in 1 .. array_length(p_children, 1) loop
      insert into public.categories (account_id, parent_id, kind, name, icon, color, sort_order)
      values (p_account, v_id, p_kind, p_children[i][1], p_children[i][2], p_color, i);
    end loop;
  end if;
  return v_id;
end;
$$;

create function public.seed_personal_categories(p_account uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- Entrate
  perform public.seed_category(p_account, 'income', 'Stipendio', 'banknote', '#1baf7a', 1, array[
    ['Stipendio', 'banknote'], ['Tredicesima', 'calendar-check'], ['Quattordicesima', 'calendar-check'], ['Bonus', 'badge-euro']]);
  perform public.seed_category(p_account, 'income', 'Entrate extra', 'sparkles', '#2a78d6', 2, array[
    ['Lavori extra', 'briefcase'], ['Vendite', 'tag'], ['Rimborsi', 'undo-2'], ['Regali', 'gift'], ['Interessi e rendite', 'trending-up']]);

  -- Uscite
  perform public.seed_category(p_account, 'expense', 'Casa', 'house', '#2a78d6', 1, array[
    ['Affitto / Mutuo', 'key-round'], ['Luce', 'zap'], ['Gas', 'flame'], ['Acqua', 'droplet'],
    ['Internet', 'wifi'], ['Condominio', 'building-2'], ['Manutenzione', 'wrench'], ['Arredamento', 'sofa']]);
  perform public.seed_category(p_account, 'expense', 'Spesa', 'shopping-cart', '#1baf7a', 2, array[
    ['Supermercato', 'shopping-basket'], ['Mercato', 'apple'], ['Prodotti casa', 'spray-can']]);
  perform public.seed_category(p_account, 'expense', 'Auto', 'car', '#eb6834', 3, array[
    ['Benzina', 'fuel'], ['Assicurazione', 'shield-check'], ['Bollo', 'stamp'], ['Manutenzione', 'wrench'],
    ['Pedaggi', 'route'], ['Parcheggio', 'square-parking'], ['Lavaggio', 'droplets']]);
  perform public.seed_category(p_account, 'expense', 'Trasporti', 'train-front', '#4a3aa7', 4, array[
    ['Mezzi pubblici', 'bus'], ['Treni', 'train-front'], ['Taxi', 'car-taxi-front']]);
  perform public.seed_category(p_account, 'expense', 'Abbonamenti', 'repeat', '#e87ba4', 5, array[
    ['Palestra', 'dumbbell'], ['Streaming', 'tv'], ['Musica', 'music'], ['Telefono', 'smartphone'], ['Cloud e software', 'cloud']]);
  perform public.seed_category(p_account, 'expense', 'Ristoranti e uscite', 'utensils', '#eda100', 6, array[
    ['Ristorante', 'utensils'], ['Bar e caffè', 'coffee'], ['Delivery', 'bike'], ['Aperitivi', 'wine']]);
  perform public.seed_category(p_account, 'expense', 'Salute', 'heart-pulse', '#e34948', 7, array[
    ['Farmacia', 'pill'], ['Visite mediche', 'stethoscope'], ['Dentista', 'smile']]);
  perform public.seed_category(p_account, 'expense', 'Sport e benessere', 'dumbbell', '#008300', 8, array[
    ['Attrezzatura', 'dumbbell'], ['Integratori', 'flask-conical'], ['Cura persona', 'scissors']]);
  perform public.seed_category(p_account, 'expense', 'Svago', 'gamepad-2', '#4a3aa7', 9, array[
    ['Eventi e cinema', 'ticket'], ['Hobby', 'palette'], ['Libri', 'book-open'], ['Videogiochi', 'gamepad-2']]);
  perform public.seed_category(p_account, 'expense', 'Shopping', 'shopping-bag', '#e87ba4', 10, array[
    ['Abbigliamento', 'shirt'], ['Elettronica', 'laptop'], ['Casa e oggetti', 'lamp']]);
  perform public.seed_category(p_account, 'expense', 'Viaggi', 'plane', '#2a78d6', 11, array[
    ['Trasporto', 'plane'], ['Alloggio', 'bed-double'], ['Attività', 'map']]);
  perform public.seed_category(p_account, 'expense', 'Regali', 'gift', '#eb6834', 12);
  perform public.seed_category(p_account, 'expense', 'Istruzione', 'graduation-cap', '#1baf7a', 13, array[
    ['Corsi', 'graduation-cap'], ['Materiale', 'notebook-pen']]);
  perform public.seed_category(p_account, 'expense', 'Tasse e commissioni', 'landmark', '#8f8e88', 14, array[
    ['Tasse', 'landmark'], ['Commissioni bancarie', 'credit-card']]);
  perform public.seed_category(p_account, 'expense', 'Trasferimenti', 'arrow-right-left', '#8f8e88', 15);
  perform public.seed_category(p_account, 'expense', 'Altro', 'ellipsis', '#8f8e88', 99);
end;
$$;

create function public.seed_shared_categories(p_account uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.seed_category(p_account, 'income', 'Versamenti', 'arrow-down-to-line', '#1baf7a', 1);
  perform public.seed_category(p_account, 'income', 'Altre entrate', 'sparkles', '#2a78d6', 2);

  perform public.seed_category(p_account, 'expense', 'Casa', 'house', '#2a78d6', 1, array[
    ['Affitto / Mutuo', 'key-round'], ['Luce', 'zap'], ['Gas', 'flame'], ['Acqua', 'droplet'],
    ['Internet', 'wifi'], ['Condominio', 'building-2'], ['Manutenzione', 'wrench'], ['Arredamento', 'sofa']]);
  perform public.seed_category(p_account, 'expense', 'Spesa', 'shopping-cart', '#1baf7a', 2, array[
    ['Supermercato', 'shopping-basket'], ['Mercato', 'apple'], ['Prodotti casa', 'spray-can']]);
  perform public.seed_category(p_account, 'expense', 'Abbonamenti', 'repeat', '#e87ba4', 3, array[
    ['Streaming', 'tv'], ['Musica', 'music']]);
  perform public.seed_category(p_account, 'expense', 'Ristoranti e uscite', 'utensils', '#eda100', 4, array[
    ['Ristorante', 'utensils'], ['Delivery', 'bike'], ['Aperitivi', 'wine']]);
  perform public.seed_category(p_account, 'expense', 'Viaggi', 'plane', '#4a3aa7', 5, array[
    ['Trasporto', 'plane'], ['Alloggio', 'bed-double'], ['Attività', 'map']]);
  perform public.seed_category(p_account, 'expense', 'Animali', 'paw-print', '#eb6834', 6);
  perform public.seed_category(p_account, 'expense', 'Altro', 'ellipsis', '#8f8e88', 99);
end;
$$;

-- Crea (se manca) in ogni conto personale di p_user la categoria
-- "Trasferimenti > Versamento <conto condiviso>" collegata ai Versamenti del condiviso.
create function public.ensure_transfer_categories(p_shared uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_target uuid;
  v_shared_name text;
  v_personal uuid;
  v_parent uuid;
begin
  select name into v_shared_name from public.accounts where id = p_shared and kind = 'shared';
  if v_shared_name is null then return; end if;

  select id into v_target from public.categories
  where account_id = p_shared and kind = 'income' and parent_id is null and archived_at is null
  order by (name = 'Versamenti') desc, sort_order
  limit 1;
  if v_target is null then return; end if;

  for v_personal in
    select a.id from public.accounts a
    join public.account_members m on m.account_id = a.id
    where a.kind = 'personal' and m.user_id = p_user and m.role = 'owner'
  loop
    if exists (select 1 from public.categories c
               join public.categories t on t.id = c.transfer_category_id
               where c.account_id = v_personal and t.account_id = p_shared) then
      continue;
    end if;

    select id into v_parent from public.categories
    where account_id = v_personal and kind = 'expense' and parent_id is null and name = 'Trasferimenti';
    if v_parent is null then
      v_parent := public.seed_category(v_personal, 'expense', 'Trasferimenti', 'arrow-right-left', '#8f8e88', 15);
    end if;

    insert into public.categories (account_id, parent_id, kind, name, icon, color, transfer_category_id, sort_order)
    values (v_personal, v_parent, 'expense', 'Versamento ' || v_shared_name, 'arrow-up-from-line', '#8f8e88', v_target, 1);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: nuovo utente -> profilo + conto personale
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  v_account uuid;
begin
  insert into public.profiles (id, display_name) values (new.id, v_name);

  insert into public.accounts (name, kind, icon, created_by)
  values (v_name, 'personal', 'user-round', new.id)
  returning id into v_account;

  -- created_by è già valorizzato: on_account_created inserisce il proprietario.
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Trigger: nuovo conto -> proprietario + categorie predefinite
-- -----------------------------------------------------------------------------
create function public.on_account_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.account_members (account_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;

  if new.kind = 'personal' then
    perform public.seed_personal_categories(new.id);
  else
    perform public.seed_shared_categories(new.id);
    if new.created_by is not null then
      perform public.ensure_transfer_categories(new.id, new.created_by);
    end if;
  end if;
  return new;
end;
$$;

create function public.guard_account()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- Dal client il creatore è sempre l'utente autenticato.
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    new.kind := old.kind;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger accounts_guard
  before insert or update on public.accounts
  for each row execute function public.guard_account();

create trigger accounts_after_insert
  after insert on public.accounts
  for each row execute function public.on_account_created();

-- -----------------------------------------------------------------------------
-- Trigger: membri
-- -----------------------------------------------------------------------------
create function public.on_member_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role >= 'editor' then
    perform public.ensure_transfer_categories(new.account_id, new.user_id);
  end if;
  return new;
end;
$$;

create trigger account_members_after_upsert
  after insert or update of role on public.account_members
  for each row execute function public.on_member_changed();

create function public.protect_last_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    -- Se l'intero conto è in eliminazione, il cascade deve poter procedere.
    if not exists (select 1 from public.accounts where id = old.account_id) then
      return coalesce(new, old);
    end if;
    if not exists (select 1 from public.account_members
                   where account_id = old.account_id and role = 'owner' and user_id <> old.user_id) then
      raise exception 'Il conto deve avere almeno un proprietario' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger account_members_protect_owner
  before update or delete on public.account_members
  for each row execute function public.protect_last_owner();

-- -----------------------------------------------------------------------------
-- Trigger: validazione categorie
-- -----------------------------------------------------------------------------
create function public.validate_category()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_parent public.categories;
  v_target public.categories;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Una categoria non può essere padre di se stessa' using errcode = 'P0001';
    end if;
    select * into v_parent from public.categories where id = new.parent_id;
    if v_parent.account_id <> new.account_id or v_parent.kind <> new.kind then
      raise exception 'La categoria padre deve appartenere allo stesso conto e tipo' using errcode = 'P0001';
    end if;
    if v_parent.parent_id is not null then
      raise exception 'Sono ammessi solo due livelli (categoria > sottocategoria)' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from public.categories where parent_id = new.id) then
      raise exception 'Una categoria con sottocategorie non può diventare sottocategoria' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.kind <> old.kind then
    raise exception 'Il tipo di una categoria non si può cambiare' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.account_id <> old.account_id then
    raise exception 'Una categoria non si può spostare su un altro conto' using errcode = 'P0001';
  end if;

  if new.transfer_category_id is not null
     and (tg_op = 'INSERT' or new.transfer_category_id is distinct from old.transfer_category_id) then
    if new.kind <> 'expense' then
      raise exception 'Solo le categorie di uscita possono essere trasferimenti' using errcode = 'P0001';
    end if;
    select * into v_target from public.categories where id = new.transfer_category_id;
    if v_target.kind <> 'income' or v_target.account_id = new.account_id then
      raise exception 'Il trasferimento deve puntare a una categoria di entrata di un altro conto' using errcode = 'P0001';
    end if;
    if auth.uid() is not null and not public.has_account_role(v_target.account_id, 'editor') then
      raise exception 'Serve il permesso di modifica sul conto di destinazione' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_validate
  before insert or update on public.categories
  for each row execute function public.validate_category();

-- -----------------------------------------------------------------------------
-- Trigger: validazione movimenti + trasferimenti speculari
-- -----------------------------------------------------------------------------
create function public.validate_transaction()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.categories where id = new.category_id and account_id = new.account_id) then
    raise exception 'La categoria non appartiene al conto' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and new.recurring_id is null and new.transfer_source_id is null then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger transactions_validate
  before insert or update on public.transactions
  for each row execute function public.validate_transaction();

create function public.sync_transfer()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_target public.categories;
  v_author text;
begin
  select t.* into v_target
  from public.categories c
  join public.categories t on t.id = c.transfer_category_id
  where c.id = new.category_id;

  if new.status = 'confirmed' and v_target.id is not null then
    select display_name into v_author from public.profiles where id = new.created_by;
    insert into public.transactions
      (account_id, category_id, amount, date, description, status, created_by, transfer_source_id)
    values
      (v_target.account_id, v_target.id, new.amount, new.date,
       'Versamento' || coalesce(' da ' || v_author, '') || coalesce(' · ' || nullif(trim(new.description), ''), ''),
       'confirmed', new.created_by, new.id)
    on conflict (transfer_source_id) do update set
      account_id  = excluded.account_id,
      category_id = excluded.category_id,
      amount      = excluded.amount,
      date        = excluded.date,
      description = excluded.description;
  else
    delete from public.transactions where transfer_source_id = new.id;
  end if;
  return null;
end;
$$;

create trigger transactions_sync_transfer
  after insert or update on public.transactions
  for each row when (new.transfer_source_id is null)
  execute function public.sync_transfer();

-- -----------------------------------------------------------------------------
-- Ricorrenti
-- -----------------------------------------------------------------------------
create function public.recurring_occurrence(
  p_start date, p_freq public.recurrence_frequency, p_interval integer, p_n integer
) returns date
language sql immutable
as $$
  select (p_start + case p_freq
    when 'weekly'  then make_interval(weeks  => p_n * p_interval)
    when 'monthly' then make_interval(months => p_n * p_interval)
    when 'yearly'  then make_interval(years  => p_n * p_interval)
  end)::date
$$;

create function public.validate_recurring()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.categories where id = new.category_id and account_id = new.account_id) then
    raise exception 'La categoria non appartiene al conto' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.occurrences := 0;
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif new.start_date <> old.start_date or new.frequency <> old.frequency or new.interval_count <> old.interval_count then
    -- Cambiata la pianificazione: si riparte dalla nuova data di inizio,
    -- saltando le occorrenze già passate rispetto a quelle generate.
    new.occurrences := 0;
    while public.recurring_occurrence(new.start_date, new.frequency, new.interval_count, new.occurrences) <= old.next_date - 1
          and new.occurrences < 10000 loop
      new.occurrences := new.occurrences + 1;
    end loop;
  end if;
  new.next_date := public.recurring_occurrence(new.start_date, new.frequency, new.interval_count, new.occurrences);
  return new;
end;
$$;

create trigger recurring_validate
  before insert or update on public.recurring_transactions
  for each row execute function public.validate_recurring();

-- Genera i movimenti delle ricorrenti scadute (fino a p_until) per i conti
-- su cui l'utente ha permesso di modifica. Idempotente e sicura in concorrenza.
create function public.generate_recurring(p_until date default current_date)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  r public.recurring_transactions;
  v_count integer := 0;
  v_inserted integer;
begin
  for r in
    select * from public.recurring_transactions
    where active and next_date <= p_until
      and public.has_account_role(account_id, 'editor')
    for update skip locked
  loop
    while r.next_date <= p_until and (r.end_date is null or r.next_date <= r.end_date) loop
      insert into public.transactions (account_id, category_id, amount, date, description, status, recurring_id, created_by)
      values (r.account_id, r.category_id, r.amount, r.next_date, r.description,
              case when r.auto_confirm then 'confirmed' else 'pending' end::public.transaction_status,
              r.id, r.created_by)
      on conflict (recurring_id, date) where recurring_id is not null do nothing;
      get diagnostics v_inserted = row_count;
      v_count := v_count + v_inserted;

      r.occurrences := r.occurrences + 1;
      r.next_date := public.recurring_occurrence(r.start_date, r.frequency, r.interval_count, r.occurrences);
    end loop;

    update public.recurring_transactions
    set occurrences = r.occurrences,
        active = r.end_date is null or r.next_date <= r.end_date
    where id = r.id;
  end loop;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Gestione membri (RPC)
-- -----------------------------------------------------------------------------
create function public.add_account_member(p_account uuid, p_email text, p_role public.member_role)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.has_account_role(p_account, 'owner') then
    raise exception 'Solo il proprietario può gestire i membri' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Nessun utente registrato con questa email' using errcode = 'P0002';
  end if;
  insert into public.account_members (account_id, user_id, role)
  values (p_account, v_user, p_role)
  on conflict (account_id, user_id) do update set role = excluded.role;
  return v_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- Viste e report (security invoker: rispettano la RLS)
-- -----------------------------------------------------------------------------
create view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.opening_balance + coalesce(sum(case when c.kind = 'income' then t.amount else -t.amount end)
                               filter (where t.status = 'confirmed'), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
left join public.categories c on c.id = t.category_id
group by a.id;

create function public.finance_monthly_totals(p_account uuid, p_from date, p_to date)
returns table (month date, income numeric, expense numeric)
language sql stable security invoker set search_path = ''
as $$
  select
    date_trunc('month', t.date)::date as month,
    coalesce(sum(t.amount) filter (where c.kind = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where c.kind = 'expense'), 0) as expense
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where t.account_id = p_account and t.status = 'confirmed'
    and t.date between p_from and p_to
  group by 1
  order by 1
$$;

create function public.finance_category_totals(p_account uuid, p_from date, p_to date)
returns table (category_id uuid, total numeric, count bigint)
language sql stable security invoker set search_path = ''
as $$
  select t.category_id, sum(t.amount), count(*)
  from public.transactions t
  where t.account_id = p_account and t.status = 'confirmed'
    and t.date between p_from and p_to
  group by t.category_id
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security (attivata subito dopo ogni create table)
-- -----------------------------------------------------------------------------
-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_account_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- accounts
create policy accounts_select on public.accounts for select to authenticated
  using (public.has_account_role(id, 'viewer'));
create policy accounts_insert on public.accounts for insert to authenticated
  with check (true);
create policy accounts_update on public.accounts for update to authenticated
  using (public.has_account_role(id, 'owner')) with check (public.has_account_role(id, 'owner'));
create policy accounts_delete on public.accounts for delete to authenticated
  using (public.has_account_role(id, 'owner'));

-- account_members
create policy members_select on public.account_members for select to authenticated
  using (public.has_account_role(account_id, 'viewer'));
create policy members_update on public.account_members for update to authenticated
  using (public.has_account_role(account_id, 'owner')) with check (public.has_account_role(account_id, 'owner'));
create policy members_delete on public.account_members for delete to authenticated
  using (public.has_account_role(account_id, 'owner') or user_id = auth.uid());
-- Inserimenti solo via add_account_member() / trigger.

-- categories
create policy categories_select on public.categories for select to authenticated
  using (public.has_account_role(account_id, 'viewer'));
create policy categories_insert on public.categories for insert to authenticated
  with check (public.has_account_role(account_id, 'editor'));
create policy categories_update on public.categories for update to authenticated
  using (public.has_account_role(account_id, 'editor')) with check (public.has_account_role(account_id, 'editor'));
create policy categories_delete on public.categories for delete to authenticated
  using (public.has_account_role(account_id, 'editor'));

-- transactions (i movimenti speculari si gestiscono solo dal movimento sorgente)
create policy transactions_select on public.transactions for select to authenticated
  using (public.has_account_role(account_id, 'viewer'));
create policy transactions_insert on public.transactions for insert to authenticated
  with check (public.has_account_role(account_id, 'editor') and transfer_source_id is null);
create policy transactions_update on public.transactions for update to authenticated
  using (public.has_account_role(account_id, 'editor') and transfer_source_id is null)
  with check (public.has_account_role(account_id, 'editor') and transfer_source_id is null);
create policy transactions_delete on public.transactions for delete to authenticated
  using (public.has_account_role(account_id, 'editor') and transfer_source_id is null);

-- recurring
create policy recurring_select on public.recurring_transactions for select to authenticated
  using (public.has_account_role(account_id, 'viewer'));
create policy recurring_insert on public.recurring_transactions for insert to authenticated
  with check (public.has_account_role(account_id, 'editor'));
create policy recurring_update on public.recurring_transactions for update to authenticated
  using (public.has_account_role(account_id, 'editor')) with check (public.has_account_role(account_id, 'editor'));
create policy recurring_delete on public.recurring_transactions for delete to authenticated
  using (public.has_account_role(account_id, 'editor'));

-- -----------------------------------------------------------------------------
-- Grants: le funzioni interne non devono essere chiamabili dal client
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
revoke execute on function public.seed_category(uuid, public.category_kind, text, text, text, integer, text[][]) from authenticated;
revoke execute on function public.seed_personal_categories(uuid) from authenticated;
revoke execute on function public.seed_shared_categories(uuid) from authenticated;
revoke execute on function public.ensure_transfer_categories(uuid, uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.generate_recurring(date) to authenticated;
grant execute on function public.recurring_occurrence(date, public.recurrence_frequency, integer, integer) to authenticated;
grant execute on function public.add_account_member(uuid, text, public.member_role) to authenticated;
grant execute on function public.finance_monthly_totals(uuid, date, date) to authenticated;
grant execute on function public.finance_category_totals(uuid, date, date) to authenticated;
grant execute on function public.account_role(uuid) to authenticated;
grant execute on function public.has_account_role(uuid, public.member_role) to authenticated;
grant execute on function public.shares_account_with(uuid) to authenticated;

-- Realtime: aggiornamenti live per i dati condivisi
alter publication supabase_realtime add table public.transactions, public.categories, public.recurring_transactions;
