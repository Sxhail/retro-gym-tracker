import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { WorkoutSessionProvider } from '../context/WorkoutSessionContext';
import { db } from '../db/client';
import * as schema from '../db/schema';
import exerciseList from '../db/exercises.json';
import migrations from '../drizzle/migrations/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) {
      // One‑time seed of exercises from JSON after migrations
      db.select().from(schema.exercises)
        .then(async (rows) => {
          const count = rows.length;
          console.log('[Drizzle] exercises table row count:', count);
          if (count === 0) {
            const now = new Date().toISOString();
            const seedRows = exerciseList.map((ex) => ({
              name: ex.name,
              category: Array.isArray(ex.categories) ? ex.categories.join(', ') : '',
              muscle_group: Array.isArray(ex.muscle_groups) ? ex.muscle_groups.join(', ') : '',
              is_custom: 0,
              created_at: now,
            }));
            try {
              await db.insert(schema.exercises).values(seedRows);
              console.log(`[Drizzle] Seeded ${seedRows.length} exercises from JSON.`);
            } catch (err) {
              console.error('[Drizzle] Error seeding exercises:', err);
            }
          }
        })
        .catch((err) => {
          console.error('[Drizzle] Error counting exercises:', err);
        });
    }
  }, [success]);

  if (error) {
    return <>{`Migration error: ${error.message}`}</>;
  }
  if (!success) {
    return <>Migrating database...</>;
  }
  return (
    <WorkoutSessionProvider>
      <Stack />
    </WorkoutSessionProvider>
  );
} 