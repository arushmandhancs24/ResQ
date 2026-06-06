import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform } from "react-native";
import {
  Compass,
  MapPin,
  Clock,
  CheckSquare,
  Square,
  ChevronRight,
  ShieldAlert,
  Building2,
  AlertCircle,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from "lucide-react-native";
import {
  ActiveIncidentState,
  Hospital,
  Incident,
  AmbulanceStatus,
  MOCK_HOSPITALS,
} from "../types";
import ResQMap from "./ResQMap";
import { generateWaypoints } from "../utils/routeHelper";

interface ActiveIncidentScreenProps {
  activeIncident: ActiveIncidentState | null;
  crewLat: number;
  crewLon: number;
  backendUrl: string;
  unitId: number;
  isMockActive: boolean;
  onUpdateActiveJob: (updater: (prev: ActiveIncidentState | null) => ActiveIncidentState | null) => void;
  onStatusChange: (newStatus: AmbulanceStatus) => Promise<void>;
  onCompleteIncident: (summary: {
    incident: Incident;
    hospitalName: string;
    totalDuration: number;
    sceneDuration: number;
    transitDuration: number;
  }) => void;
  simulationSpeed: number;
  setSimulationSpeed: (val: number) => void;
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  snapToRoute: boolean;
  setSnapToRoute: (val: boolean) => void;
  simulateJitter: boolean;
  setSimulateJitter: (val: boolean) => void;
  useInterpolation: boolean;
  setUseInterpolation: (val: boolean) => void;
  routeMode: "real" | "fallback";
  setRouteMode: (val: "real" | "fallback") => void;
  routeLoading: boolean;
  routeStatusText: string;
  onResetSimulation: () => void;
  retrieveOsmRoute: (startLat: number, startLon: number, endLat: number, endLon: number) => Promise<[number, number][]>;
}

export default function ActiveIncidentScreen({
  activeIncident,
  crewLat,
  crewLon,
  backendUrl,
  unitId,
  isMockActive,
  onUpdateActiveJob,
  onStatusChange,
  onCompleteIncident,
  isPlaying,
  snapToRoute,
  simulateJitter,
  useInterpolation,
  routeMode,
  routeLoading,
  retrieveOsmRoute,
}: ActiveIncidentScreenProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [hospitalsList, setHospitalsList] = useState<Hospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [hospitalsError, setHospitalsError] = useState(false);

  useEffect(() => {
    if (!activeIncident) return;
    const interval = setInterval(() => {
      if (!isPlaying) return;
      onUpdateActiveJob((prev) => {
        if (!prev) return null;
        let onScenePlus = prev.onSceneTime;
        let hospitalPlus = prev.hospitalTime;
        if (prev.stage === 2) onScenePlus += 1;
        if (prev.stage === 5) hospitalPlus += 1;
        return {
          ...prev,
          totalTime: prev.totalTime + 1,
          onSceneTime: onScenePlus,
          hospitalTime: hospitalPlus,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeIncident ? true : false, isPlaying]);

  useEffect(() => {
    if (!activeIncident || activeIncident.stage !== 3) return;
    const fetchHospitals = async () => {
      setIsLoadingHospitals(true);
      setHospitalsError(false);
      const lat = activeIncident.incident.latitude;
      const lon = activeIncident.incident.longitude;
      const type = activeIncident.incident.incident_type;

      try {
        const response = await fetch(`${backendUrl}/hospital/recommend?lat=${lat}&lon=${lon}&incident_type=${type}`);
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const data = await response.json();
        if (data.recommendations && data.recommendations.length > 0) {
          setHospitalsList(data.recommendations);
          onUpdateActiveJob((prev) => prev ? { ...prev, selectedHospital: data.recommendations[0], originalRecommendedHospital: data.recommendations[0] } : null);
        } else throw new Error("Empty list");
      } catch (err) {
        setHospitalsError(true);
        const scoredHospitals = MOCK_HOSPITALS.map((hosp) => {
          const dist = getDistanceInKm(lat, lon, hosp.latitude, hosp.longitude);
          return { ...hosp, eta_seconds: Math.round(dist * 90) + 120 };
        }).sort((a, b) => {
          const aHasSpecialty = a.specialties.includes(type);
          const bHasSpecialty = b.specialties.includes(type);
          if (aHasSpecialty && !bHasSpecialty) return -1;
          if (!aHasSpecialty && bHasSpecialty) return 1;
          return (a.eta_seconds || 0) - (b.eta_seconds || 0);
        });
        const topHospitals = scoredHospitals.slice(0, 3);
        setHospitalsList(topHospitals);
        onUpdateActiveJob((prev) => prev ? { ...prev, selectedHospital: topHospitals[0], originalRecommendedHospital: topHospitals[0] } : null);
      } finally {
        setIsLoadingHospitals(false);
      }
    };
    fetchHospitals();
  }, [activeIncident?.stage]);

  if (!activeIncident) {
    return (
      <View className="flex-1 items-center justify-center p-6 border border-surface-variant bg-surface relative">
        <View className="absolute left-0 top-0 bottom-0 w-[4px] bg-secondary" />
        <View className="h-12 w-12 bg-surface-variant items-center justify-center mb-4 rounded-full">
          <ShieldAlert size={24} color="#cbd5e1" />
        </View>
        <Text className="text-sm font-bold uppercase tracking-widest text-white">No Active Assignments</Text>
        <Text className="text-xs text-on-surface-variant mt-1.5 text-center leading-5">
          Your ambulance status is configured as AVAILABLE. You will receive an audio/visual dispatch when a new call receives assignment.
        </Text>
      </View>
    );
  }

  const { incident, stage, selectedHospital, isOverridden, originalRecommendedHospital, totalTime, onSceneTime, hospitalTime } = activeIncident;

  const steps = [
    { num: 1, label: "En Route" },
    { num: 2, label: "On Scene" },
    { num: 3, label: "Patient Loaded" },
    { num: 4, label: "En Route Hosp" },
    { num: 5, label: "Hospital At" },
    { num: 6, label: "Complete" },
  ];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs < 10 ? "0" : ""}${remainingSecs}s`;
  };

  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleArrivedOnScene = async () => onUpdateActiveJob((prev) => (prev ? { ...prev, stage: 2 } : null));
  const handlePatientLoaded = () => onUpdateActiveJob((prev) => (prev ? { ...prev, stage: 3 } : null));
  const handleHospitalSelect = (hosp: Hospital) => {
    onUpdateActiveJob((prev) => {
      if (!prev) return null;
      const remainsSame = prev.originalRecommendedHospital ? hosp.id === prev.originalRecommendedHospital.id : true;
      return { ...prev, selectedHospital: hosp, isOverridden: !remainsSame };
    });
  };
  const handleConfirmHospital = async () => {
    if (!selectedHospital) return;
    await onStatusChange("EN_ROUTE_HOSPITAL");
    let waypoints: [number, number][] = [];
    try {
      if (routeMode === "real") waypoints = await retrieveOsmRoute(crewLat, crewLon, selectedHospital.latitude, selectedHospital.longitude);
      else waypoints = generateWaypoints(crewLat, crewLon, selectedHospital.latitude, selectedHospital.longitude, 16);
    } catch {
      waypoints = generateWaypoints(crewLat, crewLon, selectedHospital.latitude, selectedHospital.longitude, 16);
    }
    onUpdateActiveJob((prev) => (prev ? { ...prev, stage: 4, routeWaypoints: waypoints, routeIndex: 0 } : null));

    const url = Platform.select({
      ios: `maps://app?daddr=${selectedHospital.latitude},${selectedHospital.longitude}`,
      android: `google.navigation:q=${selectedHospital.latitude},${selectedHospital.longitude}`
    }) || `https://www.google.com/maps/dir/?api=1&destination=${selectedHospital.latitude},${selectedHospital.longitude}`;
    Linking.openURL(url).catch(() => {});
  };
  const handleArrivedAtHospital = async () => {
    await onStatusChange("AT_HOSPITAL");
    onUpdateActiveJob((prev) => (prev ? { ...prev, stage: 5 } : null));
  };
  const toggleChecklist = (field: "patientHanded" | "paperworkSubmitted" | "ambulanceCleaned") => {
    onUpdateActiveJob((prev) => prev ? { ...prev, [field]: !prev[field] } : null);
  };
  const handleHandoffComplete = async () => {
    await onStatusChange("RETURNING");
    onUpdateActiveJob((prev) => (prev ? { ...prev, stage: 6 } : null));
  };
  const handleReturnToBase = async () => {
    const transitSecs = activeIncident.totalTime - (activeIncident.onSceneTime + activeIncident.hospitalTime);
    onCompleteIncident({
      incident,
      hospitalName: selectedHospital?.name || "N/A",
      totalDuration: activeIncident.totalTime,
      sceneDuration: activeIncident.onSceneTime,
      transitDuration: transitSecs < 0 ? 0 : transitSecs,
    });
    await onStatusChange("AVAILABLE");
  };

  return (
    <ScrollView className="flex-1 bg-[#0B1012] px-4 py-4 space-y-4">
      {/* Tracker */}
      <View className="bg-surface border border-surface-variant p-3 relative mb-4">
        <View className="absolute left-0 top-0 bottom-0 w-[4px] bg-secondary" />
        <Text className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest text-center mb-3">Operational Mission Stage</Text>
        <View className="flex-row items-center justify-between">
          {steps.map((st, idx) => (
            <View key={st.num} className="items-center flex-1">
              <View className={`w-6 h-6 items-center justify-center rounded-full ${stage > st.num ? "bg-secondary" : stage === st.num ? "bg-primary-container" : "bg-surface-variant"}`}>
                <Text className={`font-bold text-xs ${stage >= st.num ? "text-white" : "text-on-surface-variant"}`}>{stage > st.num ? "✓" : st.num}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Accordion */}
      <View className="bg-surface border border-surface-variant p-3.5 relative mb-4">
        <View className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary-container" />
        <TouchableOpacity onPress={() => setDetailsExpanded(!detailsExpanded)} className="flex-row items-center justify-between pl-2">
          <View className="flex-row items-center gap-2">
            <View className={`px-2 py-0.5 border ${incident.severity >= 4 ? "bg-primary-container/10 border-primary-container/30" : "bg-secondary/10 border-secondary/30"}`}>
               <Text className={`text-[10px] uppercase font-bold ${incident.severity >= 4 ? "text-primary-container" : "text-secondary"}`}>{incident.incident_type}</Text>
            </View>
            <Text className="text-xs text-on-surface-variant font-bold">ID: #{incident.id}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[10px] text-white">ELAPSED: {formatTime(totalTime)}</Text>
            {detailsExpanded ? <ChevronUp size={16} color="#fff" /> : <ChevronDown size={16} color="#fff" />}
          </View>
        </TouchableOpacity>

        {detailsExpanded && (
          <View className="mt-3.5 pt-3 border-t border-surface-variant pl-2">
            <View className="flex-row justify-between mb-3">
              <View>
                <Text className="text-on-surface-variant font-bold text-[10px] uppercase">Severity</Text>
                <Text className="font-bold text-white mt-1">{incident.severity}/5</Text>
              </View>
              <View className="items-end">
                <Text className="text-on-surface-variant font-bold text-[10px] uppercase">Ward Sector</Text>
                <Text className="font-bold text-white mt-1">{incident.ward_name}</Text>
              </View>
            </View>
            {incident.notes && (
              <View className="p-2.5 bg-surface-container-low border border-surface-variant">
                <Text className="text-on-surface-variant text-[11px]">{incident.notes}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Stage Content */}
      {stage === 1 && (
        <View className="space-y-4 mb-8">
          <View className="h-[250px] mb-4">
            <ResQMap crewLat={crewLat} crewLon={crewLon} incidentLat={incident.latitude} incidentLon={incident.longitude} routeStartLat={activeIncident?.routeWaypoints?.[0]?.[0]} routeStartLon={activeIncident?.routeWaypoints?.[0]?.[1]} routeWaypoints={activeIncident?.routeWaypoints} />
          </View>
          <TouchableOpacity onPress={handleArrivedOnScene} className="h-12 bg-primary-container flex-row justify-center items-center gap-2 rounded-sm">
            <MapPin size={16} color="#fff" />
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Arrived On Scene</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 2 && (
        <View className="space-y-4 mb-8">
          <View className="p-3 bg-tertiary/10 border border-tertiary/30 mb-4">
            <Text className="font-bold text-white uppercase text-[10px] mb-1">Patient Treatment Active</Text>
            <Text className="text-on-surface-variant text-xs">Verify vitals and safely load the patient before confirmation.</Text>
          </View>
          <TouchableOpacity onPress={handlePatientLoaded} className="h-12 bg-tertiary flex-row justify-center items-center gap-2 rounded-sm">
            <CheckSquare size={16} color="#fff" />
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Patient Loaded</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 3 && (
        <View className="space-y-4 mb-8">
          <Text className="text-[11px] font-bold text-on-surface-variant uppercase mb-2">Hospital Recommendations</Text>
          {isLoadingHospitals ? (
             <ActivityIndicator size="large" color="#3b82f6" className="my-6" />
          ) : (
            hospitalsList.map((hosp) => (
              <TouchableOpacity key={hosp.id} onPress={() => handleHospitalSelect(hosp)} className={`p-3 mb-2 border ${selectedHospital?.id === hosp.id ? "bg-surface border-secondary" : "bg-surface-container-low border-surface-variant"}`}>
                <Text className="text-xs font-bold text-white mb-1">{hosp.name}</Text>
                <Text className="text-[10px] text-on-surface-variant">Distance: {getDistanceInKm(incident.latitude, incident.longitude, hosp.latitude, hosp.longitude).toFixed(1)} km</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity onPress={handleConfirmHospital} disabled={!selectedHospital} className={`h-12 flex-row justify-center items-center gap-2 mt-2 ${selectedHospital ? "bg-secondary" : "bg-surface-variant opacity-50"}`}>
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Confirm Hospital</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 4 && selectedHospital && (
        <View className="space-y-4 mb-8">
          <View className="h-[250px] mb-4">
            <ResQMap crewLat={crewLat} crewLon={crewLon} hospitalLat={selectedHospital.latitude} hospitalLon={selectedHospital.longitude} routeWaypoints={activeIncident?.routeWaypoints} />
          </View>
          <TouchableOpacity onPress={handleArrivedAtHospital} className="h-12 bg-secondary flex-row justify-center items-center gap-2">
            <MapPin size={16} color="#fff" />
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Arrived At Hospital</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 5 && selectedHospital && (
        <View className="space-y-4 mb-8">
          <View className="bg-surface p-4 border border-surface-variant mb-4">
            <Text className="text-white font-bold mb-4 uppercase">ER Ward Handoff Checklist</Text>
            
            <TouchableOpacity onPress={() => toggleChecklist("patientHanded")} className="flex-row items-center gap-3 mb-3">
              {activeIncident.patientHanded ? <CheckSquare size={20} color="#f59e0b" /> : <Square size={20} color="#64748b" />}
              <Text className="text-white font-bold text-xs uppercase">Patient Handed Over</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => toggleChecklist("paperworkSubmitted")} className="flex-row items-center gap-3 mb-3">
              {activeIncident.paperworkSubmitted ? <CheckSquare size={20} color="#f59e0b" /> : <Square size={20} color="#64748b" />}
              <Text className="text-white font-bold text-xs uppercase">Paperwork Submitted</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => toggleChecklist("ambulanceCleaned")} className="flex-row items-center gap-3">
              {activeIncident.ambulanceCleaned ? <CheckSquare size={20} color="#f59e0b" /> : <Square size={20} color="#64748b" />}
              <Text className="text-white font-bold text-xs uppercase">Ambulance Cleaned</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={handleHandoffComplete} 
            disabled={!activeIncident.patientHanded || !activeIncident.paperworkSubmitted || !activeIncident.ambulanceCleaned}
            className={`h-12 flex-row justify-center items-center gap-2 ${activeIncident.patientHanded && activeIncident.paperworkSubmitted && activeIncident.ambulanceCleaned ? "bg-tertiary" : "bg-surface-variant opacity-50"}`}
          >
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Complete Handoff</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === 6 && (
        <View className="space-y-4 mb-8">
          <View className="items-center py-6">
            <CheckCircle size={48} color="#3b82f6" className="mb-4" />
            <Text className="text-white font-bold uppercase tracking-widest text-lg">Mission Accomplished</Text>
          </View>
          <TouchableOpacity onPress={handleReturnToBase} className="h-12 bg-secondary flex-row justify-center items-center gap-2">
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Return to Base (Available)</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
