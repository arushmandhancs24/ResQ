import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { typography, colors } from '../../constants/theme';

interface Props {
  etaSeconds: number;
  isArrived: boolean;
}

export const ETACountdown = ({ etaSeconds, isArrived }: Props) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isArrived) {
      scale.value = 0;
      scale.value = withSpring(1, { damping: 12, stiffness: 90 });
    } else if (etaSeconds > 0 && etaSeconds < 120 && etaSeconds % 10 === 0) {
      scale.value = withSpring(1.05, {}, () => {
        scale.value = withTiming(1);
      });
    }
  }, [etaSeconds, isArrived]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  if (isArrived) {
    return (
      <Animated.View style={animatedStyle}>
        <Text style={[styles.text, { color: colors.statusGreen }]}>Arrived ✓</Text>
      </Animated.View>
    );
  }

  const mins = Math.floor(etaSeconds / 60);
  const secs = etaSeconds % 60;
  
  let formatted = '';
  if (mins > 0) {
    formatted = `${mins} min ${secs} sec`;
  } else {
    formatted = `${secs} sec`;
  }

  let color = colors.textPrimary;
  if (etaSeconds < 30) color = colors.sos;
  else if (etaSeconds < 120) color = '#D69E2E';

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.text, { color }]}>{formatted}</Text>
      <Text style={styles.subtitle}>away from you</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  text: {
    ...typography.display,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  }
});
