// Comprehensive muscle group mapping from Vue anatomy to your database
export const MUSCLE_GROUPS = {
  // Upper Body - Front
  chest: 'Chest',
  frontDelts: 'Shoulders',
  sideDelts: 'Shoulders',
  biceps: 'Arms',
  forearms: 'Arms',
  abs: 'Core',
  obliques: 'Core',
  
  // Upper Body - Back
  traps: 'Back',
  upperTraps: 'Back',
  midTraps: 'Back', 
  lowerTraps: 'Back',
  lats: 'Back',
  rhomboids: 'Back',
  rearDelts: 'Shoulders', 
  rotatorCuffs: 'Shoulders',
  lowerBack: 'Back',
  triceps: 'Arms',
  
  // Lower Body - Front
  quads: 'Legs',
  adductors: 'Legs',
  
  // Lower Body - Back
  glutes: 'Glutes',
  hamstrings: 'Legs',
  calves: 'Legs',
  abductors: 'Legs',
  
  // Additional
  neck: 'Back',
  shins: 'Legs'
} as const;

export type MuscleId = keyof typeof MUSCLE_GROUPS;
export type TrainingLevel = 'untrained' | 'undertrained' | 'optimal' | 'overtrained';
export type ViewMode = 'week' | 'session' | 'month';
export type Gender = 'male' | 'female';
export type AnatomySide = 'front' | 'back';

// Reverse mapping for database queries
export const DATABASE_TO_MUSCLE_MAP: Record<string, MuscleId[]> = {
  'Chest': ['chest'],
  'Arms': ['biceps', 'triceps', 'forearms'],
  'Legs': ['quads', 'hamstrings', 'calves', 'adductors', 'abductors', 'shins'],
  'Back': ['traps', 'upperTraps', 'midTraps', 'lowerTraps', 'lats', 'rhomboids', 'lowerBack', 'neck'],
  'Core': ['abs', 'obliques'],
  'Shoulders': ['frontDelts', 'sideDelts', 'rearDelts', 'rotatorCuffs'],
  'Glutes': ['glutes']
};
