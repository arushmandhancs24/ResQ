import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface Props {
  coordinate: { latitude: number; longitude: number } | null;
  bearing: number;
  isArrived: boolean;
}

export const AmbulanceMarker = ({ coordinate, bearing, isArrived }: Props) => {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);
  const bounceScale = useSharedValue(1);

  // Since react-native-maps coordinate animation with Reanimated is complex on Android,
  // we rely on the Marker's own coordinate prop updates. 
  // For rotation, we can use a standard React state or Animated component.
  
  useEffect(() => {
    // Halo glow
    glowScale.value = withRepeat(
      withTiming(1.4, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1, false
    );
    glowOpacity.value = withRepeat(
      withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1, false
    );
  }, []);

  useEffect(() => {
    if (isArrived) {
      bounceScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1.0, { duration: 200 })
      );
    }
  }, [isArrived]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const markerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bearing}deg` },
      { scale: bounceScale.value }
    ]
  }));

  if (!coordinate) return null;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={true}
    >
      <View style={styles.container}>
        {!isArrived && <Animated.View style={[styles.glow, glowStyle]} />}
        <Animated.View style={[styles.markerBody, markerStyle]}>
          <MaterialCommunityIcons name="ambulance" size={18} color="#C53030" />
        </Animated.View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
  },
  markerBody: {
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C53030',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  }
});
