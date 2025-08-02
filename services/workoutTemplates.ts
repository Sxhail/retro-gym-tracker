import { db } from '../db/client';
import { 
  workout_templates, 
  template_exercises, 
  template_sets,
  exercises,
  type WorkoutTemplate,
  type TemplateExercise,
  type TemplateSet,
  type NewWorkoutTemplate,
  type NewTemplateExercise,
  type NewTemplateSet
} from '../db/schema';

// Re-export types for convenience
export type { WorkoutTemplate, TemplateExercise, TemplateSet };
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export interface TemplateDetail {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  estimated_duration: number | null;
  is_favorite: boolean;
  created_at: string;
  exercises: TemplateExerciseDetail[];
}

export interface TemplateExerciseDetail {
  id: number;
  exercise_order: number;
  distance: number | null;
  exercise: {
    id: number;
    name: string;
    category: string | null;
    muscle_group: string | null;
  };
  sets: TemplateSetDetail[];
}

export interface TemplateSetDetail {
  id: number;
  set_index: number;
  target_weight: number | null;
  target_reps: number;
  target_rest: number;
  notes: string | null;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimated_duration?: number;
  exercises: {
    exercise_id: number;
    exercise_order: number;
    distance?: number;
    sets: {
      set_index: number;
      target_weight?: number;
      target_reps: number;
      target_rest: number;
      notes?: string;
    }[];
  }[];
}

