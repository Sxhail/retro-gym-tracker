import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Modal, View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import theme from '../../styles/theme';
import SummaryCard from './SummaryCard';
import PRHighlights from './PRHighlights';
import BodyOverlayHeatmap from './BodyOverlayHeatmap';
import ActionsBar from './ActionsBar';
import { getWorkoutReportData, type WorkoutReport, type MuscleKey } from '../../services/workoutReport';
import { captureRef } from 'react-native-view-shot';

export type PostSessionReportHandle = {
  captureToImage: () => Promise<string>;
};

const PostSessionReportModal = forwardRef<PostSessionReportHandle, { workoutId: number; visible: boolean; onClose: () => void; onShare: (format: 'image'|'pdf') => Promise<void>; }>(function PostSessionReportModal({ workoutId, visible, onClose, onShare }, ref) {
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltipMuscle, setTooltipMuscle] = useState<MuscleKey | null>(null);
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const contentRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getWorkoutReportData(workoutId)
        .then(setReport)
        .finally(() => setLoading(false));
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.9);
      fade.setValue(0);
  setReport(null);
  setTooltipMuscle(null);
    }
  }, [visible, workoutId]);

  useImperativeHandle(ref, () => ({
    captureToImage: async () => {
      if (!contentRef.current) throw new Error('No content to capture');
      const uri = await captureRef(contentRef.current, {
        format: 'png',
        quality: 1,
      });
      return uri;
    },
  }));

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Animated.View ref={contentRef} style={{ width: '92%', maxWidth: 520, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 12, backgroundColor: theme.colors.background, padding: 16, opacity: fade, transform: [{ scale }] }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, marginBottom: 10 }}>POST-SESSION REPORT</Text>
          {loading || !report ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.neon} />
            </View>
          ) : (
            <>
              <SummaryCard totalSets={report.summary.totalSets} totalReps={report.summary.totalReps} totalVolume={report.summary.totalVolume} duration={report.summary.duration} />
              <View style={{ height: 12 }} />
              <PRHighlights prs={report.prs} />
              <View style={{ height: 12 }} />
              <BodyOverlayHeatmap muscleIntensity={report.muscleIntensity} onMusclePress={(m) => setTooltipMuscle(m)} />
              <ActionsBar
                onShareImage={() => onShare('image')}
                onSharePdf={() => onShare('pdf')}
                onClose={onClose}
              />
              {/* Tooltip Modal */}
              <Modal transparent visible={!!tooltipMuscle} animationType="fade" onRequestClose={() => setTooltipMuscle(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                  <View style={{ width: '88%', maxWidth: 420, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 10, padding: 16 }}>
                    <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 8 }}>
                      {tooltipMuscle} — Exercises this session
                    </Text>
                    {(() => {
                      const items = tooltipMuscle ? (report.muscleExercises[tooltipMuscle] || []) : [];
                      const top = items.slice(0, 6);
                      if (top.length === 0) {
                        return <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.body }}>No volume logged.</Text>;
                      }
                      return top.map((e) => (
                        <View key={`${e.exerciseId}-${e.exerciseName}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                          <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.body }}>{e.exerciseName}</Text>
                          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code }}>{Math.round(e.volume)}</Text>
                        </View>
                      ));
                    })()}
                    <View style={{ height: 10 }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text onPress={() => setTooltipMuscle(null)} style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16 }}>Close</Text>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

export default PostSessionReportModal;
