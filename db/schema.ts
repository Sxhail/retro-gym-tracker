import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  muscle_group: text('muscle_group'),
  is_custom: integer('is_custom').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export type Exercise = typeof exercises.$inferSelect; 