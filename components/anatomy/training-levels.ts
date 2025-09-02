import theme from '../../styles/theme';
import type { TrainingLevel, ViewMode } from './muscles';

export const TRAINING_LEVEL_CONFIG = {
  untrained: {
    color: theme.colors.textDisabled,
    opacity: 0.1,
    label: 'Untrained',
    description: 'No recent training'
  },
  undertrained: {
    color: '#FF9500', // Orange
    opacity: 0.3,
    label: 'Undertrained', 
    description: 'Light training volume'
  },
  optimal: {
    color: theme.colors.neon, // Main green
    opacity: 0.6,
    label: 'Optimal',
    description: 'Balanced training'
  },
  overtrained: {
    color: '#FF0033', // Red
    opacity: 0.8,
    label: 'Overtrained',
    description: 'High volume/frequency'
  }
} as const;

export const VIEW_MODE_CONFIG = {
  session: {
    label: 'SESSION',
    description: 'Single workout analysis',
    daysBack: 1,
    minVolume: 100,
    maxVolume: 1000
  },
  week: {
    label: 'WEEK',
    description: 'Last 7 days',
    daysBack: 7,
    minVolume: 500,
    maxVolume: 3000
  },
  month: {
    label: 'MONTH', 
    description: 'Last 30 days',
    daysBack: 30,
    minVolume: 2000,
    maxVolume: 8000
  }
} as const;
