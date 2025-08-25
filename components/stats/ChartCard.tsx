import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import theme from '../../styles/theme';

interface Props {
  title: string;
  description?: string;
  isLoading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  children?: React.ReactNode;
}

export default function ChartCard({ title, description, isLoading, empty, emptyMessage, children }: Props) {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => description && setShowDesc(true)}>
          <Text style={styles.title}>{title}</Text>
        </TouchableOpacity>
        <View style={styles.underline} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.neon} />
      ) : empty ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{emptyMessage || 'No data in this period'}</Text>
        </View>
      ) : (
        children
      )}

      {!!description && (
        <Modal visible={showDesc} transparent animationType="fade" onRequestClose={() => setShowDesc(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDesc(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalText}>{description}</Text>
              <TouchableOpacity onPress={() => setShowDesc(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

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
  header: {
    marginBottom: 12,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  underline: {
    height: 2,
    backgroundColor: theme.colors.neon,
    width: 40,
    borderRadius: 1,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    padding: 16,
    width: '88%',
    maxWidth: 420,
  },
  modalTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    opacity: 0.9,
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  modalCloseText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
  },
});
