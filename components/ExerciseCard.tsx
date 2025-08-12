import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../styles/theme';

interface ExerciseCardProps {
  name: string;
  subtitle?: string;
  onAdd?: () => void;
  onRemove?: () => void;
  isAdded?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ name, subtitle, onAdd, onRemove, isAdded }) => (
  <View style={styles.card}>
    <View style={{ flex: 1 }}>
      <Text style={styles.name}>{name}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {onAdd && !isAdded && (
      <TouchableOpacity style={styles.iconBtn} onPress={onAdd}>
        <Text style={styles.icon}>+</Text>
      </TouchableOpacity>
    )}
    {onRemove && isAdded && (
      <TouchableOpacity style={styles.iconBtn} onPress={onRemove}>
        <Text style={styles.icon}>–</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    padding: 14,
    marginBottom: 10,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  name: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1.2,
  },
  subtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  iconBtn: {
    marginLeft: 16,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  icon: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ExerciseCard; 