import { db } from '../db/client';
import { workouts, workout_exercises, sets, exercises, workout_templates, template_exercises, template_sets } from '../db/schema';
import { eq, count } from 'drizzle-orm';

export interface DatabaseHealthReport {
  isHealthy: boolean;
  issues: string[];
  tableCounts: Record<string, number>;
  recommendations: string[];
}

/**
 * Perform a comprehensive database health check
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthReport> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const tableCounts: Record<string, number> = {};

  try {
    // Check if all required tables exist and are accessible
    const requiredTables = [
      'exercises',
      'workouts', 
      'workout_exercises',
      'sets',
      'workout_templates',
      'template_exercises',
      'template_sets'
    ];

    for (const tableName of requiredTables) {
      try {
        let countResult: any;
        
        switch (tableName) {
          case 'exercises':
            countResult = await db.select({ count: count() }).from(exercises);
            break;
          case 'workouts':
            countResult = await db.select({ count: count() }).from(workouts);
            break;
          case 'workout_exercises':
            countResult = await db.select({ count: count() }).from(workout_exercises);
            break;
          case 'sets':
            countResult = await db.select({ count: count() }).from(sets);
            break;
          case 'workout_templates':
            countResult = await db.select({ count: count() }).from(workout_templates);
            break;
          case 'template_exercises':
            countResult = await db.select({ count: count() }).from(template_exercises);
            break;
          case 'template_sets':
            countResult = await db.select({ count: count() }).from(template_sets);
            break;
        }

        tableCounts[tableName] = countResult[0]?.count || 0;
      } catch (error) {
        issues.push(`Table '${tableName}' is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
        tableCounts[tableName] = -1;
      }
    }

    // Check for data integrity issues
    if (tableCounts.exercises === 0) {
      issues.push('No exercises found in database');
      recommendations.push('Re-seed exercise database');
    }

    // Check for orphaned records
    try {
      const orphanedWorkoutExercises = await db
        .select({ count: count() })
        .from(workout_exercises)
        .leftJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
        .where(eq(workouts.id, null));

      if (orphanedWorkoutExercises[0]?.count > 0) {
        issues.push(`Found ${orphanedWorkoutExercises[0].count} orphaned workout exercises`);
        recommendations.push('Clean up orphaned workout exercises');
      }
    } catch (error) {
      issues.push('Unable to check for orphaned workout exercises');
    }

    try {
      const orphanedSets = await db
        .select({ count: count() })
        .from(sets)
        .leftJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
        .where(eq(workout_exercises.id, null));

      if (orphanedSets[0]?.count > 0) {
        issues.push(`Found ${orphanedSets[0].count} orphaned sets`);
        recommendations.push('Clean up orphaned sets');
      }
    } catch (error) {
      issues.push('Unable to check for orphaned sets');
    }

    // Check for template integrity
    try {
      const orphanedTemplateExercises = await db
        .select({ count: count() })
        .from(template_exercises)
        .leftJoin(workout_templates, eq(template_exercises.template_id, workout_templates.id))
        .where(eq(workout_templates.id, null));

      if (orphanedTemplateExercises[0]?.count > 0) {
        issues.push(`Found ${orphanedTemplateExercises[0].count} orphaned template exercises`);
        recommendations.push('Clean up orphaned template exercises');
      }
    } catch (error) {
      issues.push('Unable to check for orphaned template exercises');
    }

    // Check for data consistency issues
    try {
      const invalidSets = await db
        .select({ count: count() })
        .from(sets)
        .where(eq(sets.weight, -1)); // Assuming -1 is invalid

      if (invalidSets[0]?.count > 0) {
        issues.push(`Found ${invalidSets[0].count} sets with invalid weight values`);
        recommendations.push('Review and fix invalid set data');
      }
    } catch (error) {
      issues.push('Unable to check for invalid set data');
    }

  } catch (error) {
    issues.push(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    recommendations.push('Restart the app');
  }

  const isHealthy = issues.length === 0;

  return {
    isHealthy,
    issues,
    tableCounts,
    recommendations
  };
}

/**
 * Attempt to repair common database issues
 */
