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
 */
export async function saveCardioSession(sessionData: CardioSessionData): Promise<number> {
  try {
    console.log('📝 Saving cardio session to database:', sessionData);
    
    // Validate required fields
    if (!sessionData.type || !sessionData.name || !sessionData.duration) {
      throw new Error('Missing required session data: type, name, or duration');
    }
    
    if (sessionData.duration <= 0) {
      throw new Error('Session duration must be greater than 0');
    }
    
    const result = await db.insert(schema.cardio_sessions).values({
      type: sessionData.type,
      name: sessionData.name,
      date: new Date().toISOString(),
      duration: sessionData.duration,
      calories_burned: sessionData.calories_burned || calculateEstimatedCalories(sessionData),
      work_time: sessionData.work_time,
      rest_time: sessionData.rest_time,
      rounds: sessionData.rounds,
      run_time: sessionData.run_time,
      walk_time: sessionData.walk_time,
      laps: sessionData.laps,
      total_laps: sessionData.total_laps,
      distance: sessionData.distance,
      average_heart_rate: sessionData.average_heart_rate,
      notes: sessionData.notes,
    }).returning({ id: schema.cardio_sessions.id });

    console.log('✅ Cardio session saved successfully with ID:', result[0].id);
    return result[0].id;
  } catch (error) {
    console.error('❌ Error saving cardio session:', error);
    // Re-throw with more context
    throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
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