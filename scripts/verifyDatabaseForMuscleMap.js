/**
 * Database Schema Verification for Muscle Activation Map
 * This script verifies that the database has the required structure and data
 */

import { db } from '../db/client';
import { workouts, workout_exercises, sets, exercises as exerciseTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export async function verifyDatabaseForMuscleMap() {
  console.log('🔍 Verifying database schema and data for muscle activation map...\n');

  try {
    // Check 1: Verify tables exist and have data
    console.log('📋 Checking table data...');
    
    const workoutCount = await db.select().from(workouts);
    console.log(`✅ Workouts table: ${workoutCount.length} records`);
    
    const exerciseCount = await db.select().from(exerciseTable);
    console.log(`✅ Exercises table: ${exerciseCount.length} records`);
    
    const workoutExerciseCount = await db.select().from(workout_exercises);
    console.log(`✅ Workout_exercises table: ${workoutExerciseCount.length} records`);
    
    const setsCount = await db.select().from(sets);
    console.log(`✅ Sets table: ${setsCount.length} records`);

    // Check 2: Verify muscle group data
    console.log('\n💪 Checking muscle group distribution...');
    
    const muscleGroups = await db
      .select({ 
        muscle_group: exerciseTable.muscle_group 
      })
      .from(exerciseTable);
    
    const groupCounts = muscleGroups.reduce((acc, ex) => {
      const group = ex.muscle_group || 'Unknown';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
    
    console.log('✅ Muscle groups in exercises:');
    Object.entries(groupCounts).forEach(([group, count]) => {
      console.log(`   ${group}: ${count} exercises`);
    });

    // Check 3: Verify recent workout data
    console.log('\n📅 Checking recent workout data...');
    
    const recentWorkouts = await db
      .select({
        id: workouts.id,
        date: workouts.date,
        name: workouts.name
      })
      .from(workouts)
      .orderBy(desc(workouts.date))
      .limit(5);
    
    if (recentWorkouts.length > 0) {
      console.log(`✅ Found ${recentWorkouts.length} recent workouts:`);
      recentWorkouts.forEach(workout => {
        const date = new Date(workout.date).toLocaleDateString();
        console.log(`   • ${date}: ${workout.name || 'Unnamed workout'}`);
      });
    } else {
      console.log('⚠️  No workouts found - muscle activation map will show empty state');
    }

    // Check 4: Test a sample query (similar to what muscleAnalytics service does)
    console.log('\n🧪 Testing sample muscle analytics query...');
    
    if (workoutCount.length > 0) {
      const sampleQuery = await db
        .select({
          exerciseName: exerciseTable.name,
          muscleGroup: exerciseTable.muscle_group,
          weight: sets.weight,
          reps: sets.reps,
          date: workouts.date
        })
        .from(workouts)
        .innerJoin(workout_exercises, eq(workouts.id, workout_exercises.workout_id))
        .innerJoin(exerciseTable, eq(workout_exercises.exercise_id, exerciseTable.id))
        .innerJoin(sets, eq(workout_exercises.id, sets.workout_exercise_id))
        .where(eq(sets.completed, 1))
        .limit(10);
      
      console.log(`✅ Sample query successful: ${sampleQuery.length} completed sets found`);
      
      if (sampleQuery.length > 0) {
        console.log('   Sample data:');
        sampleQuery.slice(0, 3).forEach(row => {
          console.log(`   • ${row.exerciseName} (${row.muscleGroup}): ${row.weight}kg × ${row.reps} reps`);
        });
      }
    }

    // Check 5: Verify exercise-to-muscle mapping coverage
    console.log('\n🗺️  Checking exercise-to-muscle mapping coverage...');
    
    const { MUSCLE_GROUPS, DATABASE_TO_MUSCLE_MAP } = await import('../components/anatomy/muscles');
    
    const dbMuscleGroups = Object.keys(groupCounts);
    const mappedGroups = Object.keys(DATABASE_TO_MUSCLE_MAP);
    
    console.log('✅ Database muscle groups:', dbMuscleGroups.join(', '));
    console.log('✅ Mapped muscle groups:', mappedGroups.join(', '));
    
    const unmappedGroups = dbMuscleGroups.filter(group => !mappedGroups.includes(group));
    const missingGroups = mappedGroups.filter(group => !dbMuscleGroups.includes(group));
    
    if (unmappedGroups.length > 0) {
      console.log('⚠️  Unmapped muscle groups (will show as untrained):', unmappedGroups.join(', '));
    }
    
    if (missingGroups.length > 0) {
      console.log('ℹ️  Mapped groups not in database:', missingGroups.join(', '));
    }
    
    if (unmappedGroups.length === 0 && missingGroups.length === 0) {
      console.log('✅ Perfect mapping coverage!');
    }

    console.log('\n🎉 Database verification complete!');
    console.log('\n📊 Summary:');
    console.log(`   • Workouts: ${workoutCount.length}`);
    console.log(`   • Exercises: ${exerciseCount.length}`);
    console.log(`   • Completed sets: ${setsCount.filter(s => s.completed).length}`);
    console.log(`   • Muscle groups: ${Object.keys(groupCounts).length}`);
    console.log(`   • Ready for muscle activation analysis: ${workoutCount.length > 0 ? 'YES' : 'NO'}`);

    return {
      success: true,
      stats: {
        workouts: workoutCount.length,
        exercises: exerciseCount.length,
        workoutExercises: workoutExerciseCount.length,
        sets: setsCount.length,
        muscleGroups: Object.keys(groupCounts).length,
        recentWorkouts: recentWorkouts.length,
        sampleData: sampleQuery?.length || 0
      },
      muscleGroups: groupCounts,
      mappingCoverage: {
        unmappedGroups,
        missingGroups
      }
    };

  } catch (error) {
    console.error('❌ Database verification failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check database connection');
    console.log('   • Verify schema matches imports');
    console.log('   • Ensure tables are properly created');
    console.log('   • Check that data exists in tables');
    
    return {
      success: false,
      error
    };
  }
}

export { verifyDatabaseForMuscleMap as default };
