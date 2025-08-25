import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import theme from '../styles/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onViewHistory: () => void;
  onNewCardio: () => void;
};

export default function CardioCompletionModal({ visible, onClose, onViewHistory, onNewCardio }: Props) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#111', borderColor: theme.colors.neon, borderWidth: 1, borderRadius: 10, padding: 16, width: '86%' }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, marginBottom: 12 }}>
            Cardio session complete
          </Text>
          <Pressable onPress={onViewHistory} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#fff', fontSize: 14 }}>View history</Text>
          </Pressable>
          <Pressable onPress={onNewCardio} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#fff', fontSize: 14 }}>Start new cardio</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#888', fontSize: 14 }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
