import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useApi } from './useApi';
import { startMockAmbulanceSimulation } from '../services/mock';
import MapView from 'react-native-maps';
import { useLocation } from './useLocation';

// Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bearing in degrees
function calculateBearing(startLat: number, startLon: number, destLat: number, destLon: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const toDeg = (value: number) => (value * 180) / Math.PI;

  const startLatRad = toRad(startLat);
  const destLatRad = toRad(destLat);
  const dLon = toRad(destLon - startLon);

  const y = Math.sin(dLon) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(dLon);

  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

export function useAmbulanceTracking() {
  const { 
    assignedAmbulance, 
    positionHistory,
    originalEtaSeconds,
    mockMode,
    activeIncident,
    updateAmbulanceLocation,
    updateAmbulanceStatus,
    updateEta
  } = useAppStore();
  
  const { coords: userCoords } = useLocation();
  const { getFleetStatus } = useApi();
  
  const [bearing, setBearing] = useState(0);
  const [distanceMetres, setDistanceMetres] = useState(0);
  const [isAutoFollowing, setIsAutoFollowing] = useState(true);
  
  const mapRef = useRef<MapView>(null);
  const trackingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const ambulancePosition = assignedAmbulance ? { latitude: assignedAmbulance.latitude, longitude: assignedAmbulance.longitude } : null;
  const etaSeconds = assignedAmbulance?.etaSeconds || 0;
  const originalEta = originalEtaSeconds || Math.max(etaSeconds, 1);
  const etaProgress = Math.min(Math.max(1 - (etaSeconds / originalEta), 0), 1);
  const ambulanceStatus = assignedAmbulance?.status || 'DISPATCHED';
  const isArrived = ambulanceStatus === 'ON_SCENE' || ambulanceStatus === 'AT_HOSPITAL' || ambulanceStatus === 'EN_ROUTE_HOSPITAL';

  // Calculate bearing and distance when position updates
  useEffect(() => {
    if (positionHistory.length >= 2) {
      const current = positionHistory[0];
      const previous = positionHistory[1];
      const newBearing = calculateBearing(previous.latitude, previous.longitude, current.latitude, current.longitude);
      setBearing(newBearing);
    }
    
    if (ambulancePosition && userCoords) {
      const dist = haversineDistance(
        ambulancePosition.latitude, 
        ambulancePosition.longitude, 
        userCoords.latitude, 
        userCoords.longitude
      );
      setDistanceMetres(dist);
    }
  }, [positionHistory, userCoords]);

  // Local ETA countdown ticker
  useEffect(() => {
    if (isArrived || etaSeconds <= 0) return;
    
    const ticker = setInterval(() => {
      // In real life, we only decrement if we haven't received a fresh ETA from server recently.
      // But for smooth UI, we tick down.
      if (etaSeconds > 0) {
        updateEta(etaSeconds - 1);
      }
    }, 1000);
    
    return () => clearInterval(ticker);
  }, [etaSeconds, isArrived, updateEta]);

  // Handle camera auto-follow
  useEffect(() => {
    if (!isAutoFollowing || !mapRef.current || !ambulancePosition) return;
    
    if (isArrived && userCoords) {
      // Show both user and ambulance when arrived
      mapRef.current.fitToCoordinates([ambulancePosition, userCoords], {
        edgePadding: { top: 80, right: 80, bottom: 320, left: 80 },
        animated: true,
      });
    } else {
      // Follow ambulance
      let zoom = 14;
      if (etaSeconds < 120) zoom = 16;
      else if (etaSeconds < 300) zoom = 15;
      
      mapRef.current.animateCamera({
        center: ambulancePosition,
        zoom,
        pitch: 0,
        heading: 0,
      }, { duration: 1000 });
    }
  }, [ambulancePosition, isAutoFollowing, isArrived, etaSeconds, userCoords]);

  // Mock Mode Simulation
  useEffect(() => {
    if (mockMode && userCoords && activeIncident && !isArrived) {
      const cleanup = startMockAmbulanceSimulation(
        userCoords.latitude,
        userCoords.longitude,
        (lat, lon, eta) => {
          updateAmbulanceLocation(lat, lon);
          updateEta(eta);
        },
        (status) => {
          updateAmbulanceStatus(status);
        }
      );
      return cleanup;
    }
  }, [mockMode, userCoords, activeIncident?.incidentId]);

  // Real mode fallback polling (if WS fails or to supplement WS)
  useEffect(() => {
    if (!mockMode && activeIncident && !isArrived) {
      trackingIntervalRef.current = setInterval(async () => {
        try {
          const fleet = await getFleetStatus();
          const me = fleet.find((f: unknown) => f.id === assignedAmbulance?.id);
          if (me) {
            updateAmbulanceLocation(me.latitude, me.longitude);
            if (me.status !== ambulanceStatus) {
              updateAmbulanceStatus(me.status);
            }
          }
        } catch (e) {
          // Silent catch
        }
      }, 8000);
      
      return () => {
        if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      };
    }
  }, [mockMode, activeIncident?.incidentId, isArrived, assignedAmbulance?.id]);

  const pauseAutoFollow = useCallback(() => setIsAutoFollowing(false), []);
  const resumeAutoFollow = useCallback(() => {
    setIsAutoFollowing(true);
    if (mapRef.current && ambulancePosition && userCoords) {
      mapRef.current.fitToCoordinates([ambulancePosition, userCoords], {
        edgePadding: { top: 80, right: 40, bottom: 320, left: 40 },
        animated: true,
      });
    }
  }, [ambulancePosition, userCoords]);

  const fitMapToMarkers = useCallback(() => {
    if (mapRef.current && ambulancePosition && userCoords) {
       mapRef.current.fitToCoordinates([ambulancePosition, userCoords], {
        edgePadding: { top: 80, right: 40, bottom: 320, left: 40 },
        animated: true,
      });
    }
  }, [ambulancePosition, userCoords]);

  return {
    ambulancePosition,
    positionHistory,
    bearing,
    distanceMetres,
    etaSeconds,
    etaProgress,
    originalEtaSeconds: originalEta,
    ambulanceStatus,
    isArrived,
    isAutoFollowing,
    pauseAutoFollow,
    resumeAutoFollow,
    mapRef,
    fitMapToMarkers
  };
}
