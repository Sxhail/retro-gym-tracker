import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Animated, Vibration } from 'react-native';
import theme from '../styles/theme';
import { useCardioSession } from '../context/CardioSessionContext';

export default function GlobalCardioPhaseNotification() {
  const { setOnPhaseComplete } = useCardioSession();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const callbackSetRef = useRef(false);

  useEffect(() => {
    if (!callbackSetRef.current) {
      callbackSetRef.current = true;
      setOnPhaseComplete((event) => {
        let title = '';
        let subtitle = '';
        switch (event) {
          case 'hiit_work_complete':
            title = 'HIIT PHASE';
            subtitle = 'WORK COMPLETE';
            break;
          case 'hiit_rest_complete':
            title = 'HIIT PHASE';
            subtitle = 'REST COMPLETE';
            break;
          case 'walk_run_run_complete':
            title = 'WALK - RUN';
            subtitle = 'RUN COMPLETE';
            break;
          case 'walk_run_walk_complete':
            title = 'WALK - RUN';
            subtitle = 'WALK COMPLETE';
            break;
        }
        Vibration.vibrate(300);
        setMessage(`${title}|${subtitle}`);
        setVisible(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        setTimeout(() => {
          Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
            setVisible(false);
          });
        }, 2000);
      });
    }
    return () => {
      if (callbackSetRef.current) {
        setOnPhaseComplete(null);
        callbackSetRef.current = false;
      }
    };
  }, [setOnPhaseComplete, fadeAnim]);

  if (!visible) return null;

  const [titleText, subtitleText] = message.split('|');

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent pointerEvents="none">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Animated.View style={{
          opacity: fadeAnim,
          backgroundColor: theme.colors.background,
          borderWidth: 2,
          borderColor: theme.colors.neon,
          borderRadius: 8,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.heading,
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 4,
            textAlign: 'center',
          }}>{titleText}</Text>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.code,
            fontSize: 14,
            opacity: 0.8,
            textAlign: 'center',
          }}>{subtitleText}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
