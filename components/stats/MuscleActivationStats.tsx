import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../styles/theme';
import MuscleActivationMapV2 from './MuscleActivationMapV2';

export interface MuscleActivationStatsProps {
  className?: string;
}

export const MuscleActivationStats: React.FC<MuscleActivationStatsProps> = () => {
  return (
    <View style={styles.container}>
      {/* New Body Highlighter Integration */}
      <MuscleActivationMapV2 />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundOverlay,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  controls: {
    padding: 20,
    paddingBottom: 10,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: theme.colors.neon,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  viewModeTextActive: {
    color: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  anatomyContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  legendContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  legendGrid: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  legendDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  changesContainer: {
    gap: 8,
  },
  changesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  changeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  changeMuscleName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  changeDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
