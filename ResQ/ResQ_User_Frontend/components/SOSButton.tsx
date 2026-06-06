import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing,
  withSpring
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface SOSButtonProps {
  onPress: () => void;
  onLongPress: () => void;
  isSubmitting?: boolean;
}

const PulseRing = ({ delay, scaleTo }: { delay: number, scaleTo: number }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    setTimeout(() => {
      scale.value = withRepeat(
        withTiming(scaleTo, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1, false
      );
    }, delay);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.ring, style, { backgroundColor: colors.sosPulse }]} />
  );
};

export const SOSButton: React.FC<SOSButtonProps> = ({ onPress, onLongPress, isSubmitting }) => {
  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9, { damping: 10, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress();
  };

  return (
    <View style={styles.container}>
      <PulseRing delay={0} scaleTo={2.0} />
      <PulseRing delay={400} scaleTo={1.7} />
      <PulseRing delay={800} scaleTo={1.4} />
      
      <Animated.View style={[animatedButtonStyle, styles.buttonWrapper]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          onLongPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onLongPress();
          }}
          delayLongPress={800}
          style={styles.button}
          accessibilityLabel="Emergency SOS button. Tap to request an ambulance."
          accessibilityRole="button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <MaterialCommunityIcons name="loading" size={48} color="#fff" />
          ) : (
            <Text style={styles.text}>SOS</Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 250,
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  buttonWrapper: {
    shadowColor: colors.sos,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  button: {
    width: 160,
    height: 160,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#E53E3E',
  },
  text: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  }
});
