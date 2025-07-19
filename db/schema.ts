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

// TypeScript types
export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workout_exercises.$inferSelect;
export type Set = typeof sets.$inferSelect;

// Insert types
export type NewExercise = typeof exercises.$inferInsert;
export type NewWorkout = typeof workouts.$inferInsert;
export type NewWorkoutExercise = typeof workout_exercises.$inferInsert;
export type NewSet = typeof sets.$inferInsert; 