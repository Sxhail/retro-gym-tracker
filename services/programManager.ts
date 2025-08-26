import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface ProgramData {
  name: string;
  description?: string;
  durationWeeks: number;
  days: Array<{
    dayName: string;
    dayOrder: number;
    workoutType: string;
  cardio?: any; // optional cardio params persisted as JSON when present
    exercises: Array<{
      id: number;
      name: string;
      sets: number;
      reps: string;
    }>;
    isRestDay?: boolean;
  }>;
}

export class ProgramManager {
  /**
   * Create and save a new program from the program builder
   */
  static async createProgram(programData: ProgramData): Promise<number> {
    try {
      // 1. Create the main program record
      const [program] = await db.insert(schema.user_programs).values({
        name: programData.name,
        description: programData.description,
        duration_weeks: programData.durationWeeks,
        created_at: new Date().toISOString(),
      }).returning();

      // 2. For each day, create templates and link them
      for (const day of programData.days) {
        if (day.isRestDay) {
          // Just create a rest day record
          await db.insert(schema.program_days).values({
            program_id: program.id,
            day_name: day.dayName,
            day_order: day.dayOrder,
            is_rest_day: 1,
            template_id: null,
          });
    } else {
          // Create a workout template for this day
      const wt = (day.workoutType || '').toLowerCase();
      const impliedCardio = wt === 'cardio' || wt.includes('cardio') || ['quick hiit','walk-run','walk run','hiit','run','running','walk'].includes(wt);
      // For cardio, embed params JSON in description
      let description: string | null = `${day.workoutType} workout for ${programData.name} program`;
      if (impliedCardio && day.cardio) {
        try { description = JSON.stringify({ cardio: day.cardio }); } catch {}
      }
      const [template] = await db.insert(schema.workout_templates).values({
    name: `${programData.name} - ${day.workoutType}`,
    description,
    category: impliedCardio ? 'cardio' : 'strength',
            estimated_duration: 60,
            created_at: new Date().toISOString(),
          }).returning();

          // Add exercises to the template
          for (let i = 0; i < day.exercises.length; i++) {
            const exercise = day.exercises[i];
            
            // Create template exercise
            const [templateExercise] = await db.insert(schema.template_exercises).values({
              template_id: template.id,
              exercise_id: exercise.id,
              exercise_order: i + 1,
            }).returning();

            // Create template sets for this exercise
            for (let setIndex = 1; setIndex <= exercise.sets; setIndex++) {
              await db.insert(schema.template_sets).values({
                template_exercise_id: templateExercise.id,
                set_index: setIndex,
                target_reps: parseInt(exercise.reps.split('-')[0]) || 8, // Parse "8-12" to 8
                target_rest: 60, // Default 60 seconds rest
              });
            }
          }

          // Link the template to the program day
          await db.insert(schema.program_days).values({
            program_id: program.id,
            day_name: day.dayName,
            template_id: template.id,
            day_order: day.dayOrder,
            is_rest_day: 0,
          });
        }
      }

      return program.id;
    } catch (error) {
      console.error('Error creating program:', error);
      throw new Error('Failed to create program');
    }
  }

  /**
   * Activate a program for the user
   */
  static async activateProgram(programId: number): Promise<void> {
    try {
      // Deactivate all other programs
      await db.update(schema.user_programs)
        .set({ is_active: 0 })
        .where(eq(schema.user_programs.is_active, 1));

      // Activate the selected program
      await db.update(schema.user_programs)
        .set({ 
          is_active: 1,
          start_date: new Date().toISOString(),
          current_week: 1,
          current_day: 1,
          completion_percentage: 0,
        })
        .where(eq(schema.user_programs.id, programId));
    } catch (error) {
      console.error('Error activating program:', error);
      throw new Error('Failed to activate program');
    }
  }

