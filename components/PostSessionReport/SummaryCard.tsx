import React from 'react';
import { View, Text } from 'react-native';
import theme from '../../styles/theme';

export default function SummaryCard({ totalSets, totalReps, totalVolume, duration }: { totalSets: number; totalReps: number; totalVolume: number; duration: number; }) {
  const fmtVolume = Math.round(totalVolume);
  const fmtDuration = (() => {
    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration % 3600) / 60);
    const s = duration % 60;
    if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  })();

  const Item = ({ label, value }: { label: string; value: string | number }) => (
    <View style={{ flex: 1, padding: 8 }}>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold' }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 12, padding: 12, backgroundColor: 'rgba(0,255,0,0.05)' }}>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 8 }}>SESSION SUMMARY</Text>
      <View style={{ flexDirection: 'row' }}>
        <Item label="SETS" value={totalSets} />
        <Item label="REPS" value={totalReps} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Item label="VOLUME (KG×REPS)" value={fmtVolume} />
        <Item label="DURATION" value={fmtDuration} />
      </View>
    </View>
  );
}
