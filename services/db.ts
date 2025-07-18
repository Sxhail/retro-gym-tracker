import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_group: string;
  is_custom: number;
  created_at: string;
}

const DB_NAME = 'app.db';
const DB_ASSET = require('../db/app.db');
const DB_TARGET_PATH = FileSystem.documentDirectory + DB_NAME;

async function ensureDbCopied() {
  const fileInfo = await FileSystem.getInfoAsync(DB_TARGET_PATH);
  if (!fileInfo.exists) {
    const asset = Asset.fromModule(DB_ASSET);
    await asset.downloadAsync();
    await FileSystem.copyAsync({ from: asset.localUri!, to: DB_TARGET_PATH });
  }
}

export async function getDb() {
  await ensureDbCopied();
  return await SQLite.openDatabaseAsync(DB_TARGET_PATH);
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM exercises ORDER BY name ASC');
}

export async function searchExercisesByName(name: string): Promise<Exercise[]> {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC', [`%${name}%`]);
}

export async function filterExercises(category?: string, muscle_group?: string): Promise<Exercise[]> {
  const db = await getDb();
  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params: string[] = [];
  if (category && category !== 'Any') {
    query += ' AND category LIKE ?';
    params.push(`%${category}%`);
  }
  if (muscle_group && muscle_group !== 'Any') {
    query += ' AND muscle_group LIKE ?';
    params.push(`%${muscle_group}%`);
  }
  query += ' ORDER BY name ASC';
  return await db.getAllAsync(query, params);
}

export async function insertCustomExercise(name: string, category: string, muscle_group: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO exercises (name, category, muscle_group, is_custom) VALUES (?, ?, ?, 1)',
    name, category, muscle_group
  );
  return result.lastInsertRowId as number;
}
