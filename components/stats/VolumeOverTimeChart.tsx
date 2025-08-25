import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import theme from '../../styles/theme';
import ChartCard from './ChartCard';
import DateRangeFilter from './DateRangeFilter';
import { DateRangePreset, getVolumeBySession, getVolumeByWeek } from '../../services/analytics';
import Tooltip from './svg/Tooltip';

interface Props {
  initialRange?: DateRangePreset;
}

export default function VolumeOverTimeChart({ initialRange = '30d' }: Props) {
  const [range, setRange] = useState<DateRangePreset>(initialRange);
  const [groupBy, setGroupBy] = useState<'session'|'week'>('session');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ date: Date; value: number }[]>([]);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const fn = groupBy === 'session' ? getVolumeBySession : getVolumeByWeek;
    fn(range).then(points => { if (mounted) setData(points); }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [range, groupBy]);

  const { width, height, xScale, yScale, ticksY, maxY } = useChartGeometry(data);

  return (
    <ChartCard
      title="Total Training Volume"
      description="Total lifted volume per session or per week (sum of weight x reps). Use the toggle to switch grouping."
      isLoading={loading}
      empty={data.length===0}
    >
      <DateRangeFilter value={range} onChange={setRange} />
      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setGroupBy('session')}><Text style={[styles.toggle, groupBy==='session'&&styles.toggleActive]}>Per Session</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setGroupBy('week')}><Text style={[styles.toggle, groupBy==='week'&&styles.toggleActive]}>Per Week</Text></TouchableOpacity>
      </View>
      {data.length>0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={Math.max(width, 360)} height={220}>
            {/* Gridlines */}
            {ticksY.map((t, i) => (
              <Line key={i} x1={40} y1={yScale(t)} x2={Math.max(width, 360)-10} y2={yScale(t)} stroke={theme.colors.neon} strokeOpacity={0.15} />
            ))}
            {/* Y labels */}
            {ticksY.map((t,i)=> (
              <SvgText key={i} x={4} y={yScale(t)+4} fill={theme.colors.neon} fontSize={10}>{formatK(t)}</SvgText>
            ))}
            {/* Bars */}
            {data.map((p, i) => {
              const barW = 18;
              const gap = 8;
              const x = 40 + i*(barW+gap);
              const h = Math.max(2, yScale(0)-yScale(p.value));
              const y = yScale(p.value);
              return (
                <G key={i}>
                  <Rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={theme.colors.neon}
                    opacity={tipIndex===i?1:0.85}
                    rx={3}
                    onPress={() => setTipIndex(tipIndex===i? null : i)}
                  />
                  {tipIndex===i && (
                    <Tooltip
                      x={x + barW/2}
                      y={y}
                      chartWidth={Math.max(width, 360)}
                      lines={[formatDate(p.date), `${formatK(p.value)} vol`]}
                    />
                  )}
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      )}
  </ChartCard>
  );
}

function useChartGeometry(data: {date: Date; value: number}[]) {
  const width = Math.max(40 + data.length*(18+8) + 10, 360);
  const height = 220;
  const maxY = Math.max(10, Math.max(...data.map(d=>d.value), 0));
  const yScale = (v: number) => {
    const top = 16; const bottom = height-24;
    return bottom - (v/maxY) * (bottom-top);
  };
  const ticksY = niceTicks(0, maxY, 4);
  return { width, height, xScale: (i:number)=>40+i*(18+8), yScale, ticksY, maxY };
}

function niceTicks(min: number, max: number, count: number): number[] {
  const step = Math.max(1, Math.ceil((max-min)/count));
  const arr: number[] = [];
  for (let v=min; v<=max; v+=step) arr.push(v);
  return arr;
}

function formatK(n: number) {
  if (n>=1000) return `${(n/1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function formatDate(d: Date) {
  try {
    const dt = new Date(d);
    const mm = (dt.getMonth()+1).toString().padStart(2,'0');
    const dd = dt.getDate().toString().padStart(2,'0');
    return `${dt.getFullYear()}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  toggle: { color: theme.colors.neon, fontFamily: theme.fonts.code, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8 },
  toggleActive: { backgroundColor: 'rgba(0,255,0,0.12)', fontWeight: 'bold' },
});
