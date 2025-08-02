import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import theme from '../styles/theme';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';
import { deleteTemplate, type WorkoutTemplate } from '../services/workoutTemplates';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('start');
  const [templates, setTemplates] = useState([]);

  // Add useFocusEffect to refresh templates on focus
  useFocusEffect(
    React.useCallback(() => {
      async function fetchTemplates() {
        // Fetch templates and their exercise counts
        const templates = await db.select().from(schema.workout_templates).orderBy(schema.workout_templates.created_at);
        const templatesWithCounts = await Promise.all(
          templates.map(async (tpl) => {
            const countResult = await db
              .select({ count: sql<number>`count(*)` })
              .from(schema.template_exercises)
              .where(sql`template_id = ${tpl.id}`);
            return { ...tpl, exerciseCount: countResult[0]?.count || 0 };
          })
        );
        setTemplates(templatesWithCounts.reverse()); // newest first
      }
      fetchTemplates();
    }, [])
  );

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: number, templateName: string) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(templateId);
              // Refresh templates after deletion
              const updatedTemplates = templates.filter(tpl => tpl.id !== templateId);
              setTemplates(updatedTemplates);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete template. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Template preview: just show template name for now
  const renderTemplatePreview = (template: WorkoutTemplate) => {
    return template.name;
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* SYSTEM ONLINE and protocol banner at very top */}
      <View style={{ width: '100%', alignItems: 'flex-start', marginTop: theme.spacing.xs, marginBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 16, marginTop: 4 }}>
          <View style={{ width: 12, height: 12, backgroundColor: theme.colors.neon, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, letterSpacing: 1 }}>
            SYSTEM ONLINE
          </Text>
        </View>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 13, marginBottom: 2, letterSpacing: 1, marginLeft: 16 }}>
          RETRO FITNESS PROTOCOL
        </Text>
        <View style={{ height: 1, backgroundColor: theme.colors.neon, width: '100%', opacity: 0.7, marginTop: 4 }} />
      </View>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>GYM.TRACKER</Text>
      </View>

      {/* Center Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('./assets/bodybuilder.jpeg')}
          style={styles.centerImage}
          resizeMode="contain"
        />
      </View>

      {/* Templates Preview List */}
      {templates.length > 0 && (
        <View style={{ width: '100%', marginBottom: 16 }}>
          {templates.map((tpl) => {
            const renderRightActions = () => (
              <View
                style={{
                  backgroundColor: '#8B0000',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 60,
                  height: '100%',
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                }}
              >
                <Text style={{
                  color: 'white',
                  fontFamily: theme.fonts.heading,
                  fontSize: 12,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                  DEL
                </Text>
              </View>
            );

                          return (
                <Swipeable
                  key={tpl.id}
                  renderRightActions={renderRightActions}
                  rightThreshold={40}
                  onSwipeableOpen={() => handleDeleteTemplate(tpl.id, tpl.name)}
                >
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                    borderRadius: 8,
                    padding: 16,
                    marginHorizontal: 16,
                    marginBottom: 16,
                    backgroundColor: 'transparent',
                  }}
                  onPress={() => router.push(`/templates/${tpl.id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 18, marginBottom: 2 }}>
                    {tpl.name}
                  </Text>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 13, opacity: 0.8 }}>
                    {tpl.exerciseCount} exercises
                  </Text>
                </TouchableOpacity>
              </Swipeable>
            );
          })}
        </View>
      )}

      {/* Action Buttons at Bottom */}
      <View style={styles.bottomActionSection}>
        <TouchableOpacity style={styles.startButton} onPress={() => router.push('/new')}>
          <Text style={styles.startButtonText}>NEW WORKOUT</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.addTemplateButton} onPress={() => router.push('/templates')}>
          <Text style={styles.addTemplateButtonText}>TEMPLATES</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === 'history') router.push('/history');
          if (tab === 'exercises') router.push('/exercises');
          if (tab === 'progress') router.push('/progress');
        }}
      />
    </SafeAreaView>
  );
}

const BottomNav = ({ activeTab, onTabPress }: { activeTab: string, onTabPress: (tab: string) => void }) => (
  <SafeAreaView style={styles.bottomNavContainer}>
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('history')}>
        <Text style={[styles.navTabLabel, activeTab === 'history' && styles.navTabLabelActive]}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('exercises')}>
        <Text style={[styles.navTabLabel, activeTab === 'exercises' && styles.navTabLabelActive]}>Exercises</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('progress')}>
        <Text style={[styles.navTabLabel, activeTab === 'progress' && styles.navTabLabelActive]}>Progress</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 0,
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
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  centerImage: {
    width: 350,
    height: 350,
    opacity: 0.8,
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
    marginBottom: 80,
    marginTop: 'auto',
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
  addTemplateButton: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12, // match startButton
    paddingVertical: theme.spacing.lg, // match startButton
    paddingHorizontal: 0, // match startButton (no extra horizontal padding)
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  addTemplateButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
    textAlign: 'center',
    width: '100%',
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
}); 