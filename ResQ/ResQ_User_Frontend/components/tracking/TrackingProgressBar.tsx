import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/theme';

interface Props {
  progress: number; // 0.0 to 1.0
  isUrgent: boolean; // ETA < 60s
}

export const TrackingProgressBar = ({ progress, isUrgent }: Props) => {
  const animatedWidth = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    animatedWidth.value = withTiming(progress * 100, { duration: 1000, easing: Easing.out(Easing.ease) });
  }, [progress]);

  useEffect(() => {
    if (isUrgent && progress < 1) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1, false
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isUrgent, progress]);

  const style = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.fill, style]}>
        <LinearGradient
          colors={[colors.sos, '#38A169']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 8,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginVertical: 12,
  },
  fill: {
    height: '100%',
  }
});
