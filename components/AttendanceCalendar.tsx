import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { getMonthlyAttendance, type AttendanceData } from '../services/workoutAttendance';
import { getWorkoutHistory, formatDuration, formatDate, type WorkoutHistoryItem } from '../services/workoutHistory';
import { getCardioSessionDates } from '../services/cardioTracking';

interface AttendanceCalendarProps {
  year: number;
  month: number;
  onDatePress?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceCalendar({ year, month, onDatePress, onMonthChange }: AttendanceCalendarProps) {
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [cardioSessionDates, setCardioSessionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [workoutsForDate, setWorkoutsForDate] = useState<WorkoutHistoryItem[]>([]);
  const [cardioForDate, setCardioForDate] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  // Generate calendar grid
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday of the week

    const days = [];
    const currentDate = new Date(startDate);

    // Helper function to format date as YYYY-MM-DD in local timezone
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Generate 6 weeks of calendar (42 days)
    for (let i = 0; i < 42; i++) {
      const dateString = formatLocalDate(currentDate);
      const attendanceData = attendance.find(a => a.date === dateString);
      const workoutCount = attendanceData?.count || 0;

      // Get today's date in local timezone for comparison
      const today = new Date();
      const todayString = formatLocalDate(today);

      days.push({
        date: new Date(currentDate),
        dateString,
        workoutCount,
        isCurrentMonth: currentDate.getMonth() === month - 1,
        isToday: dateString === todayString
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Get intensity color based on workout count using retro green theme
  const getIntensityColor = (count: number) => {
    if (count === 0) return 'transparent';
    if (count === 1) return theme.colors.neon; // Main retro green
    if (count === 2) return theme.colors.neonBright; // Brighter green
    return theme.colors.neonHover; // Hover green for 3+ workouts
  };

  // Load attendance data
  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const [attendanceData, cardioData] = await Promise.all([
        getMonthlyAttendance(year, month),
        getCardioSessionDates(year, month)
      ]);
      setAttendance(attendanceData.attendance);
      setCardioSessionDates(cardioData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle date selection
  const handleDatePress = async (date: string) => {
    // If consumer provided a handler, delegate to it (used by History screen to filter list)
    if (onDatePress) {
      onDatePress(date);
      return;
    }
    setSelectedDate(date);
    setLoadingWorkouts(true);
    setShowWorkoutModal(true);
    
    try {
      // Get all workouts and filter by date
      const allWorkouts = await getWorkoutHistory(1000, 0); // Get a large number to ensure we get all
      const dateWorkouts = allWorkouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        const workoutDateString = workoutDate.getFullYear() + '-' + 
          (workoutDate.getMonth() + 1).toString().padStart(2, '0') + '-' + 
          workoutDate.getDate().toString().padStart(2, '0');
        return workoutDateString === date;
      });
      setWorkoutsForDate(dateWorkouts);

  // Load cardio sessions for this date (inclusive) using local timezone boundaries
  const [y, m, d] = date.split('-').map(n => parseInt(n, 10));
  const startIso = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const endIso = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
      try {
        // Lazy import to avoid circular deps in some bundlers
        const cardio = await (await import('../services/cardioTracking')).getCardioSessionsForDateRange(startIso, endIso);
        setCardioForDate(cardio);
      } catch (err) {
        console.error('Error loading cardio for date:', err);
        setCardioForDate([]);
      }
    } catch (err) {
      console.error('Error loading workouts for date:', err);
      setWorkoutsForDate([]);
      setCardioForDate([]);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  // Handle workout item press
  const handleWorkoutPress = (workoutId: number) => {
    setShowWorkoutModal(false);
    router.push(`/history/${workoutId}`);
  };

  useEffect(() => {
    loadAttendance();
  }, [year, month]);

  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.neon} />
        <Text style={styles.loadingText}>LOADING CALENDAR...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>ERROR: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAttendance}>
          <Text style={styles.retryButtonText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month/Year Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            let newYear = year;
            let newMonth = month - 1;
            if (newMonth < 1) {
              newMonth = 12;
              newYear--;
            }
            onMonthChange?.(newYear, newMonth);
          }}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthYearText}>
          {MONTHS[month - 1]} {year}
        </Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            let newYear = year;
            let newMonth = month + 1;
            if (newMonth > 12) {
              newMonth = 1;
              newYear++;
            }
            onMonthChange?.(newYear, newMonth);
          }}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Days of Week Header */}
      <View style={styles.daysHeader}>
        {DAYS_OF_WEEK.map(day => (
          <Text key={day} style={styles.dayHeaderText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          const hasCardio = cardioSessionDates.includes(day.dateString);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                day.isToday && styles.todayCell,
                !day.isCurrentMonth && styles.otherMonthCell
              ]}
              onPress={() => handleDatePress(day.dateString)}
              activeOpacity={0.7}
            >
              <View style={styles.dayContent}>
                {day.workoutCount > 0 ? (
                  <View style={[
                    styles.dayWithWorkout,
                    { backgroundColor: getIntensityColor(day.workoutCount) }
                  ]}>
                    <Text style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.otherMonthText,
                      day.isToday && styles.todayText,
                      { color: 'black' }
                    ]}>
                      {day.date.getDate()}
                    </Text>
                  </View>
                ) : hasCardio ? (
                  <View style={[
                    styles.dayWithCardio,
                    { backgroundColor: 'rgba(255, 68, 68, 0.8)' } // Red for cardio
                  ]}>
                    <Text style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.otherMonthText,
                      day.isToday && styles.todayText,
                      { color: 'white' }
                    ]}>
                      {day.date.getDate()}
                    </Text>
                  </View>
                ) : (
                  <Text style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.otherMonthText,
                    day.isToday && styles.todayText
                  ]}>
                    {day.date.getDate()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Workout Details Modal */}
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : ''}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowWorkoutModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingWorkouts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.neon} />
                <Text style={styles.loadingText}>LOADING WORKOUTS...</Text>
              </View>
            ) : (workoutsForDate.length > 0 || cardioForDate.length > 0) ? (
              <ScrollView style={styles.workoutList}>
                {workoutsForDate.map((workout, index) => (
                  <TouchableOpacity 
                    key={workout.id} 
                    style={styles.workoutItem}
                    onPress={() => handleWorkoutPress(workout.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                      <Text style={styles.workoutTime}>{formatDate(workout.date)}</Text>
                    </View>
                    <View style={styles.workoutDetails}>
                      <Text style={styles.workoutDetail}>
                        Duration: {formatDuration(workout.duration)}
                      </Text>
                      <Text style={styles.workoutDetail}>
                        Exercises: {workout.exerciseCount}
                      </Text>
                      <Text style={styles.workoutDetail}>
                        Sets: {workout.totalSets}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {cardioForDate.map((session: any) => (
                  <TouchableOpacity
                    key={`cardio-${session.id}`}
                    style={[styles.workoutItem, { borderColor: '#FF4444' }]}
                    onPress={() => router.push(`/cardio/history/${session.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutName}>{session.name}</Text>
                      <Text style={styles.workoutTime}>{new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.workoutDetails}>
                      <Text style={styles.workoutDetail}>
                        Duration: {formatDuration(session.duration)}
                      </Text>
                      <Text style={styles.workoutDetail}>
                        Type: {session.type?.toUpperCase()}
                      </Text>
                      <Text style={styles.workoutDetail}>
                        Calories: {session.calories_burned || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noWorkoutContainer}>
                <Text style={styles.noWorkoutText}>NO SESSIONS THIS DAY</Text>
                <Text style={styles.noWorkoutSubtext}>Time to hit the gym!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthYearText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 24,
    letterSpacing: 2,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    padding: 2,
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  otherMonthText: {
    opacity: 0.5,
  },
  todayCell: {
    // Removed border to eliminate square outline
  },
  todayText: {
    color: theme.colors.neon,
    fontWeight: 'bold',
  },
  dayWithWorkout: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    width: 32,
    height: 32,
  },
  dayWithCardio: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    width: 32,
    height: 32,
  },
  attendanceIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    paddingTop: 16,
  },
  legendTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    opacity: 0.9,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#FF4444',
    fontFamily: theme.fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#FF4444',
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
    paddingBottom: 10,
  },
  modalTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 20,
    fontWeight: 'bold',
  },
  workoutList: {
    maxHeight: 400,
  },
  workoutItem: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  workoutTime: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    opacity: 0.8,
  },
  workoutDetails: {
    gap: 4,
  },
  workoutDetail: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  },
  noWorkoutContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noWorkoutText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  noWorkoutSubtext: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
}); 