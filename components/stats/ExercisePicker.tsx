import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import theme from '../../styles/theme';
import { getDistinctExercises } from '../../services/analytics';

interface Props {
  value?: string;
  onChange: (v: string) => void;
}

export default function ExercisePicker({ value, onChange }: Props) {
  const [exercises, setExercises] = useState<string[]>([]);

  useEffect(() => {
    getDistinctExercises().then(setExercises).catch(() => setExercises([]));
  }, []);

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Exercise</Text>
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(v)}
        dropdownIconColor={theme.colors.neon}
        style={styles.picker}
      >
        {exercises.map(n => (
          <Picker.Item key={n} label={n} value={n} color={theme.colors.neon} />
        ))}
      </Picker>
      {exercises.length === 0 && (
        <Text style={styles.helper}>No exercises found</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 8 },
  label: { color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, margin: 8 },
  picker: { color: theme.colors.neon },
  helper: { color: theme.colors.textSecondary, fontFamily: theme.fonts.code, fontSize: 12, margin: 8 },
});
