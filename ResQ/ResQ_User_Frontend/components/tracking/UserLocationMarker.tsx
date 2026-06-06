import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { colors } from '../../constants/theme';

interface Props {
  coordinate: { latitude: number; longitude: number } | null;
}

export const UserLocationMarker = ({ coordinate }: Props) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1, false
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1, false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!coordinate) return null;

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.container}>
        <Animated.View style={[styles.ring, animatedStyle]} />
        <View style={styles.dot} />
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
  ring: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: colors.mapPin,
  },
  dot: {
    width: 12,
    height: 12,
    backgroundColor: colors.mapPin,
    borderWidth: 2,
    borderColor: '#FFF',
  }
});
