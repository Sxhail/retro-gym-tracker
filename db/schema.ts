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

// Insert types
export type NewExercise = typeof exercises.$inferInsert;
export type NewWorkout = typeof workouts.$inferInsert;
export type NewWorkoutExercise = typeof workout_exercises.$inferInsert;
export type NewSet = typeof sets.$inferInsert;
export type NewWorkoutTemplate = typeof workout_templates.$inferInsert;
export type NewTemplateExercise = typeof template_exercises.$inferInsert;
export type NewTemplateSet = typeof template_sets.$inferInsert; 