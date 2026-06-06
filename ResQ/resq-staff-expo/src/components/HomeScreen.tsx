import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import * as Location from 'expo-location';
import {
  Compass,
  Radio,
  Power,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Building2,
  Users,
  MapPin,
} from "lucide-react-native";
import { AmbulanceStatus, Ambulance, CrewShift } from "../types";

interface HomeScreenProps {
  shift: CrewShift;
  status: AmbulanceStatus;
  statusChangedAt: Date;
  latitude: number;
  longitude: number;
  gpsActive: boolean;
  nearbyFleet: Ambulance[];
  onStatusChange: (newStatus: AmbulanceStatus) => Promise<void>;
  onRefreshFleet: () => Promise<void>;
  isMockActive: boolean;
}

export default function HomeScreen({
  shift,
  status,
  statusChangedAt,
  latitude,
  longitude,
  gpsActive,
  nearbyFleet,
  onStatusChange,
  onRefreshFleet,
  isMockActive,
}: HomeScreenProps) {
  const [timeElapsedStr, setTimeElapsedStr] = useState<string>("0h 0m 0s");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [address, setAddress] = useState<string>("Locating...");
  const lastGeocodeCoords = useRef<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      if (lastGeocodeCoords.current) {
        const dLat = latitude - lastGeocodeCoords.current.lat;
        const dLon = longitude - lastGeocodeCoords.current.lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < 0.001) return; // Only update if moved ~100m
      }
      try {
        const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result) {
          const formatted = [result.name, result.street, result.city].filter(Boolean).join(", ");
          setAddress(formatted || "Unknown Location");
          lastGeocodeCoords.current = { lat: latitude, lon: longitude };
        }
      } catch (e) { console.error(e); }
    };
    const timer = setTimeout(fetchAddress, 1000);
    return () => clearTimeout(timer);
  }, [latitude, longitude]);

  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();
      const diffMs = now.getTime() - statusChangedAt.getTime();
      const totalSecs = Math.floor(diffMs / 1000);
      if (totalSecs < 0) {
        setTimeElapsedStr("0s");
        return;
      }
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      
      if (hrs > 0) {
        setTimeElapsedStr(`${hrs}h ${mins}m ${secs}s`);
      } else if (mins > 0) {
        setTimeElapsedStr(`${mins}m ${secs}s`);
      } else {
        setTimeElapsedStr(`${secs}s`);
      }
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [statusChangedAt]);

  const handleFleetRefreshLocal = async () => {
    setIsRefreshing(true);
    await onRefreshFleet();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStatusStyles = (curStatus: AmbulanceStatus) => {
    switch (curStatus) {
      case "AVAILABLE":
        return {
          bg: "bg-secondary/5 border-secondary/30",
          text: "text-secondary",
          pillBg: "bg-secondary",
          label: "Available",
          sub: "Awaiting incident dispatch logs from control centre",
          icon: <CheckCircle size={48} color="#3b82f6" />,
        };
      case "DISPATCHED":
        return {
          bg: "bg-primary-container/10 border-primary-container/30",
          text: "text-primary-container",
          pillBg: "bg-primary-container",
          label: "Dispatched",
          sub: "Assigned to an active incident. Respond immediately",
          icon: <AlertTriangle size={48} color="#ef4444" />,
        };
      case "EN_ROUTE_HOSPITAL":
        return {
          bg: "bg-tertiary/10 border-tertiary/30",
          text: "text-tertiary",
          pillBg: "bg-tertiary",
          label: "En Route Hospital",
          sub: "Transporting patient to selected hospital destination",
          icon: <Building2 size={48} color="#f59e0b" />,
        };
      case "AT_HOSPITAL":
        return {
          bg: "bg-tertiary-container/10 border-tertiary-container/30",
          text: "text-tertiary-container",
          pillBg: "bg-tertiary-container",
          label: "At Hospital",
          sub: "Handoff process in progress with emergency ward staff",
          icon: <Building2 size={48} color="#fbbf24" />,
        };
      case "RETURNING":
        return {
          bg: "bg-outline/10 border-outline/30",
          text: "text-outline",
          pillBg: "bg-outline",
          label: "Returning",
          sub: "Clearing incident scene, returning towards sector base",
          icon: <RotateCcw size={48} color="#94a3b8" />,
        };
      default:
        return {
          bg: "bg-surface border-surface-variant",
          text: "text-on-surface-variant",
          pillBg: "bg-surface-variant",
          label: "Offline",
          sub: "Unit offline. No dispatch notifications are monitored",
          icon: <Power size={48} color="#cbd5e1" />,
        };
    }
  };

  const statusStyle = getStatusStyles(status);

  const fleetSummary = nearbyFleet.reduce(
    (acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusesToDisplay: { key: AmbulanceStatus; label: string; color: string }[] = [
    { key: "AVAILABLE", label: "Available", color: "bg-secondary" },
    { key: "DISPATCHED", label: "Dispatched", color: "bg-primary-container" },
    { key: "EN_ROUTE_HOSPITAL", label: "En Route Hosp", color: "bg-tertiary" },
    { key: "AT_HOSPITAL", label: "At Hospital", color: "bg-tertiary-container" },
    { key: "RETURNING", label: "Returning", color: "bg-outline" },
    { key: "OFFLINE", label: "Offline", color: "bg-surface-variant" },
  ];

  return (
    <ScrollView className="flex-1 bg-[#0B1012] px-4 py-6">
      {/* 1. Main Status Indicator Card */}
      <View className={`p-5 border ${statusStyle.bg} mb-5 relative`}>
        <View className={`absolute top-0 bottom-0 left-0 w-[4px] ${statusStyle.pillBg}`} />
        
        <View className="flex-row items-center gap-4 pl-1">
          {statusStyle.icon}
          <View className="flex-1">
            <Text className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Current Fleet Status</Text>
            <Text className="text-xl font-bold uppercase tracking-tight text-white mt-1 mb-1">
              STATUS // <Text className={statusStyle.text}>{statusStyle.label}</Text>
            </Text>
            <Text className="text-xs text-on-surface-variant leading-tight">{statusStyle.sub}</Text>
          </View>
        </View>

        <View className="flex-row border-t border-surface-variant mt-5 pt-4 text-xs pl-1">
          <View className="flex-1">
            <Text className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Time in State</Text>
            <Text className="text-sm font-bold text-white mt-1">{timeElapsedStr}</Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Live GPS Pulse</Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              {gpsActive ? (
                <>
                  <View className="h-2 w-2 rounded-full bg-secondary"></View>
                  <Text className="text-secondary tracking-wider text-xs font-bold">ACTIVE</Text>
                </>
              ) : (
                <>
                  <View className="h-2 w-2 rounded-full bg-primary-container"></View>
                  <Text className="text-primary-container tracking-wider text-xs font-bold">DENIED</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* 2. Quick Action Buttons */}
      <View className="mb-5">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1 mb-3">Quick Action Logs</Text>
        
        {status === "OFFLINE" ? (
          <TouchableOpacity
            onPress={() => onStatusChange("AVAILABLE")}
            className="w-full h-12 bg-secondary flex-row items-center justify-center gap-2"
          >
            <Power size={20} color="#fff" />
            <Text className="text-white font-bold tracking-widest uppercase">Go Online (AVAILABLE)</Text>
          </TouchableOpacity>
        ) : (
          <View className="gap-3">
            {(status === "RETURNING" || status === "AT_HOSPITAL" || status === "EN_ROUTE_HOSPITAL") && (
              <TouchableOpacity
                onPress={() => onStatusChange("AVAILABLE")}
                className="w-full h-12 bg-secondary flex-row items-center justify-center gap-2"
              >
                <CheckCircle size={20} color="#fff" />
                <Text className="text-white font-bold tracking-widest uppercase">Mark Available Now</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => onStatusChange("OFFLINE")}
              className="w-full h-11 bg-surface-variant border border-surface-variant flex-row items-center justify-center gap-2"
            >
              <Power size={16} color="#ef4444" />
              <Text className="text-white font-bold tracking-widest uppercase text-xs">Go Offline (Stand Down)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. Live Location Telemetry Panel */}
      <View className="p-4 bg-surface border border-surface-variant relative mb-5">
        <View className="absolute left-0 top-0 bottom-0 w-[4px] bg-secondary" />
        <View className="flex-row items-center gap-2.5 border-b border-surface-variant pb-2.5 mb-2.5 pl-1">
          <Compass size={16} color="#3b82f6" />
          <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Crew Location Telemetry</Text>
        </View>
        
        <View className="flex-row pl-1">
          <View className="flex-1 flex-row items-start gap-1.5">
            <MapPin size={14} color="#cbd5e1" className="mt-0.5" />
            <View>
              <Text className="text-[9px] font-bold text-on-surface-variant uppercase">Current Address</Text>
              <Text className="text-xs font-bold text-white tracking-wide mt-0.5 pr-2">{address}</Text>
            </View>
          </View>
        </View>
        
        {isMockActive && (
          <View className="mt-3 pt-2.5 border-t border-surface-variant flex-row items-center gap-1.5 pl-1">
            <Radio size={12} color="#f59e0b" />
            <Text className="text-[10px] text-tertiary">Simulated movement active. Coords drifting.</Text>
          </View>
        )}
      </View>

      {/* 4. Mini Fleet Panel */}
      <View className="p-4 bg-surface border border-surface-variant relative mb-6">
        <View className="absolute left-0 top-0 bottom-0 w-[4px] bg-secondary" />
        <View className="flex-row items-center justify-between border-b border-surface-variant pb-2.5 mb-3 pl-1">
          <View className="flex-row items-center gap-2">
            <Users size={16} color="#3b82f6" />
            <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nearby Division Fleet</Text>
          </View>
          <TouchableOpacity
            onPress={handleFleetRefreshLocal}
            disabled={isRefreshing}
            className="flex-row items-center gap-1 bg-surface-container border border-surface-variant py-1 px-2"
          >
            <RefreshCw size={12} color={isRefreshing ? "#3b82f6" : "#cbd5e1"} />
            <Text className="text-[11px] font-bold text-white">Refresh</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap pl-1 mb-1">
          {statusesToDisplay.map((st) => {
            const count = fleetSummary[st.key] || 0;
            return (
              <View key={st.key} className="w-[48%] flex-row items-center justify-between p-2 mb-2 mr-2 bg-surface-container-low border border-surface-variant">
                <View className="flex-row items-center gap-1.5 flex-1">
                  <View className={`w-2 h-2 ${st.color}`} />
                  <Text className="text-[11px] font-medium text-on-surface-variant truncate" numberOfLines={1}>{st.label}</Text>
                </View>
                <Text className="text-[11px] font-bold text-white bg-surface px-1.5 py-0.5 border border-surface-variant">
                  {count}
                </Text>
              </View>
            );
          })}
        </View>

        {nearbyFleet.length > 0 && (
          <View className="mt-3 pl-1">
            <Text className="text-[9px] uppercase text-on-surface-variant tracking-wider mb-2">Live Active Fleet Units</Text>
            {nearbyFleet.map((vehicle) => (
              <View
                key={vehicle.id}
                className="flex-row items-center justify-between py-2 px-2 mb-1 bg-surface-container-lowest border border-surface-variant"
              >
                <Text className="text-white text-[10px] font-bold">{vehicle.vehicle_number}</Text>
                <View className="bg-surface border border-surface-variant px-1.5 py-0.5">
                   <Text className="text-[9px] font-bold uppercase text-on-surface-variant">{vehicle.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
