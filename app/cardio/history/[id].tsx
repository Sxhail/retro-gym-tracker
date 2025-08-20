import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import theme from '../../../styles/theme';
import { getCardioSessionById, deleteCardioSession, formatDuration, getCardioTypeDisplayName } from '../../../services/cardioTracking';

export default function CardioHistoryDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getCardioSessionById(id);
        if (mounted) setSession(s);
      } catch (e) {
        console.error('Failed to load cardio session', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this cardio session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const ok = await deleteCardioSession(id);
        if (ok) router.back();
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator color={theme.colors.neon} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CARDIO SESSION</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 18 }}>
          <Text style={styles.emptyText}>Session not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CARDIO SESSION</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Text style={[styles.backButtonText, { color: '#FF4444' }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 18 }}>
        <Text style={styles.title}>{session.name}</Text>
        <Text style={styles.subText}>{new Date(session.date).toLocaleString()}</Text>

        <View style={styles.card}> 
          <View style={styles.row}> 
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{getCardioTypeDisplayName(session.type)}</Text>
          </View>
          <View style={styles.row}> 
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{formatDuration(session.duration)}</Text>
          </View>
          {typeof session.calories_burned === 'number' && (
            <View style={styles.row}> 
              <Text style={styles.label}>Calories</Text>
              <Text style={styles.value}>{session.calories_burned}</Text>
            </View>
          )}
          {session.distance != null && (
            <View style={styles.row}> 
              <Text style={styles.label}>Distance</Text>
              <Text style={styles.value}>{session.distance}</Text>
            </View>
          )}
        </View>

        {session.type === 'hiit' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>HIIT</Text>
            <View style={styles.row}><Text style={styles.label}>Work</Text><Text style={styles.value}>{session.work_time}s</Text></View>
            <View style={styles.row}><Text style={styles.label}>Rest</Text><Text style={styles.value}>{session.rest_time}s</Text></View>
            <View style={styles.row}><Text style={styles.label}>Rounds</Text><Text style={styles.value}>{session.rounds}</Text></View>
          </View>
        )}
        {session.type === 'walk_run' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>WALK-RUN</Text>
            <View style={styles.row}><Text style={styles.label}>Run</Text><Text style={styles.value}>{session.run_time}s</Text></View>
            <View style={styles.row}><Text style={styles.label}>Walk</Text><Text style={styles.value}>{session.walk_time}s</Text></View>
            <View style={styles.row}><Text style={styles.label}>Laps</Text><Text style={styles.value}>{session.laps}</Text></View>
          </View>
        )}
        {session.type === 'casual_walk' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>CASUAL WALK</Text>
            <View style={styles.row}><Text style={styles.label}>Total Laps</Text><Text style={styles.value}>{session.total_laps}</Text></View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { color: theme.colors.neon, fontSize: 24, fontFamily: theme.fonts.code },
  headerTitle: { color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  deleteButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  subText: { color: theme.colors.neonDim, fontFamily: theme.fonts.code, fontSize: 12, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: 'rgba(0,255,0,0.05)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  label: { color: theme.colors.neonDim, fontFamily: theme.fonts.code, fontSize: 12 },
  value: { color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 16 },
  sectionTitle: { color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, marginBottom: 6 },
  emptyText: { color: theme.colors.neon, fontFamily: theme.fonts.code }
});
