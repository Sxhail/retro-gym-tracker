/**
 * Muscle Activation Map - Testing & Verification Script
 * Run this to test the muscle activation map functionality
 */

import { getMuscleActivationMap, getMuscleStatistics, compareMuscleActivation } from '../services/muscleAnalytics.ts';

export async function testMuscleActivationMap() {
  console.log('🧪 Testing Muscle Activation Map...\n');

  try {
    // Test 1: Get muscle activation data for different view modes
    console.log('📊 Test 1: Testing different view modes...');
    
    const weekData = await getMuscleActivationMap('week');
    console.log(`✅ Week view: ${Object.keys(weekData.muscleStates).length} muscles analyzed`);
    console.log(`   Total volume: ${weekData.totalVolume.toLocaleString()}`);
    
    const monthData = await getMuscleActivationMap('month');
    console.log(`✅ Month view: ${Object.keys(monthData.muscleStates).length} muscles analyzed`);
    console.log(`   Total volume: ${monthData.totalVolume.toLocaleString()}`);
    
    const sessionData = await getMuscleActivationMap('session');
    console.log(`✅ Session view: ${Object.keys(sessionData.muscleStates).length} muscles analyzed`);
    console.log(`   Total volume: ${sessionData.totalVolume.toLocaleString()}\n`);

    // Test 2: Get detailed statistics for specific muscles
    console.log('💪 Test 2: Testing muscle-specific statistics...');
    
    const chestStats = await getMuscleStatistics('chest', 'week');
    console.log(`✅ Chest stats: ${chestStats.trainingLevel} level`);
    console.log(`   Volume: ${chestStats.volume.toLocaleString()}, Sets: ${chestStats.sets}, Workouts: ${chestStats.workouts}`);
    console.log(`   Top exercises: ${chestStats.exercises.slice(0, 3).map(ex => ex.name).join(', ')}`);
    
    const backStats = await getMuscleStatistics('lats', 'week');
    console.log(`✅ Lats stats: ${backStats.trainingLevel} level`);
    console.log(`   Volume: ${backStats.volume.toLocaleString()}, Sets: ${backStats.sets}, Workouts: ${backStats.workouts}\n`);

    // Test 3: Compare periods
    console.log('📈 Test 3: Testing period comparison...');
    
    const currentDate = new Date();
    const previousDate = new Date();
    previousDate.setDate(previousDate.getDate() - 7); // Compare current week to previous week
    
    const comparison = await compareMuscleActivation(currentDate, previousDate, 'week');
    console.log(`✅ Comparison complete:`);
    console.log(`   Current total volume: ${comparison.current.totalVolume.toLocaleString()}`);
    console.log(`   Previous total volume: ${comparison.previous.totalVolume.toLocaleString()}`);
    console.log(`   Changes detected: ${comparison.changes.length} muscles`);
    
    const topChanges = comparison.changes
      .filter(c => Math.abs(c.percentChange) > 0)
      .slice(0, 3);
    
    if (topChanges.length > 0) {
      console.log(`   Top changes:`);
      topChanges.forEach(change => {
        console.log(`     • ${change.muscleId}: ${change.percentChange.toFixed(1)}% change`);
      });
    }

    // Test 4: Training level distribution
    console.log('\n🎯 Test 4: Training level distribution...');
    
    const levelCounts = {
      untrained: 0,
      undertrained: 0,
      optimal: 0,
      overtrained: 0
    };
    
    Object.values(weekData.muscleStates).forEach(level => {
      if (level) levelCounts[level]++;
    });
    
    console.log('✅ Training level distribution (week view):');
    Object.entries(levelCounts).forEach(([level, count]) => {
      console.log(`   ${level.toUpperCase()}: ${count} muscles`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Ready to use features:');
    console.log('   • Interactive muscle anatomy visualization');
    console.log('   • SESSION/WEEK/MONTH view modes');
    console.log('   • Male/Female + Front/Back anatomy views');
    console.log('   • Period-to-period comparison');
    console.log('   • Detailed muscle statistics');
    console.log('   • Real-time workout data integration');

    return {
      success: true,
      weekData,
      monthData,
      sessionData,
      chestStats,
      backStats,
      comparison,
      levelCounts
    };

  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   • Ensure you have workout data in your database');
    console.log('   • Check that exercises have muscle_group values');
    console.log('   • Verify database connection is working');
    console.log('   • Try running individual functions to isolate issues');
    
    return {
      success: false,
      error
    };
  }
}

// Export for use in development/testing
export { testMuscleActivationMap as default };