export async function repairDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // Start a transaction for all repair operations
    await db.transaction(async (tx) => {
      // Clean up orphaned workout exercises
      await tx
        .delete(workout_exercises)
        .where(
          eq(workout_exercises.workout_id, 
            tx.select({ id: workouts.id })
              .from(workouts)
              .where(eq(workouts.id, null))
          )
        );

      // Clean up orphaned sets
      await tx
        .delete(sets)
        .where(
          eq(sets.workout_exercise_id,
            tx.select({ id: workout_exercises.id })
              .from(workout_exercises)
              .where(eq(workout_exercises.id, null))
          )
        );

      // Clean up orphaned template exercises
      await tx
        .delete(template_exercises)
        .where(
          eq(template_exercises.template_id,
            tx.select({ id: workout_templates.id })
              .from(workout_templates)
              .where(eq(workout_templates.id, null))
          )
        );

      // Clean up orphaned template sets
      await tx
        .delete(template_sets)
        .where(
          eq(template_sets.template_exercise_id,
            tx.select({ id: template_exercises.id })
              .from(template_exercises)
              .where(eq(template_exercises.id, null))
          )
        );

      // Fix invalid weight values (set to 0)
      await tx
        .update(sets)
        .set({ weight: 0 })
        .where(eq(sets.weight, -1));

      // Fix invalid reps values (set to 1)
      await tx
        .update(sets)
        .set({ reps: 1 })
        .where(eq(sets.reps, 0));
    });

    return {
      success: true,
      message: 'Database repair completed successfully'
    };

  } catch (error) {
    console.error('Database repair failed:', error);
    return {
      success: false,
      message: `Database repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Reset database to a clean state (use with caution)
 */
export async function resetDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    await db.transaction(async (tx) => {
      // Delete all data in reverse dependency order
      await tx.delete(template_sets);
      await tx.delete(template_exercises);
      await tx.delete(workout_templates);
      await tx.delete(sets);
      await tx.delete(workout_exercises);
      await tx.delete(workouts);
      // Don't delete exercises as they're seeded from JSON
    });

    return {
      success: true,
      message: 'Database reset completed successfully'
    };

  } catch (error) {
    console.error('Database reset failed:', error);
    return {
      success: false,
      message: `Database reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalTemplates: number;
  averageWorkoutDuration: number;
  mostUsedExercises: Array<{ name: string; count: number }>;
}> {
  try {
    const [
      totalWorkouts,
      totalExercises,
      totalSets,
      totalTemplates,
      averageDuration,
      exerciseUsage
    ] = await Promise.all([
      db.select({ count: count() }).from(workouts),
      db.select({ count: count() }).from(exercises),
      db.select({ count: count() }).from(sets),
      db.select({ count: count() }).from(workout_templates),
      db.select({ avg: workouts.duration }).from(workouts),
      db
        .select({
          name: exercises.name,
          count: count()
        })
        .from(exercises)
        .innerJoin(workout_exercises, eq(exercises.id, workout_exercises.exercise_id))
        .groupBy(exercises.id, exercises.name)
        .orderBy(count())
        .limit(5)
    ]);

    return {
      totalWorkouts: totalWorkouts[0]?.count || 0,
      totalExercises: totalExercises[0]?.count || 0,
      totalSets: totalSets[0]?.count || 0,
      totalTemplates: totalTemplates[0]?.count || 0,
      averageWorkoutDuration: Math.round(averageDuration[0]?.avg || 0),
      mostUsedExercises: exerciseUsage.map(ex => ({
        name: ex.name,
        count: ex.count
      }))
    };

  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      totalWorkouts: 0,
      totalExercises: 0,
      totalSets: 0,
      totalTemplates: 0,
      averageWorkoutDuration: 0,
      mostUsedExercises: []
    };
  }
} 