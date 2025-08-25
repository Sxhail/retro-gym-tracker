import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import theme from '../../styles/theme';

interface Props {
  title: string;
  isLoading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  children?: React.ReactNode;
}

export default function ChartCard({ title, isLoading, empty, emptyMessage, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.underline} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.neon} />
      ) : empty ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{emptyMessage || 'No data in this period'}</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    shadowColor: theme.colors.neon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  underline: {
    height: 2,
    backgroundColor: theme.colors.neon,
    width: 40,
    borderRadius: 1,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
  },
});
