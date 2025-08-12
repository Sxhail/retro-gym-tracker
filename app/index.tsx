import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
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
          <Text style={styles.title}>GYM.TRACKER</Text>
        </View>

        {/* Strength Protocol Dashboard */}
        <View style={styles.protocolContainer}>
        <View style={styles.protocolHeader}>
          <Text style={styles.protocolTitle}>STRENGTH PROTOCOL v2.1</Text>
          <Text style={styles.protocolStatus}>ACTIVE PROGRAM</Text>
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>OVERALL PROGRESS</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '33%' }]} />
            </View>
            <Text style={styles.progressText}>8/24 SESSIONS</Text>
          </View>
          
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>WEEK 3/8</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '67%' }]} />
            </View>
            <Text style={styles.progressText}>2/3 THIS WEEK</Text>
          </View>
        </View>

        <View style={styles.nextSessionContainer}>
          <View style={styles.nextSessionHeader}>
            <Text style={styles.nextSessionTitle}>NEXT SESSION</Text>
          </View>
          <Text style={styles.nextSessionName}>PUSH_DAY_ALPHA</Text>
          <Text style={styles.nextSessionTime}>MON • 45MIN</Text>
          
          <View style={styles.exerciseGrid}>
            <View style={styles.exerciseCell}>
              <Text style={styles.exerciseText}>BENCH_PRESS</Text>
            </View>
            <View style={styles.exerciseCell}>
              <Text style={styles.exerciseText}>OVERHEAD_PRESS</Text>
            </View>
            <View style={styles.exerciseCell}>
              <Text style={styles.exerciseText}>DIPS</Text>
            </View>
            <View style={styles.exerciseCell}>
              <Text style={styles.exerciseText}>LATERAL_RAISES</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.beginSessionButton}>
            <Text style={styles.beginSessionText}>▶ BEGIN SESSION</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>DAYS</Text>
            <Text style={styles.statSubtitle}>STREAK</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>47</Text>
            <Text style={styles.statLabel}>SESSIONS</Text>
            <Text style={styles.statSubtitle}>TOTAL</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>42</Text>
            <Text style={styles.statLabel}>MINUTES</Text>
            <Text style={styles.statSubtitle}>AVG TIME</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>128</Text>
            <Text style={styles.statLabel}>MINUTES</Text>
            <Text style={styles.statSubtitle}>THIS WEEK</Text>
          </View>
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>RECENT ACHIEVEMENTS</Text>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementText}>• NEW PR: BENCH_PRESS • 225 LBS</Text>
            <Text style={styles.achievementTime}>2 DAYS AGO</Text>
          </View>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementText}>• STREAK: 7 DAYS</Text>
            <Text style={styles.achievementTime}>TODAY</Text>
          </View>
        </View>
        </View>

        {/* Action Buttons */}
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
      </ScrollView>      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === 'program') router.push('/program');
          if (tab === 'history') router.push('/history');
          // if (tab === 'exercises') router.push('/exercises');
          if (tab === 'progress') router.push('/stats');
        }}
      />
      
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
                <Text style={styles.modalTrainingTitle}>WORKOUT</Text>
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

const BottomNav = ({ activeTab, onTabPress }: { activeTab: string, onTabPress: (tab: string) => void }) => (
  <SafeAreaView style={styles.bottomNavContainer}>
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('program')}>
        <Text style={[styles.navTabLabel, activeTab === 'program' && styles.navTabLabelActive]}>Program</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('history')}>
        <Text style={[styles.navTabLabel, activeTab === 'history' && styles.navTabLabelActive]}>History</Text>
      </TouchableOpacity>
      {/* <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('exercises')}>
        <Text style={[styles.navTabLabel, activeTab === 'exercises' && styles.navTabLabelActive]}>Exercises</Text>
      </TouchableOpacity> */}
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('progress')}>
        <Text style={[styles.navTabLabel, activeTab === 'progress' && styles.navTabLabelActive]}>Stats</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

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
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
    // For iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    // For Android elevation
    elevation: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neonDim,
    paddingVertical: 8,
    paddingBottom: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginHorizontal: 0,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginHorizontal: 4,
    paddingVertical: 8,
    // Add a subtle border and background for clickable look
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.15)',
    backgroundColor: 'rgba(0,255,0,0.04)',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  navTabIcon: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.code,
    fontSize: 22,
    marginBottom: 2,
  },
  navTabIconActive: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
  },
  navTabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  navTabLabelActive: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    backgroundColor: 'rgba(0,255,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  // Protocol Dashboard styles
  protocolContainer: {
    margin: 16,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.02)',
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  protocolTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  protocolStatus: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.8,
    letterSpacing: 1,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.2)',
  },
  progressItem: {
    marginBottom: 12,
  },
  progressLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    marginBottom: 4,
    letterSpacing: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.neon,
    borderRadius: 2,
  },
  progressText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.8,
  },
  nextSessionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.2)',
  },
  nextSessionHeader: {
    marginBottom: 8,
  },
  nextSessionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  nextSessionName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  nextSessionTime: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.8,
    marginBottom: 12,
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  exerciseCell: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  exerciseText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  beginSessionButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  beginSessionText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.2)',
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  statNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 9,
    marginBottom: 2,
    letterSpacing: 1,
  },
  statSubtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.6,
    letterSpacing: 1,
  },
  achievementsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  achievementsTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  achievementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 9,
    flex: 1,
    letterSpacing: 0.5,
  },
  achievementTime: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.6,
    letterSpacing: 1,
  },
}); 