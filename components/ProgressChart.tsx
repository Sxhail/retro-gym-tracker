import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import theme from '../styles/theme';

interface ProgressChartProps {
  title: string;
  maxGain: string;
  percentGain: string;
  sessions: number;
  data: number[]; // weight data
  labels: string[];
  // repsData?: number[]; // removed
}

const chartWidth = 180;
const chartHeight = 60;
const chartPadding = 10;

const ProgressChart: React.FC<ProgressChartProps> = ({ title, maxGain, percentGain, sessions, data, labels }) => {
  // Normalize data for chart (weight)
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data.map((val, i) => {
    const x = chartPadding + (i * (chartWidth - 2 * chartPadding)) / (data.length - 1);
    const y = chartHeight - chartPadding - ((val - min) / (max - min || 1)) * (chartHeight - 2 * chartPadding);
    return `${x},${y}`;
  }).join(' ');

  // Remove moving average and trend line code
  // Remove PR marker code

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>MAX WEIGHT GAIN</Text>
          <Text style={styles.statValue}>{maxGain} ({percentGain})</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SESSIONS</Text>
          <Text style={styles.statValue}>{sessions}</Text>
        </View>
      </View>
      <Svg width={chartWidth} height={chartHeight} style={styles.chartSvg}>
        {/* Weight line */}
        <Polyline
          points={points}
          fill="none"
          stroke={theme.colors.neon}
          strokeWidth="2"
        />
        {data.map((val, i) => {
          const x = chartPadding + (i * (chartWidth - 2 * chartPadding)) / (data.length - 1);
          const y = chartHeight - chartPadding - ((val - min) / (max - min || 1)) * (chartHeight - 2 * chartPadding);
          return <Circle key={i} cx={x} cy={y} r={3} fill={theme.colors.neon} />;
        })}
      </Svg>
      {/* Legend (only weight) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <View style={{ width: 12, height: 3, backgroundColor: theme.colors.neon, marginRight: 4, borderRadius: 2 }} />
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 10, marginRight: 12 }}>Weight</Text>
      </View>
      <View style={styles.labelsRow}>
        {labels.map((label, i) => (
          <Text key={i} style={styles.label}>{label}</Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    padding: 12,
    marginBottom: 18,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1.2,
  },
  icon: {
    color: theme.colors.neon,
    fontSize: 18,
    fontFamily: theme.fonts.mono,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    marginRight: 8,
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    opacity: 0.7,
  },
  statValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartSvg: {
    marginVertical: 4,
    alignSelf: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  label: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    opacity: 0.8,
  },
});

export default ProgressChart; 