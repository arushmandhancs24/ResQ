import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useAmbulanceTracking } from '../hooks/useAmbulanceTracking';
import { useLocation } from '../hooks/useLocation';
import { AmbulanceMarker } from './tracking/AmbulanceMarker';
import { UserLocationMarker } from './tracking/UserLocationMarker';
import { RoutePolyline } from './tracking/RoutePolyline';
import { TrackingSheet } from './tracking/TrackingSheet';
import { RecenterButton } from './tracking/RecenterButton';

export const LiveAmbulanceTracker = ({ fullScreen = false }: { fullScreen?: boolean }) => {
  const { coords: userCoords } = useLocation();
  const {
    ambulancePosition,
    positionHistory,
    bearing,
    isArrived,
    isAutoFollowing,
    pauseAutoFollow,
    resumeAutoFollow,
    mapRef
  } = useAmbulanceTracking();

  const initialRegion = userCoords ? {
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : undefined;

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onPanDrag={pauseAutoFollow}
        // CartoDB dark matter tile fallback via urlTemplate is available, but for standard expo-maps 
        // on bare/managed we'll use custom map style JSON or standard dark mode if available.
        userInterfaceStyle="dark"
        pitchEnabled={false}
      >
        <RoutePolyline 
          positionHistory={positionHistory} 
          userLocation={userCoords} 
        />
        
        <UserLocationMarker coordinate={userCoords} />
        
        <AmbulanceMarker 
          coordinate={ambulancePosition} 
          bearing={bearing} 
          isArrived={isArrived} 
        />
      </MapView>

      <RecenterButton 
        visible={!isAutoFollowing && !isArrived && ambulancePosition !== null} 
        onPress={resumeAutoFollow} 
      />

      <TrackingSheet />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '65%',
    width: '100%',
  },
  fullScreen: {
    height: '100%',
  }
});
