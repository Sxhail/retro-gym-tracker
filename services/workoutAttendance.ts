import { db } from '../db/client';
import { workouts } from '../db/schema';
import { sql } from 'drizzle-orm';

export interface AttendanceData {
  date: string; // YYYY-MM-DD format
  count: number; // number of workouts on that date
}

export interface MonthlyAttendance {
  year: number;
  month: number;
  attendance: AttendanceData[];
}

/**
 * Get workout attendance data for a specific month
 */
export async function getMonthlyAttendance(year: number, month: number): Promise<MonthlyAttendance> {
  try {
    // Use local date formatting to avoid timezone issues
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    const result = await db
      .select({
        date: sql<string>`DATE(${workouts.date})`,
        count: sql<number>`COUNT(*)`
      })
      .from(workouts)
      .where(sql`DATE(${workouts.date}) >= ${startDate} AND DATE(${workouts.date}) < ${endDate}`)
      .groupBy(sql`DATE(${workouts.date})`)
      .orderBy(sql`DATE(${workouts.date})`);

    return {
      year,
      month,
      attendance: result.map(row => ({
        date: row.date,
        count: row.count
      }))
    };
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    throw new Error(`Failed to fetch attendance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get workout attendance data for a date range
 */
export async function getAttendanceRange(startDate: string, endDate: string): Promise<AttendanceData[]> {
  try {
    const result = await db
      .select({
        date: sql<string>`DATE(${workouts.date})`,
        count: sql<number>`COUNT(*)`
      })
      .from(workouts)
      .where(sql`${workouts.date} >= ${startDate} AND ${workouts.date} <= ${endDate}`)
      .groupBy(sql`DATE(${workouts.date})`)
      .orderBy(sql`DATE(${workouts.date})`);

    return result.map(row => ({
      date: row.date,
      count: row.count
    }));
  } catch (error) {
    console.error('Error fetching attendance range:', error);
    throw new Error(`Failed to fetch attendance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get total workout count for a specific date
 */
export async function getWorkoutCountForDate(date: string): Promise<number> {
  try {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(workouts)
      .where(sql`DATE(${workouts.date}) = ${date}`);

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error fetching workout count for date:', error);
    return 0;
  }
}

/**
 * Get the most recent workout date
 */
export async function getMostRecentWorkoutDate(): Promise<string | null> {
  try {
    const result = await db
      .select({
        date: sql<string>`DATE(${workouts.date})`
      })
      .from(workouts)
      .orderBy(sql`${workouts.date} DESC`)
      .limit(1);

    return result[0]?.date || null;
  } catch (error) {
    console.error('Error fetching most recent workout date:', error);
    return null;
  }
}

/**
 * Get the earliest workout date
 */
export async function getEarliestWorkoutDate(): Promise<string | null> {
  try {
    const result = await db
      .select({
        date: sql<string>`DATE(${workouts.date})`
      })
      .from(workouts)
      .orderBy(sql`${workouts.date} ASC`)
      .limit(1);

    return result[0]?.date || null;
  } catch (error) {
    console.error('Error fetching earliest workout date:', error);
    return null;
  }
} 