import { db, schema } from '../db/client';
import { sql, asc, desc, eq, and, gte, lte } from 'drizzle-orm';

export type DateRangePreset = '7d' | '30d' | 'all';

export interface SeriesPoint {
  date: Date;
  value: number;
}

export interface VolumePoint extends SeriesPoint {}
export interface CountPoint extends SeriesPoint {}

export interface PRPoint extends SeriesPoint {
  isNewPR: boolean;
}

export interface PeakPoint extends SeriesPoint {
  isPeak: boolean;
}

export function getDateRange(preset: DateRangePreset): { start?: Date; end?: Date } {
  if (preset === 'all') return {};
  const end = new Date();
  const start = new Date();
  if (preset === '7d') start.setDate(end.getDate() - 6);
  if (preset === '30d') start.setDate(end.getDate() - 29);
  // normalize to midnight for consistency
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return { start, end };
}

function withinRange(dateCol: any, start?: Date, end?: Date) {
  if (start && end) return and(gte(dateCol, start.toISOString()), lte(dateCol, end.toISOString()));
  if (start) return gte(dateCol, start.toISOString());
  if (end) return lte(dateCol, end.toISOString());
  return undefined as any;
}

// Fetch workouts with per-session volume (sum of weight*reps across sets)
export async function getVolumeBySession(range: DateRangePreset): Promise<VolumePoint[]> {
  const { start, end } = getDateRange(range);
  const we = schema.workout_exercises;
  const s = schema.sets;
  const w = schema.workouts;

  const where = withinRange(w.date, start, end);

  let query = db
    .select({
      workoutId: w.id,
      date: w.date,
      volume: sql<number>`SUM(${s.weight} * ${s.reps})`,
    })
    .from(s)
    .innerJoin(we, eq(s.workout_exercise_id, we.id))
    .innerJoin(w, eq(we.workout_id, w.id))
    .groupBy(w.id, w.date)
    .orderBy(asc(w.date));

  if (where) {
    // @ts-expect-error drizzle typing for conditional where
    query = query.where(where);
  }

  const rows = await query;

  return rows.map(r => ({ date: new Date(r.date as unknown as string), value: (r as any).volume || 0 }));
}

// Group per week in TS to avoid SQLite week quirks, fill gaps with 0
export async function getVolumeByWeek(range: DateRangePreset): Promise<VolumePoint[]> {
  const sessions = await getVolumeBySession(range);
  const map = new Map<string, number>();
  for (const p of sessions) {
    const keyDate = startOfISOWeek(p.date);
    const key = keyDate.toISOString().slice(0,10);
    map.set(key, (map.get(key) || 0) + p.value);
  }
  const weeks = fillWeeklyGaps(map);
  return weeks.map(d => ({ date: d.date, value: d.value }));
}

export async function getWorkoutFrequencyByWeek(range: DateRangePreset): Promise<CountPoint[]> {
  const sessions = await getSessions(range);
  const map = new Map<string, number>();
  for (const d of sessions) {
    const keyDate = startOfISOWeek(d);
    const key = keyDate.toISOString().slice(0,10);
    map.set(key, (map.get(key) || 0) + 1);
  }
  const weeks = fillWeeklyGaps(map);
  return weeks.map(d => ({ date: d.date, value: d.value }));
}

async function getSessions(range: DateRangePreset): Promise<Date[]> {
  const { start, end } = getDateRange(range);
  const w = schema.workouts;
  const where = withinRange(w.date, start, end);
  let query = db.select({ date: w.date }).from(w).orderBy(asc(w.date));
  if (where) {
    // @ts-expect-error drizzle typing for conditional where
    query = query.where(where);
  }
  const rows = await query;
  return rows.map(r => new Date((r as any).date));
}

export async function getDistinctExercises(): Promise<string[]> {
  const we = schema.workout_exercises;
  const ex = schema.exercises;
  const rows = await db
    .select({ name: ex.name })
    .from(we)
    .innerJoin(ex, eq(we.exercise_id, ex.id))
    .groupBy(ex.name)
    .orderBy(asc(ex.name));
  return rows.map(r => (r as any).name).filter(Boolean);
}

