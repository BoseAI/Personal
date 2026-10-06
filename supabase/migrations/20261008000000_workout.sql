-- =============================================================================
-- BoseIA — Allenamento: esercizi personalizzati, schede, sessioni (forza e cardio)
-- =============================================================================

-- La sezione Alimentazione arriva subito dopo: la registriamo già tra i moduli.
alter table public.user_module_access drop constraint user_module_access_module_check;
alter table public.user_module_access add constraint user_module_access_module_check
  check (module in ('finance', 'shopping', 'workout', 'nutrition'));

-- -----------------------------------------------------------------------------
-- Esercizi personalizzati (il catalogo base è nell'app)
-- -----------------------------------------------------------------------------
create table public.custom_exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  primary_muscles   text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment  text,
  created_at timestamptz not null default now()
);
alter table public.custom_exercises enable row level security;
create index custom_exercises_user_idx on public.custom_exercises (user_id);

-- -----------------------------------------------------------------------------
-- Schede: la struttura (blocchi -> esercizi) è un documento JSON modificato in blocco
-- -----------------------------------------------------------------------------
create table public.workout_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  notes       text,
  color       text not null default '#fb923c',
  blocks      jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  sort_order  integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.workout_plans enable row level security;
create index workout_plans_user_idx on public.workout_plans (user_id);

-- -----------------------------------------------------------------------------
-- Sessioni: forza (con serie) e cardio (corsa, nuoto, altro)
-- -----------------------------------------------------------------------------
create table public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('strength', 'run', 'swim', 'other')),
  plan_id      uuid references public.workout_plans (id) on delete set null,
  name         text not null,
  started_at   timestamptz not null default now(),
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  distance_m   numeric(10, 1) check (distance_m is null or distance_m >= 0),
  avg_hr       integer check (avg_hr is null or avg_hr between 30 and 250),
  rpe          integer check (rpe is null or rpe between 1 and 10),
  notes        text,
  created_at   timestamptz not null default now()
);
alter table public.workout_sessions enable row level security;
create index workout_sessions_user_date_idx on public.workout_sessions (user_id, started_at desc);

create table public.workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exercise_key  text not null,
  exercise_name text not null,
  block_index   integer not null default 0,
  set_index     integer not null default 0,
  weight_kg     numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  reps          integer check (reps is null or reps >= 0),
  duration_sec  integer check (duration_sec is null or duration_sec >= 0),
  created_at    timestamptz not null default now()
);
alter table public.workout_sets enable row level security;
create index workout_sets_session_idx on public.workout_sets (session_id);
create index workout_sets_exercise_idx on public.workout_sets (user_id, exercise_key, created_at desc);

-- Le serie appartengono sempre al proprietario della sessione.
create function public.guard_workout_set()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  select user_id into new.user_id from public.workout_sessions where id = new.session_id;
  return new;
end;
$$;

create trigger workout_sets_guard
  before insert or update on public.workout_sets
  for each row execute function public.guard_workout_set();

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger workout_plans_touch
  before update on public.workout_plans
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: tutto personale
-- -----------------------------------------------------------------------------
create policy custom_exercises_own on public.custom_exercises for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_plans_own on public.workout_plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_sessions_own on public.workout_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_sets_own on public.workout_sets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke execute on function public.guard_workout_set() from public, anon, authenticated;
