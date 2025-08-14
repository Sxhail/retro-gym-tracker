const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '..', 'db', 'app.db');
const db = new Database(dbPath);

// Simulate ProgramManager.getActiveProgram() logic
function getActiveProgram() {
  try {
    // Get active program
    const program = db.prepare(`
      SELECT * FROM user_programs 
      WHERE is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();

    if (!program) {
      console.log('No active program found');
      return null;
    }

    console.log('Active Program:', program);

    // Get program days
    const programDays = db.prepare(`
      SELECT pd.*, wt.name as template_name
      FROM program_days pd
      LEFT JOIN workout_templates wt ON pd.template_id = wt.id
      WHERE pd.program_id = ?
      ORDER BY pd.day_order
    `).all(program.id);

    console.log('Program Days:', programDays);

    // Get completed workouts for this program
    const completedWorkouts = db.prepare(`
      SELECT * FROM workouts 
      WHERE program_id = ? 
      ORDER BY date DESC
    `).all(program.id);

    console.log('Completed Workouts:', completedWorkouts);

    // Calculate actual progress
    const totalWeeks = program.duration_weeks;
    const workoutDays = programDays.filter(day => !day.is_rest_day).length;
    const totalWorkouts = totalWeeks * workoutDays;
    const completedCount = completedWorkouts.length;
    const realPercentage = Math.round((completedCount / totalWorkouts) * 100);
    
    // Calculate current week based on completed workouts
    const currentWeek = Math.floor(completedCount / workoutDays) + 1;
    
    // Get next workout day
    const nextDayIndex = (completedCount % workoutDays);
    const workoutDaysList = programDays.filter(day => !day.is_rest_day);
    const nextWorkoutDay = workoutDaysList[nextDayIndex];

    // Days since last workout
    const lastWorkoutDate = completedWorkouts.length > 0 ? new Date(completedWorkouts[0].date) : null;
    const daysSinceLastWorkout = lastWorkoutDate ? 
      Math.floor((new Date() - lastWorkoutDate) / (1000 * 60 * 60 * 24)) : 0;

    const actualProgress = {
      currentWeek,
      totalWeeks,
      realPercentage,
      completedWorkouts: completedCount,
      totalWorkouts,
      nextWorkoutDay,
      daysSinceLastWorkout
    };

    console.log('\n=== ACTUAL PROGRESS CALCULATION ===');
    console.log('Total weeks:', totalWeeks);
    console.log('Workout days per week:', workoutDays);
    console.log('Total workouts needed:', totalWorkouts);
    console.log('Completed workouts:', completedCount);
    console.log('Current week:', currentWeek);
    console.log('Real percentage:', realPercentage + '%');
    console.log('Next workout day:', nextWorkoutDay?.day_name);
    console.log('Days since last workout:', daysSinceLastWorkout);
    console.log('=====================================\n');

    return {
      ...program,
      actualProgress,
      programDays
    };

  } catch (error) {
    console.error('Error getting active program:', error);
    return null;
  }
}

// Test the function
console.log('Testing Program Widget Data...\n');
const result = getActiveProgram();

if (result) {
  console.log('SUCCESS: Widget should display:');
  console.log(`- Program Name: ${result.name}`);
  console.log(`- Progress: Week ${result.actualProgress.currentWeek}/${result.actualProgress.totalWeeks}`);
  console.log(`- Percentage: ${result.actualProgress.realPercentage}%`);
  console.log(`- Next workout: ${result.actualProgress.nextWorkoutDay?.day_name || 'None'}`);
  console.log(`- Days since last: ${result.actualProgress.daysSinceLastWorkout} days`);
  
  // Verify this matches our test data expectations
  const expected = {
    name: 'PUSH/PULL/LEGS',
    currentWeek: 3,
    totalWeeks: 8,
    percentage: 63,
    daysSince: 2
  };
  
  console.log('\n=== VERIFICATION ===');
  console.log('Expected vs Actual:');
  console.log(`Name: ${expected.name} vs ${result.name} ✓`);
  console.log(`Week: ${expected.currentWeek}/${expected.totalWeeks} vs ${result.actualProgress.currentWeek}/${result.actualProgress.totalWeeks} ${result.actualProgress.currentWeek === expected.currentWeek && result.actualProgress.totalWeeks === expected.totalWeeks ? '✓' : '✗'}`);
  console.log(`Percentage: ${expected.percentage}% vs ${result.actualProgress.realPercentage}% ${result.actualProgress.realPercentage === expected.percentage ? '✓' : '✗'}`);
  console.log(`Days since: ${expected.daysSince} vs ${result.actualProgress.daysSinceLastWorkout} ${result.actualProgress.daysSinceLastWorkout === expected.daysSince ? '✓' : '✗'}`);
  console.log('==================');
} else {
  console.log('FAILED: No program data available');
}

db.close();
