import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import theme from '../../styles/theme';

export default function ActionsBar({ onShareImage, onSharePdf, onClose, busy }: { onShareImage: () => void; onSharePdf: () => void; onClose: () => void; busy?: boolean; }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
      <TouchableOpacity onPress={onShareImage} disabled={busy} style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 12, alignItems: 'center', backgroundColor: 'rgba(0,255,0,0.08)', opacity: busy ? 0.6 : 1 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold' }}>SHARE IMAGE</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSharePdf} disabled={busy} style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 12, alignItems: 'center', backgroundColor: 'transparent', opacity: busy ? 0.6 : 1 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold' }}>SHARE PDF</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={{ flex: 1, borderWidth: 1, borderColor: '#666', borderRadius: 8, padding: 12, alignItems: 'center' }}>
        <Text style={{ color: '#AAA', fontFamily: theme.fonts.code, fontWeight: 'bold' }}>CLOSE</Text>
      </TouchableOpacity>
    </View>
  );
}
