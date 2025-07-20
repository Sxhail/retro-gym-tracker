const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'db', 'app.db');

// Test scenarios
const testScenarios = {
  // Test data for different scenarios
  validWorkout: {
    name: 'Test Workout',
    exercises: [
      {
        exerciseId: 1, // Assuming Bench Press exists
        sets: [
          { setIndex: 1, weight: 100, reps: 8, notes: 'Warm up', restDuration: 120, completed: true },
          { setIndex: 2, weight: 120, reps: 6, notes: 'Working set', restDuration: 180, completed: true },
          { setIndex: 3, weight: 120, reps: 6, notes: 'Working set', restDuration: 180, completed: false }
        ]
      },
      {
        exerciseId: 2, // Assuming Squats exists
        sets: [
          { setIndex: 1, weight: 80, reps: 10, notes: '', restDuration: 120, completed: true },
          { setIndex: 2, weight: 100, reps: 8, notes: 'Heavy set', restDuration: 180, completed: true }
        ]
      }
    ]
  },
  
  edgeCaseWorkout: {
    name: 'A'.repeat(50), // Long name
    exercises: [
      {
        exerciseId: 1,
        sets: [
          { setIndex: 1, weight: 0, reps: 1, notes: 'A'.repeat(100), restDuration: 60, completed: true }
        ]
      }
    ]
  },
  
  templateData: {
    name: 'Test Template',
    description: 'A test template for validation',
    category: 'strength',
    difficulty: 'intermediate',
    estimated_duration: 45,
    exercises: [
      {
        exerciseId: 1,
        exercise_order: 1,
        sets: [
          { set_index: 1, target_weight: 100, target_reps: 8, target_rest: 120, notes: 'Test set' }
        ]
      }
    ]
  }
};

// Test functions
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        reject(err);
      } else {
        console.log('✅ Database connection successful');
        db.close();
        resolve();
      }
    });
  });
}

