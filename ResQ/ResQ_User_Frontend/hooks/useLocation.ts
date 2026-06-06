import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store/appStore';
import { config } from '../constants/config';
import axios from 'axios';

interface LocationState {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<LocationState | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isMock, setIsMock] = useState(false);
  const { mockMode } = useAppStore();

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
      
      if (status === 'granted') {
        getLocation();
      }
    } catch (e) {
      console.warn('Error requesting location permission', e);
      setPermissionStatus('denied');
    }
  };

  const getLocation = async () => {
    if (mockMode) {
      // Mock coords: 12.9352° N, 77.6245° E (Koramangala, Bengaluru)
      setCoords({ latitude: 12.9352, longitude: 77.6245 });
      setAddress('Koramangala, Bengaluru');
      setIsMock(true);
      return;
    }
    
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      
      // Reverse geocode via Nominatim
      try {
        const response = await axios.get(
          `${config.nominatimUrl}/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}`
        );
        if (response.data && response.data.display_name) {
          // Keep it short
          const parts = response.data.display_name.split(',');
          setAddress(parts.slice(0, 2).join(', ').trim());
        }
      } catch (e) {
        console.warn('Reverse geocoding failed', e);
      }
      
      setIsMock(false);
    } catch (e) {
      console.warn('Error getting location', e);
    }
  };

  useEffect(() => {
    // Check initial permission
    (async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      
      // If undetermined, prompt the user immediately
      if (status === 'undetermined' && !mockMode) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      
      setPermissionStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
      
      if (status === 'granted' || mockMode) {
        getLocation();
      }
    })();
  }, [mockMode]);

  return {
    coords,
    address,
    permissionStatus,
    requestPermission,
    isMock
  };
}
