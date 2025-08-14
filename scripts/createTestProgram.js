const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'app.db');
const db = new Database(dbPath);

console.log('Checking existing programs...');

// Check existing programs
const programs = db.prepare('SELECT * FROM user_programs').all();
console.log('Existing programs:', programs);

const activePrograms = db.prepare('SELECT * FROM user_programs WHERE is_active = 1').all();
console.log('Active programs:', activePrograms);

// If no active program, create a test program
if (activePrograms.length === 0) {
  console.log('Creating test program...');
  
  // Create test program
  const insertProgram = db.prepare(`
    INSERT INTO user_programs (name, description, duration_weeks, current_week, current_day, is_active, start_date, completion_percentage, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const programId = insertProgram.run(
    'PUSH/PULL/LEGS',
    'Classic 3-day split program',
    8, // 8 weeks total
    3, // currently in week 3
    1, // current day
    1, // active
    new Date().toISOString(),
    63, // 63% complete (to match screenshot)
    new Date().toISOString()
  ).lastInsertRowid;
  
  console.log('Created program with ID:', programId);
  
  // Create program days
  const insertDay = db.prepare(`
    INSERT INTO program_days (program_id, day_name, day_order, is_rest_day, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const days = [
    { name: 'MONDAY', order: 1, isRest: 0 },    // Push Day
    { name: 'TUESDAY', order: 2, isRest: 1 },   // Rest
    { name: 'WEDNESDAY', order: 3, isRest: 0 }, // Pull Day  
    { name: 'THURSDAY', order: 4, isRest: 1 },  // Rest
    { name: 'FRIDAY', order: 5, isRest: 0 },    // Legs Day
    { name: 'SATURDAY', order: 6, isRest: 1 },  // Rest
    { name: 'SUNDAY', order: 7, isRest: 1 },    // Rest
  ];
  
  days.forEach(day => {
    insertDay.run(programId, day.name, day.order, day.isRest, new Date().toISOString());
  });
  
  console.log('Created program days');
  
  // Create workout templates for non-rest days
  const insertTemplate = db.prepare(`
    INSERT INTO workout_templates (name, description, category, estimated_duration, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const workoutTypes = [
    { day: 'MONDAY', name: 'PUSH/PULL/LEGS - Push Day', desc: 'Chest, Shoulders, Triceps' },
    { day: 'WEDNESDAY', name: 'PUSH/PULL/LEGS - Pull Day', desc: 'Back, Biceps' },
    { day: 'FRIDAY', name: 'PUSH/PULL/LEGS - Legs Day', desc: 'Quads, Hamstrings, Glutes, Calves' },
  ];
  
  workoutTypes.forEach(workout => {
    const templateId = insertTemplate.run(
      workout.name,
      workout.desc,
      'strength',
      90,
      new Date().toISOString()
    ).lastInsertRowid;
    
    // Link template to program day
    const updateDay = db.prepare('UPDATE program_days SET template_id = ? WHERE program_id = ? AND day_name = ?');
    updateDay.run(templateId, programId, workout.day);
    
    console.log(`Created template for ${workout.day}: ${workout.name}`);
  });
  
  // Create some completed workouts to show progress
  const insertWorkout = db.prepare(`
    INSERT INTO workouts (name, date, duration, program_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Create 15 completed workouts to achieve 63% progress (15/24 = 62.5% ≈ 63%)
  const workoutNames = ['Push Day', 'Pull Day', 'Legs Day'];
  const workoutDurations = [5400, 5100, 5700]; // 90, 85, 95 minutes in seconds
  const completedWorkouts = [];
  
  // Generate 15 workouts going back in time
  for (let i = 0; i < 15; i++) {
    const workoutIndex = i % 3;
    const daysAgo = 2 + (i * 2.5); // Start 2 days ago, space them every 2.5 days on average
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    completedWorkouts.push({
      name: workoutNames[workoutIndex],
      date: dateString,
      duration: workoutDurations[workoutIndex]
    });
  }
  
  completedWorkouts.forEach(workout => {
    insertWorkout.run(
      workout.name,
      workout.date + 'T18:00:00.000Z',
      workout.duration,
      programId,
      new Date().toISOString()
    );
  });
  
  console.log('Created completed workouts for progress tracking');
  
  // Update last workout date
  const updateLastWorkout = db.prepare('UPDATE user_programs SET last_workout_date = ? WHERE id = ?');
  updateLastWorkout.run('2025-08-12T18:00:00.000Z', programId); // 2 days ago
  
  console.log('Test program setup complete!');
}

// Final check
const finalPrograms = db.prepare('SELECT * FROM user_programs WHERE is_active = 1').all();
console.log('Final active programs:', finalPrograms);

const programDays = db.prepare('SELECT * FROM program_days WHERE program_id = ?').all(finalPrograms[0]?.id);
console.log('Program days:', programDays);

const completedWorkouts = db.prepare('SELECT * FROM workouts WHERE program_id = ? ORDER BY date DESC').all(finalPrograms[0]?.id);
console.log('Completed workouts:', completedWorkouts);

db.close();
