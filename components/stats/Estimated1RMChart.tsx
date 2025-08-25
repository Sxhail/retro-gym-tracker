import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import theme from '../../styles/theme';
import ChartCard from './ChartCard';
import DateRangeFilter from './DateRangeFilter';
import ExercisePicker from './ExercisePicker';
import { DateRangePreset, getEstimated1RMBaseRows, buildEstimated1RMSeries } from '../../services/analytics';
import Tooltip from './svg/Tooltip';

export default function Estimated1RMChart({ initialRange = 'all', selectedExercise }: { initialRange?: DateRangePreset; selectedExercise?: string }) {
  const [range, setRange] = useState<DateRangePreset>(initialRange);
  const [exercise, setExercise] = useState<string>(selectedExercise || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ date: Date; value: number; isPeak: boolean }[]>([]);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!exercise) return;
    let mounted = true;
    setLoading(true);
    getEstimated1RMBaseRows(exercise, range)
      .then(base => buildEstimated1RMSeries(base))
      .then(series => { if (mounted) setData(series); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [exercise, range]);

  // sync when prop changes
  React.useEffect(() => {
    if (selectedExercise) setExercise(selectedExercise);
  }, [selectedExercise]);

  const width = Math.max(40 + data.length*(12+6) + 10, 360);
  const height = 220;
  const maxY = Math.max(10, Math.max(...data.map(d=>d.value), 0));
  const yScale = (v: number) => { const top=16; const bottom=height-24; return bottom - (v/maxY) * (bottom-top); };
  const ticksY = niceTicks(0, maxY, 4);

  return (
    <ChartCard
      title="Estimated 1RM (Epley)"
      description="Tracks your estimated 1-rep max over time for the selected exercise using the Epley formula."
      isLoading={loading}
      empty={!exercise || data.length===0}
      emptyMessage={!exercise? 'Pick an exercise' : 'No data'}
    >
      <DateRangeFilter value={range} onChange={setRange} />
      {!selectedExercise && <ExercisePicker value={exercise} onChange={setExercise} />}
      {exercise && data.length>0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={width} height={height}>
            {ticksY.map((t, i) => (
              <Line key={i} x1={40} y1={yScale(t)} x2={width-10} y2={yScale(t)} stroke={theme.colors.neon} strokeOpacity={0.15} />
            ))}
            {ticksY.map((t,i)=> (
              <SvgText key={i} x={4} y={yScale(t)+4} fill={theme.colors.neon} fontSize={10}>{Math.round(t)}</SvgText>
            ))}
            <Polyline
              points={data.map((p,i)=>`${40 + i*(12+6)},${yScale(p.value)}`).join(' ')}
              fill="none"
              stroke={theme.colors.neon}
              strokeWidth={2}
            />
            {data.map((p,i)=> {
              const cx = 40 + i*(12+6);
              const cy = yScale(p.value);
              return (
                <G key={i}>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={p.isPeak? 4:2.5}
                    fill={p.isPeak? theme.colors.neonBright: theme.colors.neon}
                    onPress={() => setTipIndex(tipIndex===i? null : i)}
                  />
                  {tipIndex===i && (
                    <Tooltip
                      x={cx}
                      y={cy}
                      chartWidth={width}
                      lines={[formatDate(p.date), `1RM: ${Math.round(p.value)}`]}
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

function niceTicks(min: number, max: number, count: number): number[] {
  const step = Math.max(1, Math.ceil((max-min)/count));
  const arr: number[] = [];
  for (let v=min; v<=max; v+=step) arr.push(v);
  return arr;
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
