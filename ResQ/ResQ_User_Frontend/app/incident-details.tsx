import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { LiveAmbulanceTracker } from '../components/LiveAmbulanceTracker';
import { StatusTimeline } from '../components/StatusTimeline';
import { HospitalCard } from '../components/HospitalCard';
import { colors } from '../constants/theme';
import { useWebSocket } from '../hooks/useWebSocket';

export default function IncidentDetailsScreen() {
  const { activeIncident } = useAppStore();
  const router = useRouter();
  
  // Initialize WebSocket connection when viewing active incident
  useWebSocket();

  if (!activeIncident) return null;

  return (
    <View style={styles.container}>
      <LiveAmbulanceTracker />
      
      <SafeAreaView style={styles.backButtonContainer} edges={['top']}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#dee1f7" />
        </Pressable>
      </SafeAreaView>
      
      <ScrollView 
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.incidentHeader}>
          <Text style={styles.incidentTitle}>
            {activeIncident.incidentType.toUpperCase()} EMERGENCY
          </Text>
          <View style={styles.severityBadge}>
            <Text style={styles.severityText}>Level {activeIncident.severity}</Text>
          </View>
        </View>
        <StatusTimeline />
        <HospitalCard />
        
        <Pressable 
          style={styles.endButton} 
          onPress={() => {
            useAppStore.getState().clearIncident();
            router.replace('/');
          }}
        >
          <Text style={styles.endButtonText}>END EMERGENCY TRACKING</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    margin: 16,
    backgroundColor: 'rgba(10, 15, 30, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  incidentTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  severityBadge: {
    backgroundColor: colors.sos,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'JetBrainsMono',
  },
  endButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.sos,
    padding: 16,
    marginTop: 32,
    alignItems: 'center',
  },
  endButtonText: {
    color: colors.sos,
    fontFamily: 'JetBrainsMono',
    fontSize: 14,
    fontWeight: '700',
  }
});
