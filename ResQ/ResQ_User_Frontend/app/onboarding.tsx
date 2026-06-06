import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { colors } from '../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Help is one tap away',
    desc: 'When every second counts, ResQ dispatches the nearest ambulance to your exact GPS location automatically.',
    icon: 'heart-pulse',
    color: colors.sos
  },
  {
    id: 2,
    title: 'How it works',
    desc: '1. Tap SOS\n2. Ambulance dispatched automatically\n3. Track live on map',
    icon: 'ambulance',
    color: colors.statusBlue
  },
  {
    id: 3,
    title: 'Allow Location Access',
    desc: 'We need your precise location to route the ambulance accurately in an emergency.',
    icon: 'map-marker-radius',
    color: colors.statusGreen
  }
];

export default function OnboardingScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const router = useRouter();
  const { requestPermission, permissionStatus } = useLocation();

  const handleNext = async () => {
    if (slideIndex === 2) {
      if (permissionStatus !== 'granted') {
        await requestPermission();
      }
      await AsyncStorage.setItem('onboarded', 'true');
      router.replace('/(tabs)');
    } else {
      setSlideIndex(prev => prev + 1);
    }
  };

  const slide = SLIDES[slideIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={slide.icon as unknown} size={80} color={slide.color} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
          ))}
        </View>
        
        <Pressable style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {slideIndex === 2 ? (permissionStatus === 'granted' ? 'Get Started' : 'Enable Location & Start') : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    padding: 32,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.sos,
    width: 24,
  },
  button: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  }
});