export async function getPRBaseRows(exerciseName: string, range: DateRangePreset): Promise<SeriesPoint[]> {
  const { start, end } = getDateRange(range);
  const w = schema.workouts;
  const we = schema.workout_exercises;
  const ex = schema.exercises;
  const s = schema.sets;

  const whereParts: any[] = [eq(ex.name, exerciseName)];
  const dateCond = withinRange(w.date, start, end);
  if (dateCond) whereParts.push(dateCond);

  let query = db
    .select({
      date: w.date,
      maxWeight: sql<number>`MAX(${s.weight})`,
    })
    .from(s)
    .innerJoin(we, eq(s.workout_exercise_id, we.id))
    .innerJoin(w, eq(we.workout_id, w.id))
    .innerJoin(ex, eq(we.exercise_id, ex.id))
    .groupBy(w.id, w.date)
    .orderBy(asc(w.date));

  if (whereParts.length > 0) {
    const cond = whereParts.length > 1 ? and(...whereParts) : whereParts[0];
    // @ts-expect-error drizzle typing for conditional where
    query = query.where(cond);
  }

  const rows = await query;

  return rows.map(r => ({ date: new Date((r as any).date), value: (r as any).maxWeight ?? 0 }));
}

export function buildPRSeries(points: SeriesPoint[]): PRPoint[] {
  let maxSoFar = -Infinity;
  return points.map(p => {
    if (p.value > maxSoFar) {
      maxSoFar = p.value;
      return { ...p, value: maxSoFar, isNewPR: true };
    }
    return { ...p, value: maxSoFar, isNewPR: false };
  });
}

export async function getEstimated1RMBaseRows(exerciseName: string, range: DateRangePreset): Promise<SeriesPoint[]> {
  const { start, end } = getDateRange(range);
  const w = schema.workouts;
  const we = schema.workout_exercises;
  const ex = schema.exercises;
  const s = schema.sets;

  const whereParts: any[] = [eq(ex.name, exerciseName)];
  const dateCond = withinRange(w.date, start, end);
  if (dateCond) whereParts.push(dateCond);

  let query = db
    .select({
      date: w.date,
      maxE1RM: sql<number>`MAX(${s.weight} * (1 + (${s.reps} / 30.0)))`,
    })
    .from(s)
    .innerJoin(we, eq(s.workout_exercise_id, we.id))
    .innerJoin(w, eq(we.workout_id, w.id))
    .innerJoin(ex, eq(we.exercise_id, ex.id))
    .groupBy(w.id, w.date)
    .orderBy(asc(w.date));

  if (whereParts.length > 0) {
    const cond = whereParts.length > 1 ? and(...whereParts) : whereParts[0];
    // @ts-expect-error drizzle typing for conditional where
    query = query.where(cond);
  }

  const rows = await query;

  return rows.map(r => ({ date: new Date((r as any).date), value: (r as any).maxE1RM ?? 0 }));
}

export function buildEstimated1RMSeries(points: SeriesPoint[]): PeakPoint[] {
  let maxSoFar = -Infinity;
  return points.map(p => {
    if (p.value > maxSoFar) {
      maxSoFar = p.value;
      return { ...p, isPeak: true };
    }
    return { ...p, isPeak: false };
  });
}

export function rollingAverage(points: SeriesPoint[], window = 4): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let sum = 0;
  const q: number[] = [];
  for (let i = 0; i < points.length; i++) {
    sum += points[i].value;
    q.push(points[i].value);
    if (q.length > window) sum -= q.shift()!;
    out.push({ date: points[i].date, value: sum / q.length });
  }
  return out;
}

export function downsampleLTTB(points: SeriesPoint[], threshold = 300): SeriesPoint[] {
  if (points.length <= threshold) return points;
  // Simple fallback: pick every Nth point; can be replaced with true LTTB later
  const step = Math.ceil(points.length / threshold);
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  if (points[points.length - 1] !== out[out.length - 1]) out.push(points[points.length - 1]);
  return out;
}

function startOfISOWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0=Mon ... 6=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}

function fillWeeklyGaps(map: Map<string, number>): { date: Date; value: number }[] {
  if (map.size === 0) return [];
  const keys = Array.from(map.keys()).sort();
  const first = new Date(keys[0]);
  const last = new Date(keys[keys.length - 1]);
  const out: { date: Date; value: number }[] = [];
  const cursor = startOfISOWeek(first);
  const end = startOfISOWeek(last);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0,10);
    out.push({ date: new Date(cursor), value: map.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}
