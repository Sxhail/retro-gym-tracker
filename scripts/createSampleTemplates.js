const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'db', 'app.db');

// Sample templates data
const sampleTemplates = [
  {
    name: 'Push Day',
    description: 'Classic push workout focusing on chest, shoulders, and triceps',
    category: 'strength',
    estimated_duration: 60,
    exercises: [
      {
        exercise_name: 'Bench Press',
        exercise_order: 1,
        sets: [
          { set_index: 1, target_weight: 80, target_reps: 8, target_rest: 180, notes: 'Warm up set' },
          { set_index: 2, target_weight: 100, target_reps: 6, target_rest: 180, notes: 'Working set' },
          { set_index: 3, target_weight: 100, target_reps: 6, target_rest: 180, notes: 'Working set' },
          { set_index: 4, target_weight: 90, target_reps: 8, target_rest: 180, notes: 'Drop set' },
        ]
      },
      {
        exercise_name: 'Overhead Press',
        exercise_order: 2,
        sets: [
          { set_index: 1, target_weight: 50, target_reps: 8, target_rest: 120, notes: '' },
          { set_index: 2, target_weight: 60, target_reps: 6, target_rest: 120, notes: '' },
          { set_index: 3, target_weight: 60, target_reps: 6, target_rest: 120, notes: '' },
        ]
      },
      {
        exercise_name: 'Incline Dumbbell Press',
        exercise_order: 3,
        sets: [
          { set_index: 1, target_weight: 30, target_reps: 10, target_rest: 120, notes: 'Each arm' },
          { set_index: 2, target_weight: 35, target_reps: 8, target_rest: 120, notes: 'Each arm' },
          { set_index: 3, target_weight: 35, target_reps: 8, target_rest: 120, notes: 'Each arm' },
        ]
      },
      {
        exercise_name: 'Tricep Dips',
        exercise_order: 4,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 12, target_rest: 90, notes: 'Body weight' },
          { set_index: 2, target_weight: 0, target_reps: 12, target_rest: 90, notes: 'Body weight' },
          { set_index: 3, target_weight: 0, target_reps: 10, target_rest: 90, notes: 'Body weight' },
        ]
      }
    ]
  },
  {
    name: 'Pull Day',
    description: 'Back and biceps focused workout',
    category: 'strength',
    estimated_duration: 55,
    exercises: [
      {
        exercise_name: 'Deadlift',
        exercise_order: 1,
        sets: [
          { set_index: 1, target_weight: 100, target_reps: 5, target_rest: 240, notes: 'Warm up' },
          { set_index: 2, target_weight: 140, target_reps: 5, target_rest: 240, notes: 'Working set' },
          { set_index: 3, target_weight: 140, target_reps: 5, target_rest: 240, notes: 'Working set' },
        ]
      },
      {
        exercise_name: 'Pull-ups',
        exercise_order: 2,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 8, target_rest: 120, notes: 'Body weight' },
          { set_index: 2, target_weight: 0, target_reps: 8, target_rest: 120, notes: 'Body weight' },
          { set_index: 3, target_weight: 0, target_reps: 6, target_rest: 120, notes: 'Body weight' },
        ]
      },
      {
        exercise_name: 'Barbell Rows',
        exercise_order: 3,
        sets: [
          { set_index: 1, target_weight: 60, target_reps: 10, target_rest: 120, notes: '' },
          { set_index: 2, target_weight: 70, target_reps: 8, target_rest: 120, notes: '' },
          { set_index: 3, target_weight: 70, target_reps: 8, target_rest: 120, notes: '' },
        ]
      },
      {
        exercise_name: 'Bicep Curls',
        exercise_order: 4,
        sets: [
          { set_index: 1, target_weight: 20, target_reps: 12, target_rest: 90, notes: 'Each arm' },
          { set_index: 2, target_weight: 22, target_reps: 10, target_rest: 90, notes: 'Each arm' },
          { set_index: 3, target_weight: 22, target_reps: 10, target_rest: 90, notes: 'Each arm' },
        ]
      }
    ]
  },
  {
    name: 'Leg Day',
    description: 'Comprehensive lower body workout',
    category: 'strength',
    estimated_duration: 70,
    exercises: [
      {
        exercise_name: 'Squats',
        exercise_order: 1,
        sets: [
          { set_index: 1, target_weight: 80, target_reps: 8, target_rest: 180, notes: 'Warm up' },
          { set_index: 2, target_weight: 120, target_reps: 6, target_rest: 180, notes: 'Working set' },
          { set_index: 3, target_weight: 120, target_reps: 6, target_rest: 180, notes: 'Working set' },
          { set_index: 4, target_weight: 110, target_reps: 8, target_rest: 180, notes: 'Drop set' },
        ]
      },
      {
        exercise_name: 'Romanian Deadlift',
        exercise_order: 2,
        sets: [
          { set_index: 1, target_weight: 80, target_reps: 8, target_rest: 150, notes: '' },
          { set_index: 2, target_weight: 100, target_reps: 6, target_rest: 150, notes: '' },
          { set_index: 3, target_weight: 100, target_reps: 6, target_rest: 150, notes: '' },
        ]
      },
      {
        exercise_name: 'Leg Press',
        exercise_order: 3,
        sets: [
          { set_index: 1, target_weight: 150, target_reps: 12, target_rest: 120, notes: '' },
          { set_index: 2, target_weight: 180, target_reps: 10, target_rest: 120, notes: '' },
          { set_index: 3, target_weight: 180, target_reps: 10, target_rest: 120, notes: '' },
        ]
      },
      {
        exercise_name: 'Calf Raises',
        exercise_order: 4,
        sets: [
          { set_index: 1, target_weight: 50, target_reps: 15, target_rest: 90, notes: '' },
          { set_index: 2, target_weight: 50, target_reps: 15, target_rest: 90, notes: '' },
          { set_index: 3, target_weight: 50, target_reps: 15, target_rest: 90, notes: '' },
        ]
      }
    ]
  },
  {
    name: 'Cardio HIIT',
    description: 'High-intensity interval training for cardiovascular fitness',
    category: 'cardio',
    estimated_duration: 30,
    exercises: [
      {
        exercise_name: 'Running',
        exercise_order: 1,
        distance: 400,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 1, target_rest: 60, notes: 'Sprint 400m' },
          { set_index: 2, target_weight: 0, target_reps: 1, target_rest: 60, notes: 'Sprint 400m' },
          { set_index: 3, target_weight: 0, target_reps: 1, target_rest: 60, notes: 'Sprint 400m' },
          { set_index: 4, target_weight: 0, target_reps: 1, target_rest: 60, notes: 'Sprint 400m' },
        ]
      },
      {
        exercise_name: 'Burpees',
        exercise_order: 2,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 10, target_rest: 30, notes: '30 seconds rest' },
          { set_index: 2, target_weight: 0, target_reps: 10, target_rest: 30, notes: '30 seconds rest' },
          { set_index: 3, target_weight: 0, target_reps: 10, target_rest: 30, notes: '30 seconds rest' },
        ]
      }
    ]
  },
  {
    name: 'Full Body',
    description: 'Complete full body workout for overall strength',
    category: 'strength',
    estimated_duration: 45,
    exercises: [
      {
        exercise_name: 'Push-ups',
        exercise_order: 1,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 10, target_rest: 90, notes: 'Body weight' },
          { set_index: 2, target_weight: 0, target_reps: 10, target_rest: 90, notes: 'Body weight' },
          { set_index: 3, target_weight: 0, target_reps: 8, target_rest: 90, notes: 'Body weight' },
        ]
      },
      {
        exercise_name: 'Squats',
        exercise_order: 2,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 15, target_rest: 90, notes: 'Body weight' },
          { set_index: 2, target_weight: 0, target_reps: 15, target_rest: 90, notes: 'Body weight' },
          { set_index: 3, target_weight: 0, target_reps: 12, target_rest: 90, notes: 'Body weight' },
        ]
      },
      {
        exercise_name: 'Plank',
        exercise_order: 3,
        sets: [
          { set_index: 1, target_weight: 0, target_reps: 1, target_rest: 60, notes: 'Hold 30 seconds' },
          { set_index: 2, target_weight: 0, target_reps: 1, target_rest: 60, notes: 'Hold 30 seconds' },
        ]
      }
    ]
  }
];

