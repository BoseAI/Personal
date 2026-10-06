export type Muscle =
  | 'chest'
  | 'lats'
  | 'upper_back'
  | 'traps'
  | 'lower_back'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'abductors'
  | 'calves'
  | 'cardio'

export type MuscleGroup = 'Petto' | 'Schiena' | 'Spalle' | 'Braccia' | 'Core' | 'Gambe' | 'Cardio'

export const MUSCLES: Record<Muscle, { label: string; group: MuscleGroup }> = {
  chest: { label: 'Petto', group: 'Petto' },
  lats: { label: 'Dorsali', group: 'Schiena' },
  upper_back: { label: 'Romboidi / alta schiena', group: 'Schiena' },
  traps: { label: 'Trapezio', group: 'Schiena' },
  lower_back: { label: 'Lombari', group: 'Schiena' },
  front_delts: { label: 'Deltoide anteriore', group: 'Spalle' },
  side_delts: { label: 'Deltoide laterale', group: 'Spalle' },
  rear_delts: { label: 'Deltoide posteriore', group: 'Spalle' },
  biceps: { label: 'Bicipiti', group: 'Braccia' },
  triceps: { label: 'Tricipiti', group: 'Braccia' },
  forearms: { label: 'Avambracci', group: 'Braccia' },
  abs: { label: 'Addominali', group: 'Core' },
  obliques: { label: 'Obliqui', group: 'Core' },
  glutes: { label: 'Glutei', group: 'Gambe' },
  quads: { label: 'Quadricipiti', group: 'Gambe' },
  hamstrings: { label: 'Femorali', group: 'Gambe' },
  adductors: { label: 'Adduttori', group: 'Gambe' },
  abductors: { label: 'Abduttori', group: 'Gambe' },
  calves: { label: 'Polpacci', group: 'Gambe' },
  cardio: { label: 'Cardio', group: 'Cardio' },
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['Petto', 'Schiena', 'Spalle', 'Braccia', 'Core', 'Gambe', 'Cardio']

/** Colori per gruppo muscolare (palette categoriale validata, ordine fisso). */
export const GROUP_COLORS: Record<MuscleGroup, string> = {
  Petto: '#3987e5',
  Schiena: '#d95926',
  Spalle: '#199e70',
  Braccia: '#c98500',
  Core: '#d55181',
  Gambe: '#9085e9',
  Cardio: '#e66767',
}
