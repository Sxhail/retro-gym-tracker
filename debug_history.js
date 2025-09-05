// Simple test to check getWorkoutHistory function
const { getWorkoutHistory } = require('./services/workoutHistory.ts');

async function testGetWorkoutHistory() {
  try {
    console.log('Testing getWorkoutHistory...');
    const result = await getWorkoutHistory(5, 0);
    console.log('Success! Found', result.length, 'workouts');
    console.log('First workout:', result[0]);
  } catch (error) {
    console.error('Error in getWorkoutHistory:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

testGetWorkoutHistory();
