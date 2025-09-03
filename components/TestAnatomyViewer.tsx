/**
 * Test script to verify the new manual SVG muscle activation system
 * Run this to test that the anatomy viewer properly displays muscle activation
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnatomyViewer from './anatomy/AnatomyViewer';
import type { MuscleId, TrainingLevel } from './anatomy/muscles';

const TestAnatomyViewer = () => {
  // Sample muscle activation data - simulating different training levels
  const sampleMuscleStates: Partial<Record<MuscleId, TrainingLevel>> = {
    // Overtrained - Push day
    chest: 'overtrained',
    frontDelts: 'overtrained',
    triceps: 'overtrained',
    
    // Optimal activation
    lats: 'optimal',
    rearDelts: 'optimal',
    
    // Undertrained
    biceps: 'undertrained',
    forearms: 'undertrained',
    
    // Untrained (should show default inactive state)
    // calves, hamstrings, abs, etc.
  };

  const handleMusclePress = (muscleId: MuscleId) => {
    console.log('Muscle pressed in test:', muscleId);
    // In a real app, this could cycle through training levels
    // or show muscle information
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anatomy Viewer Test</Text>
      <Text style={styles.subtitle}>Testing Manual SVG Muscle Mapping</Text>
      
      <AnatomyViewer
        muscleStates={sampleMuscleStates}
        gender="male"
        anatomySide="front"
        onMusclePress={handleMusclePress}
        onGenderToggle={(gender) => console.log('Gender toggle:', gender)}
        onSideToggle={() => console.log('Side toggle')}
        width={300}
        height={450}
      />
      
      <View style={styles.info}>
        <Text style={styles.infoText}>
          • Overtrained: Chest, Front Delts, Triceps (Red)
        </Text>
        <Text style={styles.infoText}>
          • Optimal: Lats, Rear Delts (Green) 
        </Text>
        <Text style={styles.infoText}>
          • Undertrained: Biceps, Forearms (Yellow)
        </Text>
        <Text style={styles.infoText}>
          • Untrained: All other muscles (Gray)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#00ff00',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  info: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  infoText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default TestAnatomyViewer;
