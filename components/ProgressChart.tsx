import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import theme from '../styles/theme';

interface ProgressChartProps {
  title: string;
  maxGain: string;
  percentGain: string;
  sessions: number;
  data: number[]; // weight data
  labels: string[];
}

const chartWidth = 360;
const chartHeight = 180;
const chartPadding = 32;
const chartInnerWidth = chartWidth - 2 * chartPadding;
const chartInnerHeight = chartHeight - 2 * chartPadding;

const ProgressChart: React.FC<ProgressChartProps> = ({ title, maxGain, percentGain, sessions, data, labels }) => {
  const [selectedPoint, setSelectedPoint] = useState<{ weight: number; date: string; index: number } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
          </View>
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
          <Text style={styles.noDataSubtext}>Start tracking your workouts to see progress</Text>
        </View>
      </View>
    );
  }

  if (data.length === 1) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{sessions} SESSION</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>CURRENT WEIGHT</Text>
            <Text style={styles.statValue}>{data[0]}kg</Text>
            <Text style={styles.statSubtext}>First session</Text>
          </View>
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Not enough sessions</Text>
          <Text style={styles.noDataSubtext}>Complete more workouts to see progress trends</Text>
        </View>
      </View>
    );
  }

  // Find min and max weights for Y-axis scaling
  const minWeight = Math.min(...data);
  const maxWeight = Math.max(...data);
  const weightRange = maxWeight - minWeight;
  
  // Ensure we have a proper range even if all weights are the same
  const adjustedMinWeight = weightRange === 0 ? Math.max(0, minWeight - 5) : Math.max(0, minWeight - (weightRange * 0.1));
  const adjustedMaxWeight = weightRange === 0 ? minWeight + 10 : maxWeight + (weightRange * 0.1);
  const adjustedWeightRange = adjustedMaxWeight - adjustedMinWeight;
  
  // Find personal best (highest weight)
  const personalBest = maxWeight;
  const personalBestIndex = data.indexOf(personalBest);

  // Generate Y-axis weight labels with better spacing (clean horizontal gridlines)
  const yAxisLabels = [];
  const numYLabels = 5; // Fixed number for consistent spacing
  for (let i = 0; i <= numYLabels; i++) {
    const weight = adjustedMinWeight + (adjustedWeightRange * i) / numYLabels;
    yAxisLabels.push(Math.round(weight));
  }

  // Show all data points
  const showDataPoint = (index: number) => {
    return true; // Show all sessions
  };

  // Create chart points
  const points = data.map((val, i) => {
    const x = chartPadding + (i * chartInnerWidth) / (data.length - 1);
    const y = chartHeight - chartPadding - ((val - adjustedMinWeight) / adjustedWeightRange) * chartInnerHeight;
    return `${x},${y}`;
  }).join(' ');

  // Create area fill points (for gradient fill)
  const areaPoints = points + ` ${chartWidth - chartPadding},${chartHeight - chartPadding} ${chartPadding},${chartHeight - chartPadding}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.titleUnderline} />
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{sessions} SESSIONS</Text>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>WEIGHT GAIN</Text>
          <Text style={styles.statValue}>{maxGain}</Text>
          <Text style={styles.statSubtext}>{percentGain}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>PERSONAL BEST</Text>
          <Text style={styles.statValue}>{personalBest}kg</Text>
          <Text style={styles.statSubtext}>Session {personalBestIndex + 1}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>AVERAGE</Text>
          <Text style={styles.statValue}>{Math.round(data.reduce((a, b) => a + b, 0) / data.length)}kg</Text>
          <Text style={styles.statSubtext}>Per session</Text>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight} style={styles.chartSvg}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.neon} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={theme.colors.neon} stopOpacity="0.05" />
            </LinearGradient>
            <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={theme.colors.neon} />
              <Stop offset="100%" stopColor="#00CC00" />
            </LinearGradient>
          </Defs>







          {/* Clean horizontal gridlines with weight labels on Y-axis */}
          {yAxisLabels.map((weight, i) => {
            const y = chartHeight - chartPadding - ((weight - adjustedMinWeight) / adjustedWeightRange) * chartInnerHeight;
            return (
              <React.Fragment key={`grid-${i}`}>
                <Line
                  x1={chartPadding}
                  y1={y}
                  x2={chartWidth - chartPadding}
                  y2={y}
                  stroke={theme.colors.neon}
                  strokeWidth="1"
                  opacity="0.15"
                />
                <SvgText
                  x={8}
                  y={y + 4}
                  fontSize="12"
                  fill={theme.colors.neon}
                  fontFamily={theme.fonts.code}
                  textAnchor="start"
                  opacity="0.8"
                >
                  {weight}kg
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Area fill */}
          <Polyline
            points={areaPoints}
            fill="url(#areaGradient)"
            stroke="none"
          />

          {/* Thicker, smoother progression line with rounded caps */}
          <Polyline
            points={points}
            fill="none"
            stroke={theme.colors.neon}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Circle data points removed - now showing only line path */}


        </Svg>
      </View>

      {/* Point Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Session Details</Text>
            {selectedPoint && (
              <>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Weight:</Text>
                  <Text style={styles.modalValue}>{selectedPoint.weight}kg</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Date:</Text>
                  <Text style={styles.modalValue}>{selectedPoint.date}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Session:</Text>
                  <Text style={styles.modalValue}>{selectedPoint.index}</Text>
                </View>
              </>
            )}
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  titleUnderline: {
    height: 2,
    backgroundColor: theme.colors.neon,
    width: 40,
    borderRadius: 1,
  },
  headerBadge: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBadgeText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.02)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.08)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    opacity: 0.7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  chartContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.08)',
  },
  chartSvg: {
    alignSelf: 'center',
    width: chartWidth,
    height: chartHeight,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    marginBottom: 8,
  },
  noDataSubtext: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    minWidth: 280,
  },
  modalTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    opacity: 0.8,
  },
  modalValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProgressChart; 