// Get all templates with basic info
export async function getTemplates(includeFavorites = false): Promise<WorkoutTemplate[]> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      if (includeFavorites) {
        const templates = await db
          .select()
          .from(workout_templates)
          .where(eq(workout_templates.is_favorite, 1))
          .orderBy(desc(workout_templates.created_at));
        return templates;
      } else {
        const templates = await db
          .select()
          .from(workout_templates)
          .orderBy(desc(workout_templates.created_at));
        return templates;
      }
    } catch (error) {
      retryCount++;
      console.error(`Error fetching templates (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        if (error instanceof Error && error.message.includes('database is locked')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (error instanceof Error && error.message.includes('no such table')) {
          throw new Error('Database schema is missing. Please restart the app.');
        } else {
          throw new Error('Failed to load templates. Please check your connection and try again.');
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }
  
  throw new Error('Failed to fetch templates after multiple attempts');
}

// Get template by ID with full details
export async function getTemplateDetail(templateId: number): Promise<TemplateDetail | null> {
  try {
    // Get template
    const template = await db
      .select()
      .from(workout_templates)
      .where(eq(workout_templates.id, templateId))
      .limit(1);

    if (!template.length) {
      return null;
    }

    // Get template exercises with exercise details
    const templateExercises = await db
      .select({
        id: template_exercises.id,
        exercise_order: template_exercises.exercise_order,
        distance: template_exercises.distance,
        exercise: {
          id: exercises.id,
          name: exercises.name,
          category: exercises.category,
          muscle_group: exercises.muscle_group,
        }
      })
      .from(template_exercises)
      .innerJoin(exercises, eq(template_exercises.exercise_id, exercises.id))
      .where(eq(template_exercises.template_id, templateId))
      .orderBy(asc(template_exercises.exercise_order));

    // Get sets for each exercise
    const exercisesWithSets: TemplateExerciseDetail[] = [];
    
    for (const exercise of templateExercises) {
      const sets = await db
        .select({
          id: template_sets.id,
          set_index: template_sets.set_index,
          target_weight: template_sets.target_weight,
          target_reps: template_sets.target_reps,
          target_rest: template_sets.target_rest,
          notes: template_sets.notes,
        })
        .from(template_sets)
        .innerJoin(template_exercises, eq(template_sets.template_exercise_id, template_exercises.id))
        .where(eq(template_exercises.id, exercise.id))
        .orderBy(asc(template_sets.set_index));

      exercisesWithSets.push({
        ...exercise,
        sets: sets as TemplateSetDetail[],
      });
    }

    return {
      ...template[0],
      is_favorite: Boolean(template[0].is_favorite),
      exercises: exercisesWithSets,
    };
  } catch (error) {
    console.error('Error fetching template detail:', error);
    throw new Error('Failed to fetch template detail');
  }
}

// Create new template
export async function createTemplate(templateData: CreateTemplateData): Promise<number> {
  try {
    return await db.transaction(async (tx) => {
      // Insert template
      const [template] = await tx
        .insert(workout_templates)
        .values({
          name: templateData.name,
          description: templateData.description || null,
          category: templateData.category || null,
          difficulty: templateData.difficulty || null,
          estimated_duration: templateData.estimated_duration || null,
          is_favorite: 0,
        })
        .returning({ id: workout_templates.id });

      const templateId = template.id;

      // Insert exercises
      for (const exerciseData of templateData.exercises) {
        const [templateExercise] = await tx
          .insert(template_exercises)
          .values({
            template_id: templateId,
            exercise_id: exerciseData.exercise_id,
            exercise_order: exerciseData.exercise_order,
            distance: exerciseData.distance || null,
          })
          .returning({ id: template_exercises.id });

        // Insert sets for this exercise
        for (const setData of exerciseData.sets) {
          await tx.insert(template_sets).values({
            template_exercise_id: templateExercise.id,
            set_index: setData.set_index,
            target_weight: setData.target_weight || null,
            target_reps: setData.target_reps,
            target_rest: setData.target_rest,
            notes: setData.notes || null,
          });
        }
      }

      return templateId;
    });
  } catch (error) {
    console.error('Error creating template:', error);
    throw new Error('Failed to create template');
  }
}

// Update template
export async function updateTemplate(templateId: number, templateData: Partial<CreateTemplateData>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Update template basic info
      if (templateData.name || templateData.description || templateData.category || 
          templateData.difficulty || templateData.estimated_duration !== undefined) {
        await tx
          .update(workout_templates)
          .set({
            name: templateData.name,
            description: templateData.description,
            category: templateData.category,
            difficulty: templateData.difficulty,
            estimated_duration: templateData.estimated_duration,
          })
          .where(eq(workout_templates.id, templateId));
      }

      // If exercises are provided, replace all exercises and sets
      if (templateData.exercises) {
        // Delete existing template exercises (cascades to sets)
        await tx
          .delete(template_exercises)
          .where(eq(template_exercises.template_id, templateId));

        // Insert new exercises
        for (const exerciseData of templateData.exercises) {
          const [templateExercise] = await tx
            .insert(template_exercises)
            .values({
              template_id: templateId,
              exercise_id: exerciseData.exercise_id,
              exercise_order: exerciseData.exercise_order,
              distance: exerciseData.distance || null,
            })
            .returning({ id: template_exercises.id });

          // Insert sets for this exercise
          for (const setData of exerciseData.sets) {
            await tx.insert(template_sets).values({
              template_exercise_id: templateExercise.id,
              set_index: setData.set_index,
              target_weight: setData.target_weight || null,
              target_reps: setData.target_reps,
              target_rest: setData.target_rest,
              notes: setData.notes || null,
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error('Failed to update template');
  }
}

// Delete template
export async function deleteTemplate(templateId: number): Promise<void> {
  try {
    await db.delete(workout_templates).where(eq(workout_templates.id, templateId));
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
}

// Toggle favorite status
export async function toggleFavorite(templateId: number): Promise<void> {
  try {
    const template = await db
      .select({ is_favorite: workout_templates.is_favorite })
      .from(workout_templates)
      .where(eq(workout_templates.id, templateId))
      .limit(1);

    if (!template.length) {
      throw new Error('Template not found');
    }

    const newFavoriteStatus = template[0].is_favorite === 1 ? 0 : 1;
    
    await db
      .update(workout_templates)
      .set({ is_favorite: newFavoriteStatus })
      .where(eq(workout_templates.id, templateId));
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw new Error('Failed to toggle favorite status');
  }
}

// Load template into workout session format
export async function loadTemplateIntoSession(templateId: number): Promise<{
  exercises: Array<{
    id: number;
    name: string;
    category: string | null;
    muscle_group: string | null;
    distance: number | null;
    sets: Array<{
      weight: string;
      reps: string;
      rest: string;
      notes: string;
    }>;
  }>;
}> {
  try {
    const template = await getTemplateDetail(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    return {
      exercises: template.exercises.map(exercise => ({
        id: exercise.exercise.id,
        name: exercise.exercise.name,
        category: exercise.exercise.category,
        muscle_group: exercise.exercise.muscle_group,
        distance: exercise.distance,
        sets: exercise.sets.map(set => ({
          weight: set.target_weight ? set.target_weight.toString() : '',
          reps: set.target_reps.toString(),
          rest: set.target_rest.toString(),
          notes: set.notes || '',
        })),
      })),
    };
  } catch (error) {
    console.error('Error loading template into session:', error);
    throw new Error('Failed to load template into session');
  }
}

// Get templates by category
export async function getTemplatesByCategory(category: string): Promise<WorkoutTemplate[]> {
  try {
    const templates = await db
      .select()
      .from(workout_templates)
      .where(eq(workout_templates.category, category))
      .orderBy(desc(workout_templates.created_at));
    
    return templates;
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    throw new Error('Failed to fetch templates by category');
  }
}

// Search templates by name
export async function searchTemplates(searchTerm: string): Promise<WorkoutTemplate[]> {
  try {
    const templates = await db
      .select()
      .from(workout_templates)
      .where(sql`${workout_templates.name} LIKE ${`%${searchTerm}%`}`)
      .orderBy(desc(workout_templates.created_at));
    
    return templates;
  } catch (error) {
    console.error('Error searching templates:', error);
    throw new Error('Failed to search templates');
  }
} 