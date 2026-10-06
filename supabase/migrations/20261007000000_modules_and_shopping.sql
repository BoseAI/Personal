-- =============================================================================
-- BoseIA — amministratore, sezioni abilitate per utente, liste della spesa
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Amministratore
-- -----------------------------------------------------------------------------
alter table public.profiles add column is_admin boolean not null default false;

-- Il primo utente registrato diventa amministratore.
update public.profiles set is_admin = true
where id = (select id from public.profiles order by created_at, id limit 1);

-- Il client può modificare solo il proprio nome, non il flag amministratore.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- -----------------------------------------------------------------------------
-- Sezioni abilitate per utente (assenza di riga = abilitata)
-- -----------------------------------------------------------------------------
create table public.user_module_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module  text not null check (module in ('finance', 'shopping', 'workout')),
  enabled boolean not null default true,
  primary key (user_id, module)
);
alter table public.user_module_access enable row level security;

create policy module_access_select on public.user_module_access for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy module_access_insert on public.user_module_access for insert to authenticated
  with check (public.is_admin());
create policy module_access_update on public.user_module_access for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy module_access_delete on public.user_module_access for delete to authenticated
  using (public.is_admin());

-- Elenco utenti per il pannello amministratore (con email).
create function public.admin_list_users()
returns table (id uuid, display_name text, email text, is_admin boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Riservato all''amministratore' using errcode = '42501';
  end if;
  return query
    select p.id, p.display_name, u.email::text, p.is_admin, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at;
end;
$$;

create function public.set_user_admin(p_user uuid, p_admin boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Riservato all''amministratore' using errcode = '42501';
  end if;
  if not p_admin and not exists (select 1 from public.profiles where is_admin and id <> p_user) then
    raise exception 'Deve restare almeno un amministratore' using errcode = 'P0001';
  end if;
  update public.profiles set is_admin = p_admin where id = p_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- Liste della spesa
-- -----------------------------------------------------------------------------
create type public.checked_behavior as enum ('move_bottom', 'keep', 'delete');

create table public.shopping_lists (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) > 0),
  icon             text not null default 'shopping-basket',
  color            text not null default '#1baf7a',
  checked_behavior public.checked_behavior not null default 'move_bottom',
  sort_order       integer not null default 0,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
alter table public.shopping_lists enable row level security;

create table public.shopping_list_members (
  list_id    uuid not null references public.shopping_lists (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
alter table public.shopping_list_members enable row level security;
create index shopping_list_members_user_idx on public.shopping_list_members (user_id);

create table public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.shopping_lists (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  quantity   integer not null default 1 check (quantity between 1 and 9999),
  checked    boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shopping_items enable row level security;
create index shopping_items_list_idx on public.shopping_items (list_id, checked, created_at desc);

-- -----------------------------------------------------------------------------
-- Helper permessi liste
-- -----------------------------------------------------------------------------
create function public.list_role(p_list uuid)
returns public.member_role
language sql stable security definer set search_path = ''
as $$
  select role from public.shopping_list_members
  where list_id = p_list and user_id = auth.uid()
$$;

create function public.has_list_role(p_list uuid, p_min public.member_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.list_role(p_list) >= p_min, false)
$$;

-- Ora "condividere" vale sia per i conti sia per le liste (serve a vedere i nomi).
create or replace function public.shares_account_with(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.account_members a
    join public.account_members b on b.account_id = a.account_id
    where a.user_id = auth.uid() and b.user_id = p_user
  ) or exists (
    select 1 from public.shopping_list_members a
    join public.shopping_list_members b on b.list_id = a.list_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_account_with(id) or public.is_admin());

-- -----------------------------------------------------------------------------
-- Trigger liste
-- -----------------------------------------------------------------------------
create function public.guard_shopping_list()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger shopping_lists_guard
  before insert or update on public.shopping_lists
  for each row execute function public.guard_shopping_list();

create function public.on_shopping_list_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.shopping_list_members (list_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger shopping_lists_after_insert
  after insert on public.shopping_lists
  for each row execute function public.on_shopping_list_created();

create function public.protect_last_list_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (select 1 from public.shopping_lists where id = old.list_id) then
      return coalesce(new, old);
    end if;
    if not exists (select 1 from public.shopping_list_members
                   where list_id = old.list_id and role = 'owner' and user_id <> old.user_id) then
      raise exception 'La lista deve avere almeno un proprietario' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger shopping_list_members_protect_owner
  before update or delete on public.shopping_list_members
  for each row execute function public.protect_last_list_owner();

create function public.guard_shopping_item()
returns trigger
language plpgsql
as $$
begin
  new.name := trim(new.name);
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.updated_at := now();
    new.created_by := old.created_by;
    new.list_id := old.list_id;
  end if;
  if new.checked and (tg_op = 'INSERT' or not old.checked) then
    new.checked_at := now();
    new.checked_by := auth.uid();
  elsif not new.checked then
    new.checked_at := null;
    new.checked_by := null;
  end if;
  return new;
end;
$$;

create trigger shopping_items_guard
  before insert or update on public.shopping_items
  for each row execute function public.guard_shopping_item();

-- -----------------------------------------------------------------------------
-- Liste predefinite per ogni utente (nuovi ed esistenti)
-- -----------------------------------------------------------------------------
create function public.seed_shopping_lists(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.shopping_lists (name, icon, color, checked_behavior, sort_order, created_by)
  values
    ('Alimentari', 'shopping-basket', '#1baf7a', 'move_bottom', 1, p_user),
    ('Materiale casa', 'spray-can', '#2a78d6', 'move_bottom', 2, p_user);
end;
$$;

create function public.on_profile_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Il primo utente in assoluto diventa amministratore.
  if not exists (select 1 from public.profiles where is_admin and id <> new.id) then
    update public.profiles set is_admin = true where id = new.id;
  end if;
  perform public.seed_shopping_lists(new.id);
  return new;
end;
$$;

create trigger profiles_after_insert
  after insert on public.profiles
  for each row execute function public.on_profile_created();

do $$ begin perform public.seed_shopping_lists(id) from public.profiles; end $$;

-- -----------------------------------------------------------------------------
-- Condivisione liste (RPC)
-- -----------------------------------------------------------------------------
create function public.add_list_member(p_list uuid, p_email text, p_role public.member_role)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.has_list_role(p_list, 'owner') then
    raise exception 'Solo il proprietario può condividere la lista' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Nessun utente registrato con questa email' using errcode = 'P0002';
  end if;
  insert into public.shopping_list_members (list_id, user_id, role)
  values (p_list, v_user, p_role)
  on conflict (list_id, user_id) do update set role = excluded.role;
  return v_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS liste
-- -----------------------------------------------------------------------------
create policy shopping_lists_select on public.shopping_lists for select to authenticated
  using (public.has_list_role(id, 'viewer'));
create policy shopping_lists_insert on public.shopping_lists for insert to authenticated
  with check (true);
create policy shopping_lists_update on public.shopping_lists for update to authenticated
  using (public.has_list_role(id, 'owner')) with check (public.has_list_role(id, 'owner'));
create policy shopping_lists_delete on public.shopping_lists for delete to authenticated
  using (public.has_list_role(id, 'owner'));

create policy shopping_members_select on public.shopping_list_members for select to authenticated
  using (public.has_list_role(list_id, 'viewer'));
create policy shopping_members_update on public.shopping_list_members for update to authenticated
  using (public.has_list_role(list_id, 'owner')) with check (public.has_list_role(list_id, 'owner'));
create policy shopping_members_delete on public.shopping_list_members for delete to authenticated
  using (public.has_list_role(list_id, 'owner') or user_id = auth.uid());

create policy shopping_items_select on public.shopping_items for select to authenticated
  using (public.has_list_role(list_id, 'viewer'));
create policy shopping_items_insert on public.shopping_items for insert to authenticated
  with check (public.has_list_role(list_id, 'editor'));
create policy shopping_items_update on public.shopping_items for update to authenticated
  using (public.has_list_role(list_id, 'editor')) with check (public.has_list_role(list_id, 'editor'));
create policy shopping_items_delete on public.shopping_items for delete to authenticated
  using (public.has_list_role(list_id, 'editor'));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function public.seed_shopping_lists(uuid) from public, anon, authenticated;
revoke execute on function public.on_profile_created() from public, anon, authenticated;
revoke execute on function public.on_shopping_list_created() from public, anon, authenticated;
revoke execute on function public.protect_last_list_owner() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.set_user_admin(uuid, boolean) from public, anon;
revoke execute on function public.list_role(uuid) from public, anon;
revoke execute on function public.has_list_role(uuid, public.member_role) from public, anon;
revoke execute on function public.add_list_member(uuid, text, public.member_role) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.set_user_admin(uuid, boolean) to authenticated;
grant execute on function public.list_role(uuid) to authenticated;
grant execute on function public.has_list_role(uuid, public.member_role) to authenticated;
grant execute on function public.add_list_member(uuid, text, public.member_role) to authenticated;

alter publication supabase_realtime add table public.shopping_lists, public.shopping_items, public.shopping_list_members;
