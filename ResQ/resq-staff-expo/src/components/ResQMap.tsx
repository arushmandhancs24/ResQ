import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { generateWaypoints } from "../utils/routeHelper";

interface ResQMapProps {
  crewLat: number;
  crewLon: number;
  incidentLat?: number;
  incidentLon?: number;
  hospitalLat?: number;
  hospitalLon?: number;
  zoom?: number;
  showRouteLine?: boolean;
  routeStartLat?: number;
  routeStartLon?: number;
  routeWaypoints?: [number, number][]; // Snapped OSRM/Fallback waypoints
}

export default function ResQMap({
  crewLat,
  crewLon,
  incidentLat,
  incidentLon,
  hospitalLat,
  hospitalLon,
  zoom = 13,
  showRouteLine = true,
  routeStartLat,
  routeStartLon,
  routeWaypoints,
}: ResQMapProps) {
  const mapRef = useRef<MapView>(null);
  
  // Format waypoints for react-native-maps
  const formattedRoute = React.useMemo(() => {
    let route = routeWaypoints;
    if (!route && incidentLat && incidentLon) {
       route = generateWaypoints(
         routeStartLat ?? crewLat, 
         routeStartLon ?? crewLon, 
         incidentLat, 
         incidentLon, 
         16
       );
    } else if (!route && hospitalLat && hospitalLon) {
       route = generateWaypoints(
         routeStartLat ?? crewLat, 
         routeStartLon ?? crewLon, 
         hospitalLat, 
         hospitalLon, 
         16
       );
    }

    return route?.map(pt => ({ latitude: pt[0], longitude: pt[1] })) || [];
  }, [routeWaypoints, incidentLat, incidentLon, hospitalLat, hospitalLon, routeStartLat, routeStartLon, crewLat, crewLon]);

  useEffect(() => {
    if (mapRef.current) {
       // Fit bounds to markers
       const coords = [{ latitude: crewLat, longitude: crewLon }];
       if (incidentLat && incidentLon) coords.push({ latitude: incidentLat, longitude: incidentLon });
       if (hospitalLat && hospitalLon) coords.push({ latitude: hospitalLat, longitude: hospitalLon });
       
       if (coords.length > 1) {
         mapRef.current.fitToCoordinates(coords, {
           edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
           animated: true,
         });
       } else {
         mapRef.current.animateToRegion({
           latitude: crewLat,
           longitude: crewLon,
           latitudeDelta: 0.02,
           longitudeDelta: 0.02,
         }, 500);
       }
    }
  }, [crewLat, crewLon, incidentLat, incidentLon, hospitalLat, hospitalLon]);

  return (
    <View style={StyleSheet.absoluteFillObject} className="overflow-hidden border border-surface-variant bg-surface-container-lowest">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: crewLat,
          longitude: crewLon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        userInterfaceStyle="dark"
        customMapStyle={mapStyle} // Basic dark mode config
      >
        <Marker coordinate={{ latitude: crewLat, longitude: crewLon }} title="Ambulance (You)">
           <View className="items-center justify-center w-8 h-8 rounded-full bg-blue-600 border border-white">
              <Text className="text-white text-xs font-bold">🚑</Text>
           </View>
        </Marker>

        {incidentLat && incidentLon && (
          <Marker coordinate={{ latitude: incidentLat, longitude: incidentLon }} title="Incident Scene">
            <View className="items-center justify-center w-8 h-8 rounded-full bg-red-600 border border-white">
              <Text className="text-white text-xs font-bold">🆘</Text>
            </View>
          </Marker>
        )}

        {hospitalLat && hospitalLon && (
          <Marker coordinate={{ latitude: hospitalLat, longitude: hospitalLon }} title="Receiving Hospital">
            <View className="items-center justify-center w-8 h-8 rounded-full bg-emerald-500 border border-white">
              <Text className="text-white text-xs font-bold">🏥</Text>
            </View>
          </Marker>
        )}

        {showRouteLine && formattedRoute.length > 0 && (
          <>
            <Polyline coordinates={formattedRoute} strokeColor="#ef4444" strokeWidth={5} />
            <Polyline coordinates={formattedRoute} strokeColor="#ffffff" strokeWidth={2} lineDashPattern={[8, 12]} />
          </>
        )}
      </MapView>

      <View className="absolute right-2 bottom-2 z-50 bg-surface-container-low px-2 py-0.5 border border-surface-variant">
        <Text className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider font-bold">
          GPS SNAPPED SATFEED
        </Text>
      </View>
    </View>
  );
}

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#242f3e"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#746855"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#242f3e"}]
  }
];
