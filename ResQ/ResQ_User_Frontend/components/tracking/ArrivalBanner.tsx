import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../../constants/theme';

interface Props {
  visible: boolean;
}

export const ArrivalBanner = ({ visible }: Props) => {
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 12, stiffness: 90 });
    } else {
      translateY.value = withSpring(-100);
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, style]}>
      <Text style={styles.title}>✅ Your ambulance has arrived</Text>
      <Text style={styles.subtitle}>Help is here. Stay calm.</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(39, 103, 73, 0.95)',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  }
});
