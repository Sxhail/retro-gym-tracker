import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../../../styles/theme';
import { ProgramManager } from '../../../services/programManager';
import { db } from '../../../db/client';
import * as schema from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface ProgramConfig {
  programName: string;
  duration: string;
  description: string;
}

interface ProgramDay {
  id: number;
  day_name: string;
  day_order: number;
  is_rest_day: boolean;
  template_id: number | null;
  template_name?: string;
}

export default function EditProgramScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<any>(null);
  const [config, setConfig] = useState<ProgramConfig>({
    programName: '',
    duration: '',
    description: '',
  });
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);

  useEffect(() => {
    loadProgramData();
  }, [id]);

  const loadProgramData = async () => {
    try {
      setLoading(true);
      const programId = parseInt(id as string);
      
      // Load program data
      const programData = await ProgramManager.getProgramById(programId);
      if (!programData) {
        Alert.alert('Error', 'Program not found');
        router.back();
        return;
      }
      
      setProgram(programData);
      setConfig({
        programName: programData.name,
        duration: programData.duration_weeks.toString(),
        description: programData.description || '',
      });

      // Load program days
      const days = await db.select()
        .from(schema.program_days)
        .leftJoin(schema.workout_templates, eq(schema.program_days.template_id, schema.workout_templates.id))
        .where(eq(schema.program_days.program_id, programId))
        .orderBy(schema.program_days.day_order);

      const formattedDays: ProgramDay[] = days.map(day => ({
        id: day.program_days.id,
        day_name: day.program_days.day_name,
        day_order: day.program_days.day_order,
        is_rest_day: Boolean(day.program_days.is_rest_day),
        template_id: day.program_days.template_id,
        template_name: day.workout_templates?.name || null,
      }));

      setProgramDays(formattedDays);
      
    } catch (error) {
      console.error('Error loading program data:', error);
      Alert.alert('Error', 'Failed to load program data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!config.programName.trim()) {
      Alert.alert('Validation Error', 'Program name is required');
      return;
    }

    if (!config.duration.trim() || isNaN(parseInt(config.duration))) {
      Alert.alert('Validation Error', 'Valid duration in weeks is required');
      return;
    }

    try {
      setSaving(true);
      const programId = parseInt(id as string);

      // Update program basic info
      await db.update(schema.user_programs)
        .set({
          name: config.programName.trim(),
          duration_weeks: parseInt(config.duration),
          description: config.description.trim() || null,
        })
        .where(eq(schema.user_programs.id, programId));

      Alert.alert(
        'Success',
        'Program updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving program:', error);
      Alert.alert('Error', 'Failed to save program changes');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRestDay = async (dayId: number, currentIsRestDay: boolean) => {
    try {
      // Toggle rest day status
      await db.update(schema.program_days)
        .set({
          is_rest_day: currentIsRestDay ? 0 : 1,
          template_id: currentIsRestDay ? null : null, // Clear template if switching to rest
        })
        .where(eq(schema.program_days.id, dayId));

      // Reload program days
      await loadProgramData();
    } catch (error) {
      console.error('Error toggling rest day:', error);
      Alert.alert('Error', 'Failed to update day');
    }
  };

  const handleEditDay = (dayId: number, dayName: string) => {
    // Navigate to day editor (reuse existing day editor)
    router.push(`/program/editor/${dayName.toLowerCase()}?editMode=true&programId=${id}&dayId=${dayId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LOADING...</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING PROGRAM...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ERROR</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>PROGRAM NOT FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT PROGRAM</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Program Name */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>PROGRAM NAME</Text>
          <TextInput
            style={styles.textInput}
            value={config.programName}
            onChangeText={(text) => setConfig({ ...config, programName: text })}
            placeholder="Enter program name"
            placeholderTextColor={theme.colors.neon + '60'}
          />
        </View>

        {/* Duration */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>DURATION (WEEKS)</Text>
          <TextInput
            style={styles.textInput}
            value={config.duration}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, '');
              setConfig({ ...config, duration: numericText });
            }}
            placeholder="Enter duration in weeks"
            placeholderTextColor={theme.colors.neon + '60'}
            keyboardType="numeric"
          />
        </View>

        {/* Description */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>DESCRIPTION</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            value={config.description}
            onChangeText={(text) => setConfig({ ...config, description: text })}
            placeholder="Enter program description"
            placeholderTextColor={theme.colors.neon + '60'}
            multiline={true}
            numberOfLines={3}
          />
        </View>

        {/* Program Days */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>PROGRAM SCHEDULE</Text>
          <Text style={styles.configSubtitle}>Tap to edit workouts or toggle rest days</Text>
          
          {programDays.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.day_name}</Text>
                <TouchableOpacity
                  style={[
                    styles.restToggle,
                    day.is_rest_day && styles.restToggleActive
                  ]}
                  onPress={() => handleToggleRestDay(day.id, day.is_rest_day)}
                >
                  <Text style={[
                    styles.restToggleText,
                    day.is_rest_day && styles.restToggleTextActive
                  ]}>
                    {day.is_rest_day ? 'REST DAY' : 'WORKOUT'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {!day.is_rest_day && (
                <View style={styles.dayContent}>
                  <Text style={styles.dayTemplate}>
                    {day.template_name || 'Custom Workout'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editDayButton}
                    onPress={() => handleEditDay(day.id, day.day_name)}
                  >
                    <Text style={styles.editDayButtonText}>EDIT WORKOUT</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProgram}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: theme.fonts.code,
    fontSize: 16,
  },
  configSection: {
    marginBottom: 24,
  },
  configTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  configSubtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dayCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
  restToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    backgroundColor: 'transparent',
  },
  restToggleActive: {
    backgroundColor: theme.colors.neon,
  },
  restToggleText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  restToggleTextActive: {
    color: theme.colors.background,
  },
  dayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTemplate: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.8,
    flex: 1,
  },
  editDayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  editDayButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  saveSection: {
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
