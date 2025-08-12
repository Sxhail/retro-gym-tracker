import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import theme from '../styles/theme';

interface FilterChipsProps {
  options: string[];
  selected: string[];
  onSelect: (option: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ options, selected, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
    {options.map(option => {
      const isSelected = selected.includes(option);
      return (
        <TouchableOpacity
          key={option}
          style={[styles.chip, isSelected && styles.chipSelected]}
          onPress={() => onSelect(option)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  scroll: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  chip: {
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  chipSelected: {
    backgroundColor: theme.colors.neon,
  },
  chipText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    letterSpacing: 1,
  },
  chipTextSelected: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});

export default FilterChips; 