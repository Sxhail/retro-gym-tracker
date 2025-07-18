import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import exerciseList from './exercises.json';

export const expoDb = openDatabaseSync('app.db', { enableChangeListener: true });
export const db = drizzle(expoDb, { schema }); 