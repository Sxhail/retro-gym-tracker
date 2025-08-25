import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import theme from '../../styles/theme';
import ChartCard from './ChartCard';
import { DateRangePreset, getEstimated1RMBaseRows, buildEstimated1RMSeries } from '../../services/analytics';
import Tooltip from './svg/Tooltip';

export default function Estimated1RMChart({ initialRange = 'all', selectedExercise }: { initialRange?: DateRangePreset; selectedExercise?: string }) {
  // Force all-time range; remove in-chart options
  const range: DateRangePreset = 'all';
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
  }, [exercise]);

  // sync when prop changes
  React.useEffect(() => {
    if (selectedExercise) setExercise(selectedExercise);
  }, [selectedExercise]);

  const left = 48; const right = 16; const stepX = 22;
  const minWidthByRange: Record<DateRangePreset, number> = { '7d': 520, '30d': 640, 'all': 800 };
  const width = Math.max(left + data.length * stepX + right, minWidthByRange[range] || 640);
  const height = 240;
  const rawMax = Math.max(0, ...data.map(d => d.value));
  const maxY = Math.max(10, niceCeil(rawMax));
  const yScale = (v: number) => { const top=16; const bottom=height-28; return bottom - (v/maxY) * (bottom-top); };
  const ticksY = niceTicks(0, maxY, 4);

  return (
    <ChartCard
      title="Estimated 1RM (Epley)"
      description="Tracks your estimated 1-rep max over time for the selected exercise using the Epley formula."
      isLoading={loading}
      empty={!exercise || data.length===0}
      emptyMessage={!exercise? 'Pick an exercise' : 'No data'}
    >
  {/* Range and exercise options removed; always all-time; exercise selected globally */}
      {exercise && data.length>0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={width} height={height}>
            {ticksY.map((t, i) => (
              <Line key={i} x1={left} y1={yScale(t)} x2={width-right} y2={yScale(t)} stroke={theme.colors.neon} strokeOpacity={0.15} />
            ))}
            {ticksY.map((t,i)=> (
              <SvgText key={i} x={6} y={yScale(t)+4} fill={theme.colors.neon} fontSize={10}>{Math.round(t)}</SvgText>
            ))}
            {/* X-axis baseline at y=0 */}
            <Line x1={left} y1={yScale(0)} x2={width-right} y2={yScale(0)} stroke={theme.colors.neon} strokeOpacity={0.25} />
            <Polyline
              points={data.map((p,i)=>`${left + i*stepX},${yScale(p.value)}`).join(' ')}
              fill="none"
              stroke={theme.colors.neon}
              strokeWidth={2}
            />
            {data.map((p,i)=> {
              const cx = left + i*stepX;
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
                  {/* Larger invisible hit area for easier tapping */}
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="transparent"
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

function niceCeil(max: number): number {
  if (max <= 0) return 0;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const mult = max / pow;
  let nice;
  if (mult <= 1) nice = 1;
  else if (mult <= 2) nice = 2;
  else if (mult <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}
