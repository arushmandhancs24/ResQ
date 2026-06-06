import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { LiveAmbulanceTracker } from '../../components/LiveAmbulanceTracker';
import { colors } from '../../constants/theme';
import MapView, { Marker } from 'react-native-maps';
import { useLocation } from '../../hooks/useLocation';

export default function TrackScreen() {
  const { activeIncident } = useAppStore();
  const { coords } = useLocation();
  const router = useRouter();

  if (!activeIncident) {
    return (
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFill}
          userInterfaceStyle="dark"
          initialRegion={coords ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          } : undefined}
        >
          {coords && (
            <Marker coordinate={coords}>
              <View style={styles.idleMarker} />
            </Marker>
          )}
        </MapView>
        
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>No active emergency</Text>
          <Text style={styles.overlaySub}>Stay safe. Your location is visible to you.</Text>
        </View>

        <Pressable 
          style={styles.floatingSOS}
          onPress={() => router.push('/')}
        >
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LiveAmbulanceTracker fullScreen={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  idleMarker: {
    width: 16,
    height: 16,
    backgroundColor: colors.mapPin,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(28, 32, 48, 0.9)',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  overlaySub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  floatingSOS: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  sosText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  }
});
