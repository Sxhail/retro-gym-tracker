import { openDatabaseSync } from 'expo-sqlite';

console.log('Checking database schema...');

try {
  const db = openDatabaseSync('app.db');
  
  // Check if migrations table exists
  console.log('\n=== Checking for migrations table ===');
  try {
    const migrations = db.getAllSync("SELECT * FROM __drizzle_migrations");
    console.log('✅ Migrations table exists');
    console.log('Applied migrations:', migrations.map(m => m.tag || m.name));
  } catch (error) {
    console.log('❌ No migrations table found - migrations have not been applied');
  }
  
  // List all tables
  console.log('\n=== Current tables in database ===');
  const tables = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  tables.forEach(table => {
    console.log(`📄 ${table.name}`);
  });
  
  // Check specific tables from our schema
  console.log('\n=== Checking expected tables ===');
  const expectedTables = ['exercises', 'workouts', 'workout_exercises', 'sets', 'workout_templates', 'template_exercises', 'template_sets'];
  
  for (const tableName of expectedTables) {
    try {
      const result = db.getFirstSync(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
      if (result) {
        console.log(`✅ ${tableName} exists`);
      } else {
        console.log(`❌ ${tableName} missing`);
      }
    } catch (error) {
      console.log(`❌ ${tableName} error: ${error.message}`);
    }
  }
  
  db.closeSync();
  console.log('\n✅ Database check complete');
  
} catch (error) {
  console.error('Error checking database:', error);
}
