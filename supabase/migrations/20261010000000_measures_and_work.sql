-- =============================================================================
-- BoseIA — Unità di misura degli esercizi (tempo, distanza) e sezione Lavoro
-- =============================================================================

-- Serie a distanza (es. farmer walk, sled push, vogatore): metri percorsi.
alter table public.workout_sets
  add column distance_m numeric(8, 1) check (distance_m is null or distance_m >= 0);

-- Esercizi personalizzati: come si misurano.
alter table public.custom_exercises
  add column measure text not null default 'reps' check (measure in ('reps', 'time', 'distance', 'cardio'));

-- Nuova sezione abilitabile per utente.
alter table public.user_module_access drop constraint user_module_access_module_check;
alter table public.user_module_access add constraint user_module_access_module_check
  check (module in ('finance', 'shopping', 'workout', 'nutrition', 'work'));