// Remove or replace all occurrences of difficulty: 'intermediate'
sampleTemplates.forEach(template => {
  if (template.difficulty === 'intermediate') {
    template.difficulty = 'beginner'; // or remove the property if you prefer
  }
});

const db = new sqlite3.Database(dbPath);

db.serialize(async () => {
  console.log('Creating sample workout templates...');

  for (const template of sampleTemplates) {
    try {
      // Insert template
      const templateId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO workout_templates (name, description, category, difficulty, estimated_duration, is_favorite) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [template.name, template.description, template.category, template.difficulty, template.estimated_duration, 0],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      console.log(`Created template: ${template.name} (ID: ${templateId})`);

      // Insert exercises for this template
      for (const exerciseData of template.exercises) {
        // First, find the exercise by name
        const exercise = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM exercises WHERE name LIKE ? LIMIT 1',
            [`%${exerciseData.exercise_name}%`],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!exercise) {
          console.log(`Exercise not found: ${exerciseData.exercise_name}, skipping...`);
          continue;
        }

        // Insert template exercise
        const templateExerciseId = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO template_exercises (template_id, exercise_id, exercise_order, distance) 
             VALUES (?, ?, ?, ?)`,
            [templateId, exercise.id, exerciseData.exercise_order, exerciseData.distance || null],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        // Insert sets for this exercise
        for (const setData of exerciseData.sets) {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO template_sets (template_exercise_id, set_index, target_weight, target_reps, target_rest, notes) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [templateExerciseId, setData.set_index, setData.target_weight, setData.target_reps, setData.target_rest, setData.notes],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }

        console.log(`  - Added exercise: ${exerciseData.exercise_name} with ${exerciseData.sets.length} sets`);
      }
    } catch (error) {
      console.error(`Error creating template ${template.name}:`, error);
    }
  }

  console.log('Sample templates created successfully!');
  db.close();
}); 