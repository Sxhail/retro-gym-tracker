import { db } from '../db/client';
import * as schema from '../db/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

export type CardioType = 'hiit' | 'walk_run' | 'casual_walk';

export interface CardioSessionData {
  type: CardioType;
  name: string;
  duration: number; // total seconds
  calories_burned?: number;
  
  // HIIT specific
  work_time?: number;
  rest_time?: number;
  rounds?: number;
  
  // Walk-Run specific
  run_time?: number;
  walk_time?: number;
  laps?: number;
  
  // Casual Walk specific
  total_laps?: number;
  
  // Optional
  distance?: number;
  average_heart_rate?: number;
  notes?: string;
}

export interface CardioSessionWithStats extends schema.CardioSession {
  total_duration?: string;
  estimated_calories?: number;
}

/**
 * Save a completed cardio session to database
 * Uses transaction and retry logic similar to lift workouts for consistency
 */
export async function saveCardioSession(sessionData: CardioSessionData): Promise<number> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      console.log('📝 Saving cardio session to database:', JSON.stringify(sessionData, null, 2));
      
      // Validate required fields (similar to lift workout validation)
      if (!sessionData.type) {
        throw new Error('Session type cannot be empty');
      }
      
      if (!sessionData.name || sessionData.name.trim().length === 0) {
        throw new Error('Session name cannot be empty');
      }
      
      if (sessionData.name.length > 100) {
        throw new Error('Session name is too long (max 100 characters)');
      }
      
      if (!sessionData.duration || sessionData.duration <= 0) {
        throw new Error('Session duration must be greater than 0');
      }
      
      // Additional validation for specific cardio types
      if (sessionData.type === 'hiit') {
        if (sessionData.work_time && sessionData.work_time <= 0) {
          throw new Error('Work time must be greater than 0 for HIIT sessions');
        }
        if (sessionData.rest_time && sessionData.rest_time < 0) {
          throw new Error('Rest time cannot be negative');
        }
        if (sessionData.rounds && sessionData.rounds <= 0) {
          throw new Error('Rounds must be greater than 0 for HIIT sessions');
        }
      }
      
      if (sessionData.type === 'walk_run') {
        if (sessionData.run_time && sessionData.run_time <= 0) {
          throw new Error('Run time must be greater than 0 for Walk-Run sessions');
        }
        if (sessionData.walk_time && sessionData.walk_time <= 0) {
          throw new Error('Walk time must be greater than 0 for Walk-Run sessions');
        }
        if (sessionData.laps && sessionData.laps <= 0) {
          throw new Error('Laps must be greater than 0 for Walk-Run sessions');
        }
      }
      
      if (sessionData.type === 'casual_walk') {
        if (sessionData.total_laps && sessionData.total_laps <= 0) {
          throw new Error('Total laps must be greater than 0 for Casual Walk sessions');
        }
      }
      
      if (sessionData.notes && sessionData.notes.length > 500) {
        throw new Error('Notes are too long (max 500 characters)');
      }
      
      // Use transaction for atomic operation (like lift workouts)
      return await db.transaction(async (tx) => {
        // Prepare insert data with proper handling of undefined values
        const insertData = {
          type: sessionData.type,
          name: sessionData.name.trim(),
          date: new Date().toISOString(),
          duration: sessionData.duration,
          calories_burned: sessionData.calories_burned || calculateEstimatedCalories(sessionData),
          work_time: sessionData.work_time || null,
          rest_time: sessionData.rest_time || null,
          rounds: sessionData.rounds || null,
          run_time: sessionData.run_time || null,
          walk_time: sessionData.walk_time || null,
          laps: sessionData.laps || null,
          total_laps: sessionData.total_laps || null,
          distance: sessionData.distance || null,
          average_heart_rate: sessionData.average_heart_rate || null,
          notes: sessionData.notes ? sessionData.notes.trim() : null,
        };
        
        console.log('📝 Insert data prepared:', JSON.stringify(insertData, null, 2));

        const result = await tx.insert(schema.cardio_sessions).values(insertData).returning({ id: schema.cardio_sessions.id });

        if (!result || result.length === 0) {
          throw new Error('Database insert returned no results');
        }

        console.log('✅ Cardio session saved successfully with ID:', result[0].id);
        return result[0].id;
      });

    } catch (error) {
      retryCount++;
      console.error(`❌ Error saving cardio session (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (error instanceof Error) {
        // Don't retry validation errors (similar to lift workout logic)
        if (error.message.includes('cannot be empty') || 
            error.message.includes('too long') || 
            error.message.includes('must be greater than 0') ||
            error.message.includes('cannot be negative')) {
          throw error;
        }
      }
      
      if (retryCount >= maxRetries) {
        if (error instanceof Error && error.message.includes('database is locked')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (error instanceof Error && error.message.includes('no such table')) {
          throw new Error('Database schema is missing. Please restart the app.');
        } else {
          throw new Error('Failed to save cardio session. Please try again.');
        }
      }
      
      // Wait before retrying (exponential backoff like lift workouts)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }
  
  throw new Error('Failed to save cardio session after multiple attempts');
}

/**
 * Get all cardio sessions with pagination
 */
export async function getCardioHistory(page: number = 0, limit: number = 20): Promise<CardioSessionWithStats[]> {
  try {
    const sessions = await db
      .select()
      .from(schema.cardio_sessions)
      .orderBy(desc(schema.cardio_sessions.date))
      .limit(limit)
      .offset(page * limit);

    return sessions.map(session => ({
      ...session,
      total_duration: formatDuration(session.duration),
      estimated_calories: session.calories_burned || calculateEstimatedCalories({
        type: session.type as CardioType,
        duration: session.duration
      }),
    }));
  } catch (error) {
    console.error('Error getting cardio history:', error);
    return [];
  }
}

/**
 * Get cardio sessions for a specific date range
 */
export async function getCardioSessionsForDateRange(startDate: string, endDate: string): Promise<CardioSessionWithStats[]> {
  try {
    const sessions = await db
      .select()
      .from(schema.cardio_sessions)
      .where(
        and(
          gte(schema.cardio_sessions.date, startDate),
          lte(schema.cardio_sessions.date, endDate)
        )
      )
      .orderBy(desc(schema.cardio_sessions.date));

    return sessions.map(session => ({
      ...session,
      total_duration: formatDuration(session.duration),
      estimated_calories: session.calories_burned || calculateEstimatedCalories({
        type: session.type as CardioType,
        duration: session.duration
      }),
    }));
  } catch (error) {
    console.error('Error getting cardio sessions for date range:', error);
    return [];
  }
}

/**
 * Get cardio session dates for calendar highlighting
 */
export async function getCardioSessionDates(year: number, month: number): Promise<string[]> {
  try {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const sessions = await db
      .select({ date: schema.cardio_sessions.date })
      .from(schema.cardio_sessions)
      .where(
        and(
          gte(schema.cardio_sessions.date, startDate),
          lte(schema.cardio_sessions.date, endDate)
        )
      );

    return sessions.map(session => session.date.split('T')[0]); // Return just the date part
  } catch (error) {
    console.error('Error getting cardio session dates:', error);
    return [];
  }
}

/**
 * Get total cardio stats
 */
export async function getTotalCardioStats() {
  try {
    const sessions = await db
      .select({
        total_sessions: schema.cardio_sessions.id,
        total_duration: schema.cardio_sessions.duration,
        total_calories: schema.cardio_sessions.calories_burned,
      })
      .from(schema.cardio_sessions);

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, session) => sum + session.total_duration, 0);
    const totalCalories = sessions.reduce((sum, session) => sum + (session.total_calories || 0), 0);

    return {
      totalSessions,
      totalDuration,
      totalCalories,
      formattedDuration: formatDuration(totalDuration),
    };
  } catch (error) {
    console.error('Error getting total cardio stats:', error);
    return {
      totalSessions: 0,
      totalDuration: 0,
      totalCalories: 0,
      formattedDuration: '0:00',
    };
  }
}

/**
 * Delete a cardio session
 */
export async function deleteCardioSession(sessionId: number): Promise<boolean> {
  try {
    await db.delete(schema.cardio_sessions).where(eq(schema.cardio_sessions.id, sessionId));
    return true;
  } catch (error) {
    console.error('Error deleting cardio session:', error);
    return false;
  }
}

/**
 * Calculate estimated calories burned for a cardio session
 */
function calculateEstimatedCalories(session: Partial<CardioSessionData>): number {
  const durationInMinutes = (session.duration || 0) / 60;
  
  switch (session.type) {
    case 'hiit':
      return Math.round(durationInMinutes * 12); // High intensity
    case 'walk_run':
      return Math.round(durationInMinutes * 10); // Moderate to high intensity
    case 'casual_walk':
      return Math.round(durationInMinutes * 4); // Low intensity
    default:
      return Math.round(durationInMinutes * 6); // Default moderate
  }
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Format date for display
 */
export function formatCardioDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get cardio type display name
 */
export function getCardioTypeDisplayName(type: CardioType): string {
  switch (type) {
    case 'hiit':
      return 'HIIT';
    case 'walk_run':
      return 'WALK-RUN';
    case 'casual_walk':
      return 'CASUAL WALK';
    default:
      return 'CARDIO';
  }
}