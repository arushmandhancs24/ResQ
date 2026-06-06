import React, { useEffect, useState } from 'react';
import { Polyline } from 'react-native-maps';
import { colors } from '../../constants/theme';

interface Props {
  positionHistory: Array<{ latitude: number; longitude: number }>;
  userLocation: { latitude: number; longitude: number } | null;
}

export const RoutePolyline = ({ positionHistory, userLocation }: Props) => {
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);

  useEffect(() => {
    if (positionHistory.length === 0 || !userLocation) return;
    
    const currentPos = positionHistory[0];
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentPos.longitude},${currentPos.latitude};${userLocation.longitude},${userLocation.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setRouteCoords(coords);
        }
      } catch (error) {
        console.error("Failed to fetch OSRM route:", error);
      }
    };
    
    fetchRoute();
  }, [positionHistory[0]?.latitude, positionHistory[0]?.longitude, userLocation?.latitude, userLocation?.longitude]);

  if (positionHistory.length === 0 || !userLocation) return null;

  return (
    <>
      {/* Route to destination following roads */}
      {routeCoords.length > 0 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor={colors.sos}
          strokeWidth={4}
        />
      )}
      
      {/* Fallback to straight line if route not loaded */}
      {routeCoords.length === 0 && (
        <Polyline
          coordinates={[positionHistory[0], userLocation]}
          strokeColor={colors.sos}
          strokeWidth={4}
          lineDashPattern={[8, 4]}
        />
      )}
      
      {/* Fading tail of where we've been */}
      {positionHistory.length > 1 && (
        <Polyline
          coordinates={[positionHistory[0], positionHistory[1]]}
          strokeColor={colors.sos}
          strokeWidth={4}
        />
      )}
      {positionHistory.length > 2 && (
        <Polyline
          coordinates={positionHistory.slice(1, 3)}
          strokeColor={`${colors.sos}99`}
          strokeWidth={4}
        />
      )}
      {positionHistory.length > 3 && (
        <Polyline
          coordinates={positionHistory.slice(2)}
          strokeColor={`${colors.sos}33`}
          strokeWidth={4}
        />
      )}
    </>
  );
};
