-- =============================================================================
-- BoseIA — Alimentazione: profilo e obiettivi, peso, cibi, diario pasti, acqua
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profilo: dati per calcolare gli obiettivi (gli override manuali vincono)
-- -----------------------------------------------------------------------------
create table public.nutrition_profiles (
  user_id          uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  sex              text check (sex in ('m', 'f')),
  birth_date       date,
  height_cm        numeric(5, 1) check (height_cm is null or height_cm between 100 and 250),
  activity         text not null default 'light' check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal             text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  target_weight_kg numeric(5, 2),
  kcal_override    integer check (kcal_override is null or kcal_override between 800 and 6000),
  protein_override integer check (protein_override is null or protein_override between 0 and 500),
  carbs_override   integer check (carbs_override is null or carbs_override between 0 and 1000),
  fat_override     integer check (fat_override is null or fat_override between 0 and 400),
  water_override   integer check (water_override is null or water_override between 500 and 8000),
  updated_at       timestamptz not null default now()
);
alter table public.nutrition_profiles enable row level security;

-- -----------------------------------------------------------------------------
-- Pesate
-- -----------------------------------------------------------------------------
create table public.body_weights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date       date not null default current_date,
  weight_kg  numeric(5, 2) not null check (weight_kg between 20 and 400),
  body_fat   numeric(4, 1) check (body_fat is null or body_fat between 2 and 70),
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.body_weights enable row level security;

-- -----------------------------------------------------------------------------
-- Cibi propri o salvati da Open Food Facts (valori per 100 g)
-- -----------------------------------------------------------------------------
create table public.foods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  brand       text,
  barcode     text,
  kcal        numeric(6, 1) not null check (kcal >= 0),
  protein     numeric(5, 1) not null default 0 check (protein >= 0),
  carbs       numeric(5, 1) not null default 0 check (carbs >= 0),
  fat         numeric(5, 1) not null default 0 check (fat >= 0),
  fiber       numeric(5, 1) check (fiber is null or fiber >= 0),
  portion_g   numeric(6, 1) check (portion_g is null or portion_g > 0),
  portion_name text,
  source      text not null default 'custom' check (source in ('custom', 'off')),
  created_at  timestamptz not null default now(),
  -- I barcode NULL non confliggono tra loro: un vincolo pieno serve all'upsert.
  unique (user_id, barcode)
);
alter table public.foods enable row level security;
create index foods_user_idx on public.foods (user_id);

-- -----------------------------------------------------------------------------
-- Diario: ogni voce salva i valori calcolati (restano anche se il cibo cambia)
-- -----------------------------------------------------------------------------
create table public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date       date not null default current_date,
  meal       text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_key   text not null,
  food_name  text not null,
  grams      numeric(6, 1) not null check (grams > 0),
  kcal       numeric(7, 1) not null default 0,
  protein    numeric(6, 1) not null default 0,
  carbs      numeric(6, 1) not null default 0,
  fat        numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.food_logs enable row level security;
create index food_logs_user_date_idx on public.food_logs (user_id, date);

create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date       date not null default current_date,
  ml         integer not null check (ml between -2000 and 2000 and ml <> 0),
  created_at timestamptz not null default now()
);
alter table public.water_logs enable row level security;
create index water_logs_user_date_idx on public.water_logs (user_id, date);

-- -----------------------------------------------------------------------------
-- RLS: tutto personale
-- -----------------------------------------------------------------------------
create policy nutrition_profiles_own on public.nutrition_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_weights_own on public.body_weights for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy foods_own on public.foods for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy food_logs_own on public.food_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy water_logs_own on public.water_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
