import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  dialect: 'sqlite',
  driver: 'expo',
  out: './drizzle/migrations',
}); 