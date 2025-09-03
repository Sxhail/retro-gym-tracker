const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const sqlite = new Database('./db/app.db');

// Check muscle groups in database
const result = sqlite.prepare(`
  SELECT name, muscle_group 
  FROM exercises 
  WHERE muscle_group IS NOT NULL 
  ORDER BY muscle_group
`).all();

console.log('All exercises with muscle groups:');
result.forEach(row => {
  console.log(`- ${row.name} -> "${row.muscle_group}"`);
});

console.log('\nUnique muscle groups:');
const unique = [...new Set(result.map(r => r.muscle_group))];
unique.forEach(group => console.log(`- "${group}"`));

sqlite.close();
