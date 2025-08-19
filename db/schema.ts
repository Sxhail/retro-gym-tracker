import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  muscle_group: text('muscle_group'),
  is_custom: integer('is_custom').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const workouts = sqliteTable('workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  date: text('date').notNull(), // ISO timestamp
  duration: integer('duration').notNull(), // seconds
  program_id: integer('program_id').references(() => user_programs.id, { onDelete: 'set null' }),
  program_day_id: integer('program_day_id').references(() => program_days.id, { onDelete: 'set null' }),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const workout_exercises = sqliteTable('workout_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workout_id: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exercise_id: integer('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  distance: real('distance'), // optional number
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const sets = sqliteTable('sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workout_exercise_id: integer('workout_exercise_id').notNull().references(() => workout_exercises.id, { onDelete: 'cascade' }),
  set_index: integer('set_index').notNull(), // sequence number
  weight: real('weight').notNull(),
  reps: integer('reps').notNull(),
  notes: text('notes'), // optional
  rest_duration: integer('rest_duration').notNull(), // seconds
  completed: integer('completed').notNull().default(1), // boolean flag 0/1
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Workout Templates
export const workout_templates = sqliteTable('workout_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // e.g., 'strength', 'cardio', 'flexibility'
  difficulty: text('difficulty'), // 'beginner', 'intermediate', 'advanced'
  estimated_duration: integer('estimated_duration'), // minutes
  is_favorite: integer('is_favorite').default(0), // boolean flag 0/1
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const template_exercises = sqliteTable('template_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  template_id: integer('template_id').notNull().references(() => workout_templates.id, { onDelete: 'cascade' }),
  exercise_id: integer('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  exercise_order: integer('exercise_order').notNull(), // sequence number
  distance: real('distance'), // optional for cardio exercises
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const template_sets = sqliteTable('template_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  template_exercise_id: integer('template_exercise_id').notNull().references(() => template_exercises.id, { onDelete: 'cascade' }),
  set_index: integer('set_index').notNull(), // sequence number
  target_weight: real('target_weight'), // optional target weight
  target_reps: integer('target_reps').notNull(),
  target_rest: integer('target_rest').notNull(), // seconds
  notes: text('notes'), // optional template notes
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Relations
export const exercisesRelations = relations(exercises, ({ many }) => ({
  workout_exercises: many(workout_exercises),
}));

export const workoutsRelations = relations(workouts, ({ many }) => ({
  workout_exercises: many(workout_exercises),
}));

export const workoutExercisesRelations = relations(workout_exercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [workout_exercises.workout_id],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workout_exercises.exercise_id],
    references: [exercises.id],
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  workout_exercise: one(workout_exercises, {
    fields: [sets.workout_exercise_id],
    references: [workout_exercises.id],
  }),
}));

// Template Relations
export const workoutTemplatesRelations = relations(workout_templates, ({ many }) => ({
  template_exercises: many(template_exercises),
}));

export const templateExercisesRelations = relations(template_exercises, ({ one, many }) => ({
  template: one(workout_templates, {
    fields: [template_exercises.template_id],
    references: [workout_templates.id],
  }),
  exercise: one(exercises, {
    fields: [template_exercises.exercise_id],
    references: [exercises.id],
  }),
  template_sets: many(template_sets),
}));

export const templateSetsRelations = relations(template_sets, ({ one }) => ({
  template_exercise: one(template_exercises, {
    fields: [template_sets.template_exercise_id],
    references: [template_exercises.id],
  }),
}));

// TypeScript types
export type Exercise = typeof exercises.$inferSelect; 
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workout_exercises.$inferSelect;
export type Set = typeof sets.$inferSelect;
export type WorkoutTemplate = typeof workout_templates.$inferSelect;
export type TemplateExercise = typeof template_exercises.$inferSelect;
export type TemplateSet = typeof template_sets.$inferSelect;

// Background Session Persistence Tables
export const active_workout_sessions = sqliteTable('active_workout_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_id: text('session_id').notNull().unique(), // UUID for session tracking
  name: text('name').notNull(),
  start_time: text('start_time').notNull(), // ISO timestamp
  elapsed_time: integer('elapsed_time').notNull().default(0), // seconds
  is_paused: integer('is_paused').notNull().default(0), // boolean 0/1
  current_exercise_index: integer('current_exercise_index').default(0),
  session_data: text('session_data').notNull(), // JSON string of full session state
  last_updated: text('last_updated').notNull(), // ISO timestamp for sync
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const active_session_timers = sqliteTable('active_session_timers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_id: text('session_id').notNull().references(() => active_workout_sessions.session_id, { onDelete: 'cascade' }),
  timer_type: text('timer_type').notNull(), // 'workout' | 'rest'
  start_time: text('start_time').notNull(), // ISO timestamp
  duration: integer('duration').notNull().default(0), // expected duration in seconds
  elapsed_when_paused: integer('elapsed_when_paused').default(0), // seconds elapsed when paused
  is_active: integer('is_active').notNull().default(1), // boolean 0/1
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// User Programs (simplified approach - reuses existing template system)
export const user_programs = sqliteTable('user_programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  duration_weeks: integer('duration_weeks').default(4),
  current_week: integer('current_week').default(1),
  current_day: integer('current_day').default(1),
  is_active: integer('is_active').default(0),
  start_date: text('start_date'),
  last_workout_date: text('last_workout_date'),
  completion_percentage: real('completion_percentage').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const program_days = sqliteTable('program_days', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  program_id: integer('program_id').notNull().references(() => user_programs.id, { onDelete: 'cascade' }),
  day_name: text('day_name').notNull(), // 'Monday', 'Tuesday', etc.
  template_id: integer('template_id').references(() => workout_templates.id, { onDelete: 'set null' }),
  day_order: integer('day_order').notNull(),
  is_rest_day: integer('is_rest_day').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Temporary table for storing workout data during program creation
export const temp_program_workouts = sqliteTable('temp_program_workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  day_name: text('day_name').notNull(),
  workout_type: text('workout_type').notNull(),
  exercises_json: text('exercises_json').notNull(), // JSON string of exercises array
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Insert types
export type NewExercise = typeof exercises.$inferInsert;
export type NewWorkout = typeof workouts.$inferInsert;
export type NewWorkoutExercise = typeof workout_exercises.$inferInsert;
export type NewSet = typeof sets.$inferInsert;
export type NewWorkoutTemplate = typeof workout_templates.$inferInsert;
export type NewTemplateExercise = typeof template_exercises.$inferInsert;
export type NewTemplateSet = typeof template_sets.$inferInsert;

// Program types
export type UserProgram = typeof user_programs.$inferSelect;
export type NewUserProgram = typeof user_programs.$inferInsert;
export type ProgramDay = typeof program_days.$inferSelect;
export type NewProgramDay = typeof program_days.$inferInsert;
export type TempProgramWorkout = typeof temp_program_workouts.$inferSelect;
export type NewTempProgramWorkout = typeof temp_program_workouts.$inferInsert;

// Cardio Sessions Tables
export const cardio_sessions = sqliteTable('cardio_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'hiit', 'walk_run', 'casual_walk'
  name: text('name').notNull(), // display name
  date: text('date').notNull(), // ISO timestamp
  duration: integer('duration').notNull(), // total seconds
  calories_burned: integer('calories_burned').default(0),
  
  // HIIT specific
  work_time: integer('work_time'), // seconds per work interval
  rest_time: integer('rest_time'), // seconds per rest interval
  rounds: integer('rounds'), // number of work/rest cycles
  
  // Walk-Run specific  
  run_time: integer('run_time'), // seconds per run interval
  walk_time: integer('walk_time'), // seconds per walk interval
  laps: integer('laps'), // number of run/walk cycles
  
  // Casual Walk specific
  total_laps: integer('total_laps'), // number of walking laps
  
  // Optional tracking data
  distance: real('distance'), // km or miles
  average_heart_rate: integer('average_heart_rate'), // bpm
  notes: text('notes'),
  
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Background persistence types
export type ActiveWorkoutSession = typeof active_workout_sessions.$inferSelect;
export type NewActiveWorkoutSession = typeof active_workout_sessions.$inferInsert;
export type ActiveSessionTimer = typeof active_session_timers.$inferSelect;
export type NewActiveSessionTimer = typeof active_session_timers.$inferInsert;

// Cardio types
export type CardioSession = typeof cardio_sessions.$inferSelect;
export type NewCardioSession = typeof cardio_sessions.$inferInsert; 