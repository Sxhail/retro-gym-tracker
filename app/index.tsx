import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { BottomNav } from '../components/BottomNav';
import theme from '../styles/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('start');
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const { isWorkoutActive } = useWorkoutSession();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* SYSTEM ONLINE and protocol banner at very top */}
        <View style={{ width: '100%', marginTop: theme.spacing.xs, marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginHorizontal: 16, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, backgroundColor: theme.colors.neon, borderRadius: 2, marginRight: 6 }} />
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, letterSpacing: 1 }}>
                SYSTEM ONLINE
              </Text>
            </View>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 11, letterSpacing: 1 }}>
              RETRO FITNESS PROTOCOL
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.neon, width: '100%', opacity: 0.7, marginTop: 4 }} />
        </View>
        {/* Header */}
        <View style={styles.headerSection}>
        </View>
      </ScrollView>

      {/* Action Buttons - moved to bottom */}
      <View style={styles.bottomActionSection}>
        {isWorkoutActive ? (
          <TouchableOpacity style={styles.startButton} onPress={() => router.push('/new')}>
            <Text style={styles.startButtonText}>CONTINUE WORKOUT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={() => setShowTrainingModal(true)}>
            <Text style={styles.startButtonText}>START TRAINING</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav currentScreen="/" />
      
      {/* Training Selection Modal */}
      <Modal
        visible={showTrainingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrainingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTrainingModal(false)}>
                <Text style={styles.modalCloseButton}>←</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>SELECT TRAINING TYPE</Text>
              <View style={{ width: 36 }} />
            </View>
            
            <View style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.modalTrainingButton} 
                onPress={() => {
                  setShowTrainingModal(false);
                  router.push('/new');
                }}
              >
                <Text style={styles.modalTrainingTitle}>LIFT</Text>
                <Text style={styles.modalTrainingDescription}>Weight training with sets and reps</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalTrainingButton} 
                onPress={() => {
                  setShowTrainingModal(false);
                  router.push('/cardio');
                }}
              >
                <Text style={styles.modalTrainingTitle}>CARDIO</Text>
                <Text style={styles.modalTrainingDescription}>Cardio sessions and HIIT workouts</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
    paddingBottom: 100, // Space for bottom navigation
  },
  headerSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 2,
  },
  pageTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.5,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.neonDim,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 0,
  },
  section: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  bottomActionSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    color: '#fff',
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 2,
  },
  sectionSub: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  startButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  startButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  templatesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  templatesScroll: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  templateCard: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.neonDim,
    borderWidth: 2,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    minWidth: 160,
    maxWidth: 200,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  templateCardTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  menuButton: {
    marginLeft: 8,
    padding: 2,
  },
  menuButtonText: {
    color: theme.colors.neon,
    fontSize: 18,
    fontWeight: 'bold',
  },
  templateCardPreview: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  modalCloseButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  modalTrainingButton: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  modalTrainingTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTrainingDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
}); 