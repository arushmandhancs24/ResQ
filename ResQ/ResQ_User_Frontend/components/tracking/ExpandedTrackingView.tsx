import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAmbulanceTracking } from '../../hooks/useAmbulanceTracking';
import { TrackingProgressBar } from './TrackingProgressBar';
import { ETACountdown } from './ETACountdown';
import { StepTracker } from './StepTracker';
import { colors } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIncident } from '../../hooks/useIncident';

export const ExpandedTrackingView = () => {
  const { assignedAmbulance, destinationHospital } = useAppStore();
  const { etaSeconds, etaProgress, distanceMetres, isArrived } = useAmbulanceTracking();
  const { cancelIncident } = useIncident();

  if (!assignedAmbulance) return null;

  const handleCall = () => {
    Linking.openURL('tel:108');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.statusLabel}>🚑 Ambulance En Route</Text>
          <ETACountdown etaSeconds={etaSeconds} isArrived={isArrived} />
        </View>
      </View>
      
      <TrackingProgressBar progress={etaProgress} isUrgent={etaSeconds < 60} />
      
      <Text style={styles.sectionTitle}>──────── STEP TRACKER ────────</Text>
      <StepTracker />
      
      <Text style={styles.sectionTitle}>──────── AMBULANCE INFO ───────</Text>
      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="ambulance" size={20} color={colors.textPrimary} />
          <Text style={styles.infoText}>{assignedAmbulance.vehicleNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.textPrimary} />
          <Text style={styles.infoText}>
            {distanceMetres < 200 ? <Text style={{ color: colors.statusGreen }}>Nearby</Text> : `${(distanceMetres / 1000).toFixed(1)} km away`}
          </Text>
        </View>
      </View>
      
      {destinationHospital && (
        <>
          <Text style={styles.sectionTitle}>──────── HOSPITAL INFO ────────</Text>
          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="hospital-building" size={20} color={colors.textPrimary} />
              <Text style={styles.infoText}>{destinationHospital.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="medical-bag" size={20} color={colors.textPrimary} />
              <Text style={styles.infoText}>
                {destinationHospital.specialties[0]} Unit · {destinationHospital.erCapacity} beds {destinationHospital.is24x7 ? '· 24/7' : ''}
              </Text>
            </View>
          </View>
        </>
      )}
      
      <View style={styles.actions}>
        <Pressable style={styles.callButton} onPress={handleCall}>
          <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
          <Text style={styles.callButtonText}>Call 108</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={cancelIncident}>
          <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  statusLabel: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.border,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginVertical: 16,
  },
  infoBlock: {
    backgroundColor: colors.surfaceAlt,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.statusGreen,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  }
});
