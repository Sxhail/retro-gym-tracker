import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { db } from '../../db/client';
import * as schema from '../../db/schema';

export default function AccountSettingsScreen() {
  const router = useRouter();

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete All History',
      'Are you sure you want to delete ALL history? This will delete both lift workouts and cardio sessions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.delete(schema.sets);
              await db.delete(schema.workout_exercises);
              await db.delete(schema.workouts);
              await db.delete(schema.cardio_sessions);
              Alert.alert('Success', 'All workout and cardio history deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete workout history.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACCOUNT</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/history?action=import')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Import workout history (CSV)</Text>
          <Text style={styles.buttonSubtext}>Add workouts and exercises from a CSV file</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, styles.danger]}
          onPress={confirmDeleteAll}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryButtonText, styles.dangerText]}>Delete all workout & cardio history</Text>
          <Text style={[styles.buttonSubtext, styles.dangerText]}>This action cannot be undone</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.85,
    letterSpacing: 1,
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.25)',
    backgroundColor: 'rgba(0,255,0,0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  buttonSubtext: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
  },
  danger: {
    borderColor: 'rgba(255,50,50,0.35)',
    backgroundColor: 'rgba(255,50,50,0.06)',
  },
  dangerText: {
    color: '#FF4444',
  },
});