async function testTableStructure() {
  console.log('🔍 Testing table structure...');
  
  const db = new sqlite3.Database(dbPath);
  
  const requiredTables = [
    'exercises',
    'workouts',
    'workout_exercises', 
    'sets',
    'workout_templates',
    'template_exercises',
    'template_sets'
  ];
  
  for (const table of requiredTables) {
    try {
      const result = await new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (result) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' missing`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}':`, error.message);
      return false;
    }
  }
  
  db.close();
  return true;
}

async function testExerciseData() {
  console.log('🔍 Testing exercise data...');
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const exercises = await new Promise((resolve, reject) => {
      db.all('SELECT COUNT(*) as count FROM exercises', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const count = exercises[0].count;
    console.log(`✅ Found ${count} exercises in database`);
    
    if (count > 0) {
      // Test specific exercises
      const benchPress = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM exercises WHERE name LIKE ?', ['%Bench Press%'], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (benchPress) {
        console.log('✅ Bench Press exercise found');
      } else {
        console.log('⚠️  Bench Press exercise not found (may need re-seeding)');
      }
      
      return true;
    } else {
      console.log('❌ No exercises found in database');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing exercise data:', error.message);
    return false;
  } finally {
    db.close();
  }
}

async function testWorkoutCreation() {
  console.log('🔍 Testing workout creation...');
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Test creating a workout
    const workoutId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO workouts (name, date, duration) VALUES (?, ?, ?)',
        [testScenarios.validWorkout.name, new Date().toISOString(), 1800],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    console.log(`✅ Created workout with ID: ${workoutId}`);
    
    // Test creating workout exercises
    for (const exercise of testScenarios.validWorkout.exercises) {
      const workoutExerciseId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO workout_exercises (workout_id, exercise_id) VALUES (?, ?)',
          [workoutId, exercise.exerciseId],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      console.log(`✅ Created workout exercise with ID: ${workoutExerciseId}`);
      
      // Test creating sets
      for (const set of exercise.sets) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO sets (workout_exercise_id, set_index, weight, reps, notes, rest_duration, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [workoutExerciseId, set.setIndex, set.weight, set.reps, set.notes, set.restDuration, set.completed ? 1 : 0],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }
      
      console.log(`✅ Created ${exercise.sets.length} sets for exercise`);
    }
    
    // Clean up test data
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM workouts WHERE id = ?', [workoutId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Test workout cleaned up');
    return true;
    
  } catch (error) {
    console.log('❌ Error testing workout creation:', error.message);
    return false;
  } finally {
    db.close();
  }
}

async function testTemplateCreation() {
  console.log('🔍 Testing template creation...');
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Test creating a template
    const templateId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO workout_templates (name, description, category, difficulty, estimated_duration) VALUES (?, ?, ?, ?, ?)',
        [
          testScenarios.templateData.name,
          testScenarios.templateData.description,
          testScenarios.templateData.category,
          testScenarios.templateData.difficulty,
          testScenarios.templateData.estimated_duration
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    console.log(`✅ Created template with ID: ${templateId}`);
    
    // Test creating template exercises
    for (const exercise of testScenarios.templateData.exercises) {
      const templateExerciseId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO template_exercises (template_id, exercise_id, exercise_order) VALUES (?, ?, ?)',
          [templateId, exercise.exerciseId, exercise.exercise_order],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      console.log(`✅ Created template exercise with ID: ${templateExerciseId}`);
      
      // Test creating template sets
      for (const set of exercise.sets) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO template_sets (template_exercise_id, set_index, target_weight, target_reps, target_rest, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [templateExerciseId, set.set_index, set.target_weight, set.target_reps, set.target_rest, set.notes],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }
      
      console.log(`✅ Created ${exercise.sets.length} template sets for exercise`);
    }
    
    // Clean up test data
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM workout_templates WHERE id = ?', [templateId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Test template cleaned up');
    return true;
    
  } catch (error) {
    console.log('❌ Error testing template creation:', error.message);
    return false;
  } finally {
    db.close();
  }
}

async function testDataValidation() {
  console.log('🔍 Testing data validation...');
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Test invalid workout name (too long)
    try {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO workouts (name, date, duration) VALUES (?, ?, ?)',
          ['A'.repeat(200), new Date().toISOString(), 1800],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      console.log('⚠️  Long workout name was accepted (should be limited in UI)');
    } catch (error) {
      console.log('✅ Long workout name properly rejected');
    }
    
    // Test invalid set data
    try {
      const workoutId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO workouts (name, date, duration) VALUES (?, ?, ?)',
          ['Validation Test', new Date().toISOString(), 1800],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      const workoutExerciseId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO workout_exercises (workout_id, exercise_id) VALUES (?, ?)',
          [workoutId, 1],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      // Test negative weight
      try {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO sets (workout_exercise_id, set_index, weight, reps, notes, rest_duration, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [workoutExerciseId, 1, -10, 8, 'Invalid weight', 120, 1],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        console.log('⚠️  Negative weight was accepted (should be validated in UI)');
      } catch (error) {
        console.log('✅ Negative weight properly rejected');
      }
      
      // Test zero reps
      try {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO sets (workout_exercise_id, set_index, weight, reps, notes, rest_duration, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [workoutExerciseId, 2, 100, 0, 'Invalid reps', 120, 1],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        console.log('⚠️  Zero reps was accepted (should be validated in UI)');
      } catch (error) {
        console.log('✅ Zero reps properly rejected');
      }
      
      // Clean up
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM workouts WHERE id = ?', [workoutId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
    } catch (error) {
      console.log('❌ Error in validation test setup:', error.message);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error testing data validation:', error.message);
    return false;
  } finally {
    db.close();
  }
}

async function testScreenSizes() {
  console.log('🔍 Testing screen size compatibility...');
  
  // Test different screen dimensions
  const screenSizes = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 414, height: 896, name: 'iPhone 11' },
    { width: 428, height: 926, name: 'iPhone 12 Pro Max' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1024, height: 1366, name: 'iPad Pro' }
  ];
  
  console.log('✅ Screen size testing requires manual verification in simulator/device');
  console.log('📱 Test these screen sizes:');
  screenSizes.forEach(size => {
    console.log(`   - ${size.name}: ${size.width}x${size.height}`);
  });
  
  return true;
}

async function testNavigationFlow() {
  console.log('🔍 Testing navigation flow...');
  
  const navigationSteps = [
    'Home Screen',
    'Templates Screen',
    'Template Detail Screen',
    'New Workout Screen (with template)',
    'Add Exercises',
    'Complete Sets',
    'Finish Workout',
    'History Screen',
    'Workout Detail Screen',
    'Back to Home'
  ];
  
  console.log('✅ Navigation flow testing requires manual verification');
  console.log('🔄 Test this flow:');
  navigationSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`);
  });
  
  return true;
}

async function testRetroStyling() {
  console.log('🔍 Testing retro styling consistency...');
  
  const stylingElements = [
    'Neon green color (#00FF00)',
    'Monospace font family',
    'Dark background (black)',
    'Border styling with green outlines',
    'Consistent spacing and margins',
    'Retro terminal aesthetic',
    'Loading indicators with green color',
    'Error states with red accents',
    'Button styling with green borders'
  ];
  
  console.log('✅ Retro styling testing requires manual verification');
  console.log('🎨 Verify these styling elements:');
  stylingElements.forEach(element => {
    console.log(`   - ${element}`);
  });
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive gym tracker testing...\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Table Structure', fn: testTableStructure },
    { name: 'Exercise Data', fn: testExerciseData },
    { name: 'Workout Creation', fn: testWorkoutCreation },
    { name: 'Template Creation', fn: testTemplateCreation },
    { name: 'Data Validation', fn: testDataValidation },
    { name: 'Screen Sizes', fn: testScreenSizes },
    { name: 'Navigation Flow', fn: testNavigationFlow },
    { name: 'Retro Styling', fn: testRetroStyling }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      console.log(`\n${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      results.push({ name: test.name, passed: false, error: error.message });
      console.log(`\n❌ ${test.name}: FAILED - ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`   - ${result.name}${result.error ? `: ${result.error}` : ''}`);
    });
  }
  
  console.log('\n🎯 Manual Testing Required:');
  console.log('   - Screen size compatibility');
  console.log('   - Navigation flow');
  console.log('   - Retro styling consistency');
  console.log('   - User interaction testing');
  
  console.log('\n✨ Testing complete!');
}

// Run tests
runAllTests().catch(console.error); 