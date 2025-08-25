import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Polyline, Text as SvgText, G, Circle } from 'react-native-svg';
import theme from '../../styles/theme';
import ChartCard from './ChartCard';
import DateRangeFilter from './DateRangeFilter';
import { DateRangePreset, getWorkoutFrequencyByWeek, rollingAverage } from '../../services/analytics';
import Tooltip from './svg/Tooltip';

export default function WorkoutFrequencyChart({ initialRange = '30d', showRollingAvg = true }: { initialRange?: DateRangePreset; showRollingAvg?: boolean }) {
  const [range, setRange] = useState<DateRangePreset>(initialRange);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ date: Date; value: number }[]>([]);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWorkoutFrequencyByWeek(range).then(points => { if (mounted) setData(points); }).finally(()=> mounted && setLoading(false));
    return () => { mounted = false; };
  }, [range]);

  const width = Math.max(40 + data.length*(18+8) + 10, 360);
  const height = 220;
  const maxY = Math.max(1, Math.max(...data.map(d=>d.value), 0));
  const yScale = (v: number) => { const top=16; const bottom=height-24; return bottom - (v/maxY) * (bottom-top); };
  const ticksY = [0,1,2,3,4].filter(v=>v<=maxY);

  const avg = showRollingAvg ? rollingAverage(data, 4) : [];

  return (
    <ChartCard
      title="Training Frequency"
      description="Number of workouts completed each week. The line shows a 4‑week rolling average."
      isLoading={loading}
      empty={data.length===0}
    >
      <DateRangeFilter value={range} onChange={setRange} />
      {data.length>0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={width} height={height}>
            {ticksY.map((t, i) => (
              <Line key={i} x1={40} y1={yScale(t)} x2={width-10} y2={yScale(t)} stroke={theme.colors.neon} strokeOpacity={0.15} />
            ))}
            {ticksY.map((t,i)=> (
              <SvgText key={i} x={4} y={yScale(t)+4} fill={theme.colors.neon} fontSize={10}>{t}</SvgText>
            ))}
            {data.map((p, i) => {
              const barW = 18; const gap = 8; const x = 40 + i*(barW+gap);
              const h = Math.max(2, yScale(0)-yScale(p.value));
              const y = yScale(p.value);
              const color = p.value === 0 ? theme.colors.neonDim : theme.colors.neon;
              return (
                <G key={i}>
                  <Rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={color}
                    opacity={tipIndex===i?1:0.85}
                    rx={3}
                    onPress={() => setTipIndex(tipIndex===i? null : i)}
                  />
                  {/* Invisible hitbox to improve tapping */}
                  <Rect
                    x={x - 6}
                    y={Math.min(y, yScale(maxY)) - 6}
                    width={barW + 12}
                    height={Math.abs(yScale(0) - Math.min(y, yScale(maxY))) + 12}
                    fill="transparent"
                    onPress={() => setTipIndex(tipIndex===i? null : i)}
                  />
                  {tipIndex===i && (
                    <Tooltip
                      x={x + barW/2}
                      y={y}
                      chartWidth={width}
                      lines={[formatDate(data[i].date), `${p.value} workouts`]}
                    />
                  )}
                </G>
              );
            })}
            {showRollingAvg && avg.length>1 && (
              <Polyline
                points={avg.map((p,i)=>`${40 + i*(18+8) + 9},${yScale(p.value)}`).join(' ')}
                fill="none"
                stroke={theme.colors.neonBright}
                strokeWidth={2}
              />
            )}
          </Svg>
        </ScrollView>
      )}
  </ChartCard>
  );
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

const styles = StyleSheet.create({});
