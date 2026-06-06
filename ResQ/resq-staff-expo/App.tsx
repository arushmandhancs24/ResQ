import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, Dimensions, Modal, Linking } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Home, ShieldAlert, Building2, Calendar, Settings as SettingsIcon, Volume2, VolumeX, MapPin } from "lucide-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import {
  AmbulanceStatus,
  Ambulance,
  Incident,
  CrewShift,
  ActiveIncidentState,
  Hospital,
  MOCK_INCIDENTS,
  MOCK_HOSPITALS,
  MOCK_FLEET,
  BENGALURU_COORDS,
} from "./src/types";

import OnboardingScreen from "./src/components/OnboardingScreen";
import HomeScreen from "./src/components/HomeScreen";
import ActiveIncidentScreen from "./src/components/ActiveIncidentScreen";
import HospitalsScreen from "./src/components/HospitalsScreen";
import HistoryScreen from "./src/components/HistoryScreen";
import SettingsScreen from "./src/components/SettingsScreen";
import ResQMap from "./src/components/ResQMap";
import StitchLogo from "./src/components/StitchLogo";
import { generateWaypoints } from "./src/utils/routeHelper";

import "./global.css";

export default function App() {
  const [shift, setShift] = useState<CrewShift | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "active" | "hospitals" | "history" | "settings">("home");
  const [ambulanceStatus, setAmbulanceStatus] = useState<AmbulanceStatus>("OFFLINE");
  const [statusChangedAt, setStatusChangedAt] = useState<Date>(new Date());
  const [latitude, setLatitude] = useState<number>(BENGALURU_COORDS.latitude);
  const [longitude, setLongitude] = useState<number>(BENGALURU_COORDS.longitude);
  const [gpsActive, setGpsActive] = useState<boolean>(true);
  const [isMockActive, setIsMockActive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [simulationSpeed, setSimulationSpeed] = useState<number>(2.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [snapToRoute, setSnapToRoute] = useState<boolean>(true);
  const [simulateJitter, setSimulateJitter] = useState<boolean>(false);
  const [useInterpolation, setUseInterpolation] = useState<boolean>(true);
  const [routeMode, setRouteMode] = useState<"real" | "fallback">("real");
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeStatusText, setRouteStatusText] = useState<string>("Ready");

  const retrieveOsmRoute = async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error("OSRM failure");
      const data = await response.json();
      if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
        const osmPoints = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const mappedPoints = [[startLat, startLon], ...osmPoints, [endLat, endLon]];
        let interpolated: [number, number][] = [];
        for (let i = 0; i < mappedPoints.length - 1; i++) {
          const start = mappedPoints[i];
          const end = mappedPoints[i + 1];
          interpolated.push(start as [number, number]);
          const dLat = end[0] - start[0];
          const dLng = end[1] - start[1];
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist > 0.0006) {
            const steps = Math.floor(dist / 0.0003) || 1;
            for (let s = 1; s < steps; s++) {
              interpolated.push([start[0] + dLat * (s / steps), start[1] + dLng * (s / steps)]);
            }
          }
        }
        interpolated.push(mappedPoints[mappedPoints.length - 1] as [number, number]);
        return interpolated;
      }
    } catch {}
    return generateWaypoints(startLat, startLon, endLat, endLon, 16);
  };

  const [nearbyFleet, setNearbyFleet] = useState<Ambulance[]>(MOCK_FLEET);
  const [activeIncident, setActiveIncident] = useState<ActiveIncidentState | null>(null);
  const [incomingProposal, setIncomingProposal] = useState<{ incident: Incident; hospital: Hospital | null; eta_seconds: number; } | null>(null);
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false);
  const [wsReconnectCounter, setWsReconnectCounter] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const locationRef = useRef({ latitude, longitude });
  const [deviceInfo, setDeviceInfo] = useState<{ model: string; battery: number | null } | null>(null);

  useEffect(() => { locationRef.current = { latitude, longitude }; }, [latitude, longitude]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedShift = await AsyncStorage.getItem("resq_crew_shift");
        if (savedShift) {
          const parsed = JSON.parse(savedShift);
          if (parsed.isShiftActive) setShift(parsed);
        }
        const savedIncident = await AsyncStorage.getItem("resq_active_incident");
        if (savedIncident) setActiveIncident(JSON.parse(savedIncident));
      } catch {}
      setIsInitializing(false);
    };
    loadState();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
      if (shift) AsyncStorage.setItem("resq_crew_shift", JSON.stringify(shift));
      else AsyncStorage.removeItem("resq_crew_shift");
    }
  }, [shift, isInitializing]);

  useEffect(() => {
    if (!isInitializing) {
      if (activeIncident) AsyncStorage.setItem("resq_active_incident", JSON.stringify(activeIncident));
      else AsyncStorage.removeItem("resq_active_incident");
    }
  }, [activeIncident, isInitializing]);

  useEffect(() => {
    const getDeviceInfo = async () => {
      setDeviceInfo({ model: `${Device.manufacturer} ${Device.modelName}`, battery: await Battery.getBatteryLevelAsync().then(l => Math.round(l * 100)) });
    };
    getDeviceInfo();
  }, []);

  const playSirenBeep = async () => {
    if (!soundEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(require('./assets/siren.wav'));
      await sound.playAsync();
    } catch {}
  };

  const triggerHaptic = (type: "assignment" | "status" | "success" | "click") => {
    if (type === "assignment") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (type === "status") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === "click") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (!shift?.isShiftActive) return;
    if (isMockActive) { setGpsActive(true); return; }
    
    let sub: Location.LocationSubscription;
    const startLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsActive(false); return; }
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000 }, loc => {
        setLatitude(loc.coords.latitude); setLongitude(loc.coords.longitude); setGpsActive(true);
      });
    };
    startLocation();
    return () => { if (sub) sub.remove(); };
  }, [shift?.isShiftActive, isMockActive]);

  useEffect(() => {
    if (!shift?.isShiftActive || ambulanceStatus === "OFFLINE") return;
    const runTelemetryCycle = async () => {
      let currentLat = locationRef.current.latitude;
      let currentLon = locationRef.current.longitude;
      if (isMockActive || !gpsActive) {
        if (!activeIncident || (activeIncident.stage !== 1 && activeIncident.stage !== 4)) {
          currentLat += (Math.random() - 0.5) * 0.0002;
          currentLon += (Math.random() - 0.5) * 0.0002;
          setLatitude(currentLat); setLongitude(currentLon);
        }
      }
      try {
        await fetch(`${shift.backendUrl}/fleet/${shift.unitId}/location`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: currentLat, longitude: currentLon }) });
      } catch {}
    };
    runTelemetryCycle();
    const intervalId = setInterval(runTelemetryCycle, shift.gpsInterval * 1000);
    return () => clearInterval(intervalId);
  }, [shift, ambulanceStatus, isMockActive, gpsActive, activeIncident]);

  useEffect(() => {
    if (!shift?.isShiftActive || ambulanceStatus === "OFFLINE" || !isPlaying) return;
    const intervalDelay = Math.max(250, Math.round(1350 / simulationSpeed));
    const intervalId = setInterval(() => {
      if (activeIncident && (activeIncident.stage === 1 || activeIncident.stage === 4)) {
        const waypoints = activeIncident.routeWaypoints;
        const index = activeIncident.routeIndex;
        if (waypoints && index !== undefined && index < waypoints.length - 1) {
          const nextIndex = index + 1;
          const [nextLat, nextLon] = waypoints[nextIndex];
          setLatitude(nextLat); setLongitude(nextLon);
          fetch(`${shift.backendUrl}/fleet/${shift.unitId}/location`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: nextLat, longitude: nextLon }) }).catch(()=>{});
          setActiveIncident(prev => prev ? { ...prev, routeIndex: nextIndex } : null);
          if (nextIndex === waypoints.length - 1) {
            playSirenBeep();
            triggerHaptic("success");
            Alert.alert("Arrived", activeIncident.stage === 1 ? "Arrived at incident scene!" : "Arrived at Hospital!");
          }
        }
      } else if (isMockActive) {
        const driftLat = locationRef.current.latitude + (Math.random() - 0.5) * 0.00004;
        const driftLon = locationRef.current.longitude + (Math.random() - 0.5) * 0.00004;
        setLatitude(driftLat); setLongitude(driftLon);
        fetch(`${shift.backendUrl}/fleet/${shift.unitId}/location`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: driftLat, longitude: driftLon }) }).catch(()=>{});
      }
    }, intervalDelay);
    return () => clearInterval(intervalId);
  }, [shift, isMockActive, activeIncident?.stage, activeIncident?.routeWaypoints, activeIncident?.routeIndex, ambulanceStatus, isPlaying, simulationSpeed]);

  useEffect(() => {
    if (!shift?.isShiftActive) return;
    wsRef.current = null;
    const wsUrl = shift.backendUrl.replace("http", "ws") + "/ws/dispatch";
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    const connectWebsocket = () => {
      if (isMockActive) { setWebsocketConnected(true); return; }
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setWebsocketConnected(true);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "dispatch" && Number(data.ambulance_id) === Number(shift.unitId)) {
              setIncomingProposal({ incident: data.incident, hospital: data.hospital || null, eta_seconds: data.eta_seconds || 480 });
              playSirenBeep();
              triggerHaptic("assignment");
            }
          } catch {}
        };
        ws.onclose = () => {
          setWebsocketConnected(false);
          const nextWait = Math.min(2000 * Math.pow(2, wsReconnectCounter % 5), 16000);
          reconnectTimeout = setTimeout(() => setWsReconnectCounter(prev => prev + 1), nextWait);
        };
        ws.onerror = () => setWebsocketConnected(false);
      } catch { setWebsocketConnected(false); }
    };
    connectWebsocket();
    return () => { if (wsRef.current) wsRef.current.close(); clearTimeout(reconnectTimeout); };
  }, [shift, wsReconnectCounter, isMockActive]);

  useEffect(() => {
    if (!shift?.isShiftActive) return;
    const demoTimer = setTimeout(() => {
      if (isMockActive && !activeIncident && !incomingProposal) {
        setIncomingProposal({ incident: MOCK_INCIDENTS[shift.unitId % MOCK_INCIDENTS.length], hospital: MOCK_HOSPITALS[0], eta_seconds: 520 });
        playSirenBeep();
        triggerHaptic("assignment");
      }
    }, 15000);
    return () => clearTimeout(demoTimer);
  }, [shift, isMockActive, activeIncident]);

  const handleStartShift = async (data: CrewShift) => {
    setShift(data); setAmbulanceStatus("AVAILABLE"); setStatusChangedAt(new Date()); setActiveTab("home");
    try { await fetch(`${data.backendUrl}/fleet/${data.unitId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "AVAILABLE" }) }); } catch {}
    playSirenBeep(); triggerHaptic("success");
  };

  const handleStatusChange = async (newStatus: AmbulanceStatus) => {
    setAmbulanceStatus(newStatus); setStatusChangedAt(new Date()); triggerHaptic("status");
    if (!shift) return;
    try { await fetch(`${shift.backendUrl}/fleet/${shift.unitId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) }); } catch {}
  };

  const handleRefreshFleet = async () => {
    if (!shift) return;
    try {
      const response = await fetch(`${shift.backendUrl}/fleet/status`);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.available_units)) {
          setNearbyFleet(data.available_units);
          return;
        }
      }
    } catch {}
    setNearbyFleet(prev => prev.map(u => Math.random() > 0.70 ? { ...u, status: ["AVAILABLE", "DISPATCHED", "EN_ROUTE_HOSPITAL", "AT_HOSPITAL", "RETURNING", "OFFLINE"][Math.floor(Math.random() * 6)] as AmbulanceStatus } : u));
  };

  const triggerManualDrill = () => {
    if (!shift) return;
    setIncomingProposal({ incident: MOCK_INCIDENTS[Math.floor(Math.random() * MOCK_INCIDENTS.length)], hospital: MOCK_HOSPITALS[1], eta_seconds: 480 });
    playSirenBeep(); triggerHaptic("assignment");
  };

  const handleEndShift = () => {
    Alert.alert("End Shift", "Are you sure you want to end shift and standby?", [
      { text: "Cancel", style: "cancel" },
      { text: "End Shift", onPress: () => {
          handleStatusChange("OFFLINE"); setShift(null); setActiveIncident(null); setIncomingProposal(null);
          AsyncStorage.removeItem("resq_crew_shift"); AsyncStorage.removeItem("resq_active_incident");
        } 
      }
    ]);
  };

  const handleAcceptAssignment = async () => {
    if (!incomingProposal) return;
    const { incident, hospital } = incomingProposal;
    setRouteLoading(true);
    let waypoints: [number, number][] = [];
    try {
      if (routeMode === "real") waypoints = await retrieveOsmRoute(latitude, longitude, incident.latitude, incident.longitude);
      else waypoints = generateWaypoints(latitude, longitude, incident.latitude, incident.longitude, 16);
    } catch { waypoints = generateWaypoints(latitude, longitude, incident.latitude, incident.longitude, 16); }
    setRouteLoading(false);

    setActiveIncident({
      incident, stage: 1, selectedHospital: hospital, isOverridden: false, originalRecommendedHospital: hospital,
      onSceneTime: 0, hospitalTime: 0, totalTime: 0, patientHanded: false, paperworkSubmitted: false, ambulanceCleaned: false,
      routeWaypoints: waypoints, routeIndex: 0
    });
    setIncomingProposal(null);
    await handleStatusChange("DISPATCHED");
    setActiveTab("active");
    triggerHaptic("success");

    const url = Platform.select({
      ios: `maps://app?daddr=${incident.latitude},${incident.longitude}`,
      android: `google.navigation:q=${incident.latitude},${incident.longitude}`
    }) || `https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleRejectAssignment = () => {
    setIncomingProposal(null); handleStatusChange("AVAILABLE"); triggerHaptic("status");
  };

  const handleCompleteIncident = () => {
    setActiveIncident(null); triggerHaptic("success");
  };

  if (isInitializing) return <View className="flex-1 bg-[#0B1012]" />;
  if (!shift) return (
    <SafeAreaProvider>
      <OnboardingScreen onStartShift={handleStartShift} defaultBackendUrl="http://10.0.2.2:8000" />
    </SafeAreaProvider>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-[#0B1012]">
        {/* Header */}
      <View className="h-16 bg-surface/90 border-b border-surface-variant flex-row items-center justify-between px-4 z-50">
        <View className="flex-row items-center gap-2">
          <StitchLogo size="sm" />
          <View>
            <Text className="text-sm font-bold tracking-widest text-primary-container uppercase">RESQ COMMAND</Text>
            <Text className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">Unit {shift.unitId} // {shift.vehicleNumber}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => setSoundEnabled(!soundEnabled)} className="p-1 border border-surface-variant">
            {soundEnabled ? <Volume2 size={16} color="#c2e7ff" /> : <VolumeX size={16} color="#cbd5e1" />}
          </TouchableOpacity>
          {isMockActive && (
            <View className="bg-tertiary/10 border border-tertiary/30 px-1.5 py-0.5 hidden sm:flex">
              <Text className="text-tertiary text-[9px] font-bold tracking-widest uppercase">MOCK</Text>
            </View>
          )}
          <View className={`px-2 py-1 flex-row items-center gap-1.5 border ${websocketConnected ? "bg-secondary/10 border-secondary/30" : "bg-primary-container/10 border-primary-container/30"}`}>
            <View className={`h-1.5 w-1.5 rounded-full ${websocketConnected ? "bg-secondary" : "bg-primary-container"}`} />
            <Text className={`text-[9px] font-bold ${websocketConnected ? "text-secondary" : "text-primary-container"}`}>{websocketConnected ? "LIVE" : "DISCONN"}</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1">
        {activeTab === "home" && <HomeScreen shift={shift} status={ambulanceStatus} statusChangedAt={statusChangedAt} latitude={latitude} longitude={longitude} gpsActive={gpsActive} nearbyFleet={nearbyFleet} onStatusChange={handleStatusChange} onRefreshFleet={handleRefreshFleet} isMockActive={isMockActive} />}
        {activeTab === "active" && <ActiveIncidentScreen activeIncident={activeIncident} crewLat={latitude} crewLon={longitude} backendUrl={shift.backendUrl} unitId={shift.unitId} isMockActive={isMockActive} onUpdateActiveJob={setActiveIncident} onStatusChange={handleStatusChange} onCompleteIncident={handleCompleteIncident} simulationSpeed={simulationSpeed} setSimulationSpeed={setSimulationSpeed} isPlaying={isPlaying} setIsPlaying={setIsPlaying} snapToRoute={snapToRoute} setSnapToRoute={setSnapToRoute} simulateJitter={simulateJitter} setSimulateJitter={setSimulateJitter} useInterpolation={useInterpolation} setUseInterpolation={setUseInterpolation} routeMode={routeMode} setRouteMode={setRouteMode} routeLoading={routeLoading} routeStatusText={routeStatusText} onResetSimulation={() => {}} retrieveOsmRoute={retrieveOsmRoute} />}
        {activeTab === "hospitals" && <HospitalsScreen backendUrl={shift.backendUrl} crewLat={latitude} crewLon={longitude} />}
        {activeTab === "history" && <HistoryScreen backendUrl={shift.backendUrl} unitId={shift.unitId} />}
        {activeTab === "settings" && <SettingsScreen shift={shift} onUpdateShift={setShift} onEndShift={handleEndShift} websocketConnected={websocketConnected} onReconnectWebsocket={() => setWsReconnectCounter(prev => prev + 1)} isMockActive={isMockActive} onToggleMockMode={setIsMockActive} deviceInfo={deviceInfo} />}
      </View>

      {/* Manual Drill Button */}
      {isMockActive && !activeIncident && !incomingProposal && (
        <View className="absolute bottom-20 w-full px-4 items-center">
          <TouchableOpacity onPress={triggerManualDrill} className="bg-[#450a0a] border border-red-900/60 px-4 py-2 flex-row items-center gap-2 rounded-md">
            <ShieldAlert size={14} color="#f87171" />
            <Text className="text-[#f87171] font-bold text-[10px] uppercase">Simulate Dispatch Drill</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Proposal Modal */}
      {incomingProposal && (
        <Modal transparent animationType="slide" visible={!!incomingProposal}>
          <View className="flex-1 bg-black/80 justify-end sm:justify-center p-4">
            <View className="bg-[#151722] border-t-4 border-red-600 rounded-t-2xl sm:rounded-2xl p-5 border border-slate-800">
              <View className="flex-row items-center gap-3 bg-red-950/20 p-3 rounded-xl border border-red-900/40 mb-4">
                <View className="h-3.5 w-3.5 bg-red-600 rounded-full" />
                <View>
                  <Text className="text-[10px] uppercase text-red-500 font-bold tracking-wider">🚨 EMERGENCY ASSIGNMENT</Text>
                  <Text className="text-xs font-bold text-slate-100 uppercase mt-0.5">Urgent Incident Dispatched</Text>
                </View>
              </View>
              
              <View className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 mb-4">
                <View className="flex-row justify-between mb-2">
                  <View>
                    <Text className="text-slate-500 text-[9px] uppercase">Incident Type</Text>
                    <Text className="font-bold text-slate-200 mt-0.5 uppercase tracking-wide">{incomingProposal.incident.incident_type}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-500 text-[9px] uppercase">Severe Level</Text>
                    <Text className="font-extrabold text-red-400 mt-0.5">{incomingProposal.incident.severity} / 5 Priority</Text>
                  </View>
                </View>
                <View className="flex-row justify-between pt-2 border-t border-slate-900">
                  <View>
                    <Text className="text-slate-500 text-[9px] uppercase">Assigned Sector</Text>
                    <Text className="font-bold text-slate-200 mt-0.5 truncate">{incomingProposal.incident.ward_name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-500 text-[9px] uppercase">Response ETA</Text>
                    <Text className="font-bold text-emerald-400 mt-0.5">~{Math.round(incomingProposal.eta_seconds / 60)} mins</Text>
                  </View>
                </View>
              </View>

              <View className="mb-4">
                <View className="flex-row items-center gap-1 mb-2">
                  <MapPin size={12} color="#64748b" />
                  <Text className="text-[9px] text-slate-500 uppercase tracking-wider">Spatial Scenario Overview</Text>
                </View>
                <View className="h-32">
                  <ResQMap crewLat={latitude} crewLon={longitude} incidentLat={incomingProposal.incident.latitude} incidentLon={incomingProposal.incident.longitude} showRouteLine={false} />
                </View>
              </View>

              <TouchableOpacity onPress={handleAcceptAssignment} className="bg-emerald-600 h-12 flex-row justify-center items-center rounded-xl mb-3">
                <Text className="text-white font-extrabold uppercase tracking-widest text-xs">ACCEPT & NAVIGATE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRejectAssignment} className="py-2 border-t border-slate-900">
                <Text className="text-slate-500 text-center font-semibold text-xs tracking-wider uppercase">UNABLE TO RESPOND</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Nav */}
      <View className="h-16 bg-surface-container-lowest border-t border-surface-variant flex-row items-center justify-around pb-2">
        <TouchableOpacity onPress={() => { setActiveTab("home"); triggerHaptic("click"); }} className="flex-1 items-center justify-center pt-2">
          <Home size={20} color={activeTab === "home" ? "#c2e7ff" : "#94a3b8"} />
          <Text className={`text-[10px] font-bold uppercase mt-1 ${activeTab === "home" ? "text-primary-container" : "text-on-surface-variant"}`}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { if (activeIncident) { setActiveTab("active"); triggerHaptic("click"); } }} disabled={!activeIncident} className="flex-1 items-center justify-center pt-2">
          <View className="relative">
            <ShieldAlert size={20} color={activeTab === "active" ? "#c2e7ff" : (activeIncident ? "#e2e8f0" : "#475569")} />
            {activeIncident && <View className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary-container border border-[#0f1117] rounded-full" />}
          </View>
          <Text className={`text-[10px] font-bold uppercase mt-1 ${activeTab === "active" ? "text-primary-container" : (activeIncident ? "text-on-surface" : "text-surface-variant")}`}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setActiveTab("hospitals"); triggerHaptic("click"); }} className="flex-1 items-center justify-center pt-2">
          <Building2 size={20} color={activeTab === "hospitals" ? "#c2e7ff" : "#94a3b8"} />
          <Text className={`text-[10px] font-bold uppercase mt-1 ${activeTab === "hospitals" ? "text-primary-container" : "text-on-surface-variant"}`}>Hospitals</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setActiveTab("history"); triggerHaptic("click"); }} className="flex-1 items-center justify-center pt-2">
          <Calendar size={20} color={activeTab === "history" ? "#c2e7ff" : "#94a3b8"} />
          <Text className={`text-[10px] font-bold uppercase mt-1 ${activeTab === "history" ? "text-primary-container" : "text-on-surface-variant"}`}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setActiveTab("settings"); triggerHaptic("click"); }} className="flex-1 items-center justify-center pt-2">
          <SettingsIcon size={20} color={activeTab === "settings" ? "#c2e7ff" : "#94a3b8"} />
          <Text className={`text-[10px] font-bold uppercase mt-1 ${activeTab === "settings" ? "text-primary-container" : "text-on-surface-variant"}`}>Settings</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
