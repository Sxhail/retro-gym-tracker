import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';
import type { DateRangePreset } from '../../services/analytics';

interface Props {
  value: DateRangePreset;
  onChange: (v: DateRangePreset) => void;
}

const PRESETS: DateRangePreset[] = ['7d', '30d', 'all'];

export default function DateRangeFilter({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {PRESETS.map(p => (
        <TouchableOpacity key={p} onPress={() => onChange(p)} style={[styles.btn, value === p && styles.btnActive]}>
          <Text style={[styles.text, value === p && styles.textActive]}>
            {p === '7d' ? '7D' : p === '30d' ? '30D' : 'ALL'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: {
    borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  btnActive: { backgroundColor: 'rgba(0,255,0,0.12)' },
  text: { color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 },
  textActive: { fontWeight: 'bold' },
});
