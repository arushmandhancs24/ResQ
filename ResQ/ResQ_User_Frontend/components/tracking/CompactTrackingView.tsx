import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAmbulanceTracking } from '../../hooks/useAmbulanceTracking';
import { TrackingProgressBar } from './TrackingProgressBar';
import { ETACountdown } from './ETACountdown';
import { colors } from '../../constants/theme';

export const CompactTrackingView = () => {
  const { assignedAmbulance, activeIncident } = useAppStore();
  const { etaSeconds, etaProgress, ambulanceStatus, isArrived } = useAmbulanceTracking();

  if (!assignedAmbulance || !activeIncident) return null;

  const isUrgent = etaSeconds < 60;

  const statusLabels: Record<string, string> = {
    'DISPATCHED': '🚑 Ambulance Assigned',
    'EN_ROUTE': '🚑 Ambulance En Route',
    'ON_SCENE': '✅ Ambulance Arrived',
    'EN_ROUTE_HOSPITAL': '🏥 Heading to Hospital',
    'AT_HOSPITAL': '✅ Arrived at Hospital',
  };

  const statusText = statusLabels[ambulanceStatus] || '🚑 Ambulance En Route';

  return (
    <View style={styles.container}>
      <Text style={styles.statusLabel}>{statusText}</Text>
      
      <TrackingProgressBar progress={etaProgress} isUrgent={isUrgent} />
      
      <View style={styles.etaContainer}>
        <ETACountdown etaSeconds={etaSeconds} isArrived={isArrived} />
      </View>
      
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{assignedAmbulance.vehicleNumber}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{activeIncident.incidentType.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statusLabel: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  etaContainer: {
    marginVertical: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  }
});
