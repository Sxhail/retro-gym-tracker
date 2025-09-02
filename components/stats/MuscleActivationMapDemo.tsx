import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import theme from '../../styles/theme';
import { testMuscleActivationMap } from '../../scripts/testMuscleActivationMap';
import { verifyDatabaseForMuscleMap } from '../../scripts/verifyDatabaseForMuscleMap';

export const MuscleActivationMapDemo = () => {
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    try {
      // First verify database
      const dbVerification = await verifyDatabaseForMuscleMap();
      
      if (!dbVerification.success) {
        Alert.alert('Database Error', 'Database verification failed. Check console for details.');
        return;
      }

      // Run muscle activation tests
      const results = await testMuscleActivationMap();
      setTestResults(results);

      if (results.success) {
        Alert.alert(
          'Tests Completed! ✅', 
          `Muscle activation map is working!\n\n` +
          `• Week data: ${results.weekData.totalVolume.toLocaleString()} total volume\n` +
          `• Month data: ${results.monthData.totalVolume.toLocaleString()} total volume\n` +
          `• ${Object.keys(results.weekData.muscleStates).length} muscles analyzed`
        );
      } else {
        Alert.alert('Test Failed ❌', 'Check console for error details.');
      }
    } catch (error) {
      console.error('Demo test error:', error);
      Alert.alert('Error', 'Failed to run tests. Check console for details.');
    } finally {
      setTesting(false);
    }
  };

  const showFeatureInfo = () => {
    Alert.alert(
      'Muscle Activation Map Features 💪',
      '✅ COMPLETED FEATURES:\n\n' +
      '🎨 Visual Features:\n' +
      '• 4 training levels with distinct colors\n' +
      '• Male/Female anatomy views\n' +
      '• Front/Back perspectives\n' +
      '• Dynamic opacity based on volume\n\n' +
      '📊 Analytics Features:\n' +
      '• SESSION/WEEK/MONTH view modes\n' +
      '• Real-time database integration\n' +
      '• Period comparison functionality\n' +
      '• Individual muscle statistics\n\n' +
      '🔄 Interactive Features:\n' +
      '• Tap muscles for detailed stats\n' +
      '• Gender/side toggles\n' +
      '• View mode switching\n' +
      '• Workout history integration'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muscle Activation Map Demo</Text>
      <Text style={styles.subtitle}>Test and explore the new features</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={runTests}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Running Tests...' : 'Run Tests 🧪'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={showFeatureInfo}
        >
          <Text style={styles.buttonText}>View Features 📋</Text>
        </TouchableOpacity>
      </View>

      {testResults && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            {testResults.success ? 'Tests Passed ✅' : 'Tests Failed ❌'}
          </Text>
          {testResults.success && (
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                Week Volume: {testResults.weekData.totalVolume.toLocaleString()}
              </Text>
              <Text style={styles.statText}>
                Month Volume: {testResults.monthData.totalVolume.toLocaleString()}
              </Text>
              <Text style={styles.statText}>
                Muscles Analyzed: {Object.keys(testResults.weekData.muscleStates).length}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>How to Use:</Text>
        <Text style={styles.instructionText}>
          1. The muscle activation map is now integrated into your Stats page
        </Text>
        <Text style={styles.instructionText}>
          2. Switch between SESSION/WEEK/MONTH view modes
        </Text>
        <Text style={styles.instructionText}>
          3. Toggle between Male/Female and Front/Back views
        </Text>
        <Text style={styles.instructionText}>
          4. Tap any muscle for detailed statistics
        </Text>
        <Text style={styles.instructionText}>
          5. Use comparison mode to track progress over time
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.neon,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: theme.colors.neon,
  },
  infoButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
  resultsContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsContainer: {
    gap: 8,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  instructionsContainer: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
});