  /**
   * Get the currently active program with 100% accurate progress data
   */
  static async getActiveProgram(): Promise<{
    program: schema.UserProgram;
    nextWorkout: string;
    daysSinceLastWorkout: number;
    actualProgress: {
      completedWorkouts: number;
      totalWorkouts: number;
      realPercentage: number;
      currentWeek: number;
      totalWeeks: number;
    };
  } | null> {
    try {
      const [activeProgram] = await db.select()
        .from(schema.user_programs)
        .where(eq(schema.user_programs.is_active, 1))
        .limit(1);

      if (!activeProgram) {
        return null;
      }

      // Get all program days (workout and rest days)
      const programDays = await db.select()
        .from(schema.program_days)
        .leftJoin(schema.workout_templates, eq(schema.program_days.template_id, schema.workout_templates.id))
        .where(eq(schema.program_days.program_id, activeProgram.id))
        .orderBy(schema.program_days.day_order);

      // Get all completed program workouts
      const completedWorkouts = await db.select()
        .from(schema.workouts)
        .where(eq(schema.workouts.program_id, activeProgram.id))
        .orderBy(desc(schema.workouts.date));

      // Calculate accurate progress
      const workoutDays = programDays.filter(day => !day.program_days.is_rest_day);
      const totalWorkouts = workoutDays.length * activeProgram.duration_weeks;
      const completedCount = completedWorkouts.length;
      const realPercentage = totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0;

      // Calculate current week based on completed workouts
      const workoutsPerWeek = workoutDays.length;
      const currentWeek = Math.floor(completedCount / workoutsPerWeek) + 1;
      const currentWeekCapped = Math.min(currentWeek, activeProgram.duration_weeks);

      // Find next workout day
      const currentDayInWeek = (completedCount % workoutsPerWeek);
      let nextWorkout = 'Program Complete';
      
      if (completedCount < totalWorkouts) {
        // Find the next workout day in the schedule
        if (currentDayInWeek < workoutDays.length) {
          const nextDay = workoutDays[currentDayInWeek];
          
          if (nextDay.program_days.is_rest_day) {
            nextWorkout = 'Rest Day';
          } else if (nextDay.workout_templates?.name) {
            // Extract workout type from template name
            const parts = nextDay.workout_templates.name.split(' - ');
            nextWorkout = parts.length > 1 ? parts[1] : nextDay.program_days.day_name;
          } else {
            nextWorkout = nextDay.program_days.day_name;
          }
        } else {
          // Look for rest days or cycle back
          nextWorkout = 'Next Workout';
        }
      }

      // Calculate days since last workout (accurate from database)
      let daysSince = 0;
      if (completedWorkouts.length > 0) {
        const lastWorkoutDate = new Date(completedWorkouts[0].date);
        daysSince = Math.floor((Date.now() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
      } else if (activeProgram.start_date) {
        const startDate = new Date(activeProgram.start_date);
        daysSince = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        program: activeProgram,
        nextWorkout,
        daysSinceLastWorkout: daysSince,
        actualProgress: {
          completedWorkouts: completedCount,
          totalWorkouts,
          realPercentage,
          currentWeek: currentWeekCapped,
          totalWeeks: activeProgram.duration_weeks,
        },
      };
    } catch (error) {
      console.error('Error getting active program:', error);
      return null;
    }
  }

  /**
   * Update program progress when a workout is completed
   */
  static async updateProgress(programId: number, workoutId: number): Promise<void> {
    try {
      const [program] = await db.select()
        .from(schema.user_programs)
        .where(eq(schema.user_programs.id, programId))
        .limit(1);

      if (!program) return;

      // Get total program days (non-rest days)
      const totalDays = await db.select()
        .from(schema.program_days)
        .where(and(
          eq(schema.program_days.program_id, programId),
          eq(schema.program_days.is_rest_day, 0)
        ));

      // Get completed program workouts
      const completedWorkouts = await db.select()
        .from(schema.workouts)
        .where(and(
          eq(schema.workouts.program_id, programId)
        ));

      const totalWorkoutDays = totalDays.length * program.duration_weeks;
      const completedCount = completedWorkouts.length;
      const newProgress = Math.min((completedCount / totalWorkoutDays) * 100, 100);

      // Advance to next day
      let nextDay = program.current_day + 1;
      let nextWeek = program.current_week;

      if (nextDay > totalDays.length) {
        nextDay = 1;
        nextWeek += 1;
      }

      // Update program progress
      await db.update(schema.user_programs)
        .set({
          current_week: nextWeek,
          current_day: nextDay,
          completion_percentage: newProgress,
          last_workout_date: new Date().toISOString(),
        })
        .where(eq(schema.user_programs.id, programId));

    } catch (error) {
      console.error('Error updating program progress:', error);
      throw new Error('Failed to update program progress');
    }
  }

  /**
   * Get workout template for a specific program day
   */
  static async getProgramWorkoutTemplate(programId: number, dayName: string): Promise<{
    programDay: any;
    template: any;
    exercises: any[];
  } | null> {
    try {
      // Get the program day
      const [programDay] = await db.select()
        .from(schema.program_days)
        .leftJoin(schema.workout_templates, eq(schema.program_days.template_id, schema.workout_templates.id))
        .where(and(
          eq(schema.program_days.program_id, programId),
          eq(schema.program_days.day_name, dayName.toUpperCase())
        ))
        .limit(1);

      if (!programDay || programDay.program_days.is_rest_day) {
        return null; // Rest day or not found
      }

      if (!programDay.workout_templates) {
        return null; // No template found
      }

      // Get template exercises
      const templateExercises = await db.select({
        exerciseId: schema.template_exercises.exercise_id,
        exerciseOrder: schema.template_exercises.exercise_order,
        exerciseName: schema.exercises.name,
        sets: schema.template_sets.set_index,
        targetReps: schema.template_sets.target_reps,
      })
        .from(schema.template_exercises)
        .innerJoin(schema.exercises, eq(schema.template_exercises.exercise_id, schema.exercises.id))
        .leftJoin(schema.template_sets, eq(schema.template_exercises.id, schema.template_sets.template_exercise_id))
        .where(eq(schema.template_exercises.template_id, programDay.workout_templates.id))
        .orderBy(schema.template_exercises.exercise_order, schema.template_sets.set_index);

      // Group by exercise and count sets
      const exerciseMap = new Map();
      templateExercises.forEach(te => {
        if (!exerciseMap.has(te.exerciseId)) {
          exerciseMap.set(te.exerciseId, {
            id: te.exerciseId,
            name: te.exerciseName,
            exerciseId: te.exerciseId,
            sets: 0,
            reps: te.targetReps?.toString() || '8-12',
          });
        }
        if (te.sets) {
          exerciseMap.get(te.exerciseId).sets = Math.max(
            exerciseMap.get(te.exerciseId).sets,
            te.sets
          );
        }
      });

      const exercises = Array.from(exerciseMap.values());

      return {
        programDay: programDay.program_days,
        template: programDay.workout_templates,
        exercises,
      };
    } catch (error) {
      console.error('Error getting program workout template:', error);
      return null;
    }
  }

  /**
   * Complete a program workout and update progress
   */
  static async completeProgramWorkout(programId: number, workoutId: number): Promise<void> {
    try {
      await this.updateProgress(programId, workoutId);
    } catch (error) {
      console.error('Error completing program workout:', error);
      throw new Error('Failed to complete program workout');
    }
  }

  /**
   * Get all user programs
   */
  static async getUserPrograms(): Promise<schema.UserProgram[]> {
    try {
      return await db.select()
        .from(schema.user_programs)
        .orderBy(desc(schema.user_programs.created_at));
    } catch (error) {
      console.error('Error getting user programs:', error);
      return [];
    }
  }

  /**
   * Get program days for a specific program
   */
  static async getProgramDays(programId: number): Promise<schema.ProgramDay[]> {
    try {
      return await db.select()
        .from(schema.program_days)
        .where(eq(schema.program_days.program_id, programId))
        .orderBy(schema.program_days.day_order);
    } catch (error) {
      console.error('Error getting program days:', error);
      return [];
    }
  }

  /**
   * Permanently delete a program and its days
   */
  static async deleteProgram(programId: number): Promise<void> {
    try {
      await db.delete(schema.program_days).where(eq(schema.program_days.program_id, programId));
      await db.delete(schema.user_programs).where(eq(schema.user_programs.id, programId));
    } catch (error) {
      console.error('Error deleting program:', error);
      throw new Error('Failed to delete program');
    }
  }

  /**
   * Get a specific program by ID
   */
  static async getProgramById(programId: number): Promise<schema.UserProgram | null> {
    try {
      const programs = await db.select()
        .from(schema.user_programs)
        .where(eq(schema.user_programs.id, programId))
        .limit(1);
      
      return programs.length > 0 ? programs[0] : null;
    } catch (error) {
      console.error('Error getting program by ID:', error);
      return null;
    }
  }

  /**
   * Calculate detailed program statistics
   */
  static async calculateProgramStats(programId: number): Promise<{
    totalWorkouts: number;
    completedWorkouts: number;
    completionPercentage: number;
    currentWeek: number;
    totalWeeks: number;
    nextWorkout: string;
    daysSinceLastWorkout: number | null;
    programDays: any[];
  } | null> {
    try {
      // Get program
      const program = await this.getProgramById(programId);
      if (!program) return null;

      // Get program days
      const programDays = await db.select()
        .from(schema.program_days)
        .leftJoin(schema.workout_templates, eq(schema.program_days.template_id, schema.workout_templates.id))
        .where(eq(schema.program_days.program_id, programId))
        .orderBy(schema.program_days.day_order);

      // Get completed workouts
      const completedWorkouts = await db.select()
        .from(schema.workouts)
        .where(eq(schema.workouts.program_id, programId))
        .orderBy(desc(schema.workouts.date));

      // Calculate stats
      const workoutDays = programDays.filter(day => !day.program_days.is_rest_day);
      const totalWorkouts = workoutDays.length * program.duration_weeks;
      const completedCount = completedWorkouts.length;
      const completionPercentage = totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0;

      // Calculate current week
      const workoutsPerWeek = workoutDays.length;
      const currentWeek = Math.min(Math.floor(completedCount / workoutsPerWeek) + 1, program.duration_weeks);

      // Find next workout
      const currentDayInWeek = (completedCount % workoutsPerWeek);
      let nextWorkout = 'Program Complete';
      
      if (completedCount < totalWorkouts) {
        if (currentDayInWeek < workoutDays.length) {
          const nextDay = workoutDays[currentDayInWeek];
          
          if (nextDay.program_days.is_rest_day) {
            nextWorkout = 'Rest Day';
          } else if (nextDay.workout_templates?.name) {
            const parts = nextDay.workout_templates.name.split(' - ');
            nextWorkout = parts.length > 1 ? parts[1] : nextDay.program_days.day_name;
          } else {
            nextWorkout = nextDay.program_days.day_name;
          }
        } else {
          nextWorkout = 'Next Workout';
        }
      }

      // Calculate days since last workout
      let daysSinceLastWorkout = null;
      if (completedWorkouts.length > 0) {
        const lastWorkoutDate = new Date(completedWorkouts[0].date);
        daysSinceLastWorkout = Math.floor((Date.now() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        totalWorkouts,
        completedWorkouts: completedCount,
        completionPercentage,
        currentWeek,
        totalWeeks: program.duration_weeks,
        nextWorkout,
        daysSinceLastWorkout,
        programDays: programDays.map(pd => ({
          day_name: pd.program_days.day_name,
          is_rest_day: pd.program_days.is_rest_day,
          template_name: pd.workout_templates?.name || null,
        })),
      };
    } catch (error) {
      console.error('Error calculating program stats:', error);
      return null;
    }
  }
}
