import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '../constants/theme';
import { useAppStore } from '../store/appStore';
import { useAmbulanceTracking } from '../hooks/useAmbulanceTracking';

const STEPS = [
  { id: 'pending', label: 'SOS Sent' },
  { id: 'dispatched', label: 'Ambulance Dispatched' },
  { id: 'en_route', label: 'En Route to You' },
  { id: 'on_scene', label: 'Arrived at Scene' },
  { id: 'en_route_hospital', label: 'En Route to Hospital' },
  { id: 'at_hospital', label: 'Arrived at Hospital' },
];

const AnimatedDots = () => {
  const o1 = useSharedValue(0.3);
  const o2 = useSharedValue(0.3);
  const o3 = useSharedValue(0.3);

  useEffect(() => {
    o1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    setTimeout(() => o2.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false), 200);
    setTimeout(() => o3.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false), 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: o1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: o2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: o3.value }));

  return (
    <View style={{ flexDirection: 'row', marginTop: 4, marginLeft: 2 }}>
      <Animated.Text style={[styles.dot, s1]}>●</Animated.Text>
      <Animated.Text style={[styles.dot, s2]}>●</Animated.Text>
      <Animated.Text style={[styles.dot, s3]}>●</Animated.Text>
    </View>
  );
};

export const StatusTimeline = () => {
  const { activeIncident, assignedAmbulance, destinationHospital } = useAppStore();
  const { etaSeconds } = useAmbulanceTracking();

  if (!activeIncident) return null;

  const currentStatusIndex = STEPS.findIndex(s => s.id === activeIncident.status);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStatusIndex || activeIncident.status === 'resolved';
        const isActive = index === currentStatusIndex && activeIncident.status !== 'resolved';
        
        return (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              {isCompleted ? (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.statusGreen} />
              ) : isActive ? (
                <MaterialCommunityIcons name="radiobox-marked" size={20} color={colors.statusBlue} />
              ) : (
                <MaterialCommunityIcons name="circle-outline" size={20} color={colors.textMuted} />
              )}
              {index < STEPS.length - 1 && (
                <View style={[styles.line, isCompleted && styles.lineCompleted]} />
              )}
            </View>
            <View style={styles.contentContainer}>
              <Text style={[
                styles.label,
                (isCompleted || isActive) && styles.labelActive,
                isActive && { color: colors.statusBlue }
              ]}>
                {step.label} {isActive && '← current'}
              </Text>
              
              {isActive && step.id === 'en_route' && (
                <View style={styles.activeDetails}>
                  <Text style={styles.subtext}>~{Math.ceil(etaSeconds / 60)} min remaining</Text>
                  <AnimatedDots />
                </View>
              )}
              
              {step.id === 'dispatched' && isCompleted && assignedAmbulance && (
                <Text style={styles.subtext}>{assignedAmbulance.vehicleNumber}</Text>
              )}
              
              {step.id === 'en_route_hospital' && (isCompleted || isActive) && destinationHospital && (
                <Text style={styles.subtext}>→ {destinationHospital.name}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    minHeight: 48,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: colors.statusGreen,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 24,
  },
  label: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  activeDetails: {
    marginTop: 4,
  },
  dot: {
    color: colors.statusBlue,
    fontSize: 12,
    marginRight: 4,
  }
});
