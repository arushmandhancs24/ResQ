import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from "react-native";
import {
  Server,
  User,
  Truck,
  Wifi,
  Power,
  Sliders,
  RefreshCw,
  Cpu,
  MonitorCheck,
  Save,
  Smartphone,
  CheckCircle,
} from "lucide-react-native";
import { CrewShift } from "../types";

interface SettingsScreenProps {
  shift: CrewShift;
  onUpdateShift: (updated: CrewShift) => void;
  onEndShift: () => void;
  websocketConnected: boolean;
  onReconnectWebsocket: () => void;
  isMockActive: boolean;
  onToggleMockMode: (state: boolean) => void;
  deviceInfo?: { model: string; battery: number | null } | null;
}

export default function SettingsScreen({
  shift,
  onUpdateShift,
  onEndShift,
  websocketConnected,
  onReconnectWebsocket,
  isMockActive,
  onToggleMockMode,
  deviceInfo,
}: SettingsScreenProps) {
  const [unitId, setUnitId] = useState<string>(shift.unitId.toString());
  const [vehicleNumber, setVehicleNumber] = useState<string>(shift.vehicleNumber);
  const [crewName, setCrewName] = useState<string>(shift.crewName);
  const [backendUrl, setBackendUrl] = useState<string>(shift.backendUrl);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleApplySettings = () => {
    onUpdateShift({
      ...shift,
      unitId: parseInt(unitId, 10) || shift.unitId,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      crewName: crewName.trim(),
      backendUrl: backendUrl.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const triggerWSReconnect = () => {
    setIsReconnecting(true);
    onReconnectWebsocket();
    setTimeout(() => setIsReconnecting(false), 800);
  };

  return (
    <ScrollView className="flex-1 bg-[#0B1012] px-4 py-6">
      <Text className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">SYSTEM DIAGNOSTICS & SHIFT PROFILE</Text>

      {/* Hardware Diagnostics */}
      <View className="p-4 bg-surface border border-surface-variant space-y-3.5 relative mb-4">
        <View className="absolute top-0 left-0 bottom-0 w-[4px] bg-secondary" />
        <View className="flex-row items-center gap-1.5 pl-1 mb-2">
          <Smartphone size={14} color="#3b82f6" />
          <Text className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Expo Hardware Status</Text>
        </View>

        <View className="space-y-2 text-xs pl-1">
          <View className="flex-row justify-between items-center bg-surface-container-low p-2 border border-surface-variant mb-2">
            <Text className="text-on-surface-variant uppercase text-[10px] font-bold">Runtime Context:</Text>
            <View className="px-2 py-0.5 bg-secondary/15 border border-secondary/30">
               <Text className="text-[9px] font-bold uppercase text-secondary">NATIVE EXPO CONTAINER</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-2">
            <View className="p-2.5 bg-surface-container-low border border-surface-variant flex-1">
              <Text className="text-[8px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Hardware Agent</Text>
              <Text className="font-bold text-white text-[10px] uppercase" numberOfLines={1}>{deviceInfo?.model || "Mobile Device"}</Text>
            </View>
            <View className="p-2.5 bg-surface-container-low border border-surface-variant flex-1">
              <Text className="text-[8px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Power Supply</Text>
              <Text className="font-bold text-white text-[10px] uppercase">
                {deviceInfo?.battery !== undefined && deviceInfo?.battery !== null ? `${deviceInfo.battery}% CAP` : "100% EXTPWR"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Connection State */}
      <View className="p-4 bg-surface border border-surface-variant relative mb-4">
        <View className="absolute top-0 left-0 bottom-0 w-[4px] bg-tertiary" />
        <View className="flex-row items-center gap-1.5 pl-1 mb-3">
          <Wifi size={14} color="#f59e0b" />
          <Text className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Link protocol status</Text>
        </View>

        <View className="flex-row items-center justify-between pl-1">
          <View className="flex-row items-center gap-2.5">
            <View className={`h-2.5 w-2.5 rounded-full ${websocketConnected ? "bg-secondary" : "bg-primary-container"}`} />
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-white">
                {websocketConnected ? "SOCKET_FEED_CONNECTED" : "SOCKET_FEED_DISCONNECTED"}
              </Text>
              <Text className="text-[9px] text-on-surface-variant">
                {shift.backendUrl.replace("http", "ws")}/ws/dispatch
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={triggerWSReconnect} disabled={isReconnecting} className="flex-row items-center gap-1 py-1.5 px-3 bg-surface-container-low border border-surface-variant">
            <RefreshCw size={12} color="#3b82f6" />
            <Text className="text-[9px] font-bold uppercase text-white">RECONNECT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shift Settings */}
      <View className="p-4 bg-surface border border-surface-variant relative mb-4">
        <View className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#616161]" />
        <View className="flex-row items-center gap-1.5 border-b border-surface-variant pb-2 mb-3.5 pl-1">
          <Sliders size={14} color="#cbd5e1" />
          <Text className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Operational Parameters</Text>
        </View>

        <View className="pl-1 mb-4">
          <View className="mb-3">
            <Text className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 pl-0.5">Crew Assignments</Text>
            <View className="relative">
              <View className="absolute left-3 top-3 z-10"><User size={14} color="#cbd5e1" /></View>
              <TextInput
                value={crewName}
                onChangeText={setCrewName}
                className="w-full h-10 pl-9 pr-3 bg-surface border border-surface-variant text-white text-xs uppercase"
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 pl-0.5">Vehicle No</Text>
              <View className="relative">
                <View className="absolute left-3 top-3 z-10"><Truck size={14} color="#cbd5e1" /></View>
                <TextInput
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  className="w-full h-10 pl-9 pr-3 bg-surface border border-surface-variant text-white text-xs uppercase"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 pl-0.5">Unit ID</Text>
              <View className="relative">
                <View className="absolute left-3 top-3 z-10"><Cpu size={14} color="#cbd5e1" /></View>
                <TextInput
                  value={unitId}
                  onChangeText={setUnitId}
                  keyboardType="numeric"
                  className="w-full h-10 pl-9 pr-3 bg-surface border border-surface-variant text-secondary text-xs"
                />
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 pl-0.5">Service Endpoint Base URL</Text>
            <View className="relative">
              <View className="absolute left-3 top-3 z-10"><Server size={14} color="#cbd5e1" /></View>
              <TextInput
                value={backendUrl}
                onChangeText={setBackendUrl}
                autoCapitalize="none"
                keyboardType="url"
                className="w-full h-10 pl-9 pr-3 bg-surface border border-surface-variant text-secondary text-[11px]"
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleApplySettings} className="w-full h-11 bg-primary-container flex-row items-center justify-center gap-1.5">
            <Save size={16} color="#fff" />
            <Text className="text-white font-bold uppercase tracking-widest text-xs">Apply Configurations</Text>
          </TouchableOpacity>
          {saveSuccess && (
            <Text className="text-[10px] text-secondary text-center uppercase tracking-wider mt-2">
              [SYSTEM]: Shift variables successfully synchronized.
            </Text>
          )}
        </View>
      </View>

      {/* Mock Mode */}
      <View className="p-4 bg-surface border border-surface-variant relative mb-4">
        <View className="absolute top-0 left-0 bottom-0 w-[4px] bg-[#fbbf24]" />
        <View className="flex-row items-center gap-1.5 pl-1 mb-2">
          <MonitorCheck size={14} color="#fbbf24" />
          <Text className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Emulation Mode Override</Text>
        </View>
        <View className="flex-row items-center justify-between pl-1">
          <View className="flex-1 pr-4">
            <Text className="font-bold uppercase text-[11px] tracking-wide text-white">Synthesize Live Data</Text>
            <Text className="text-[10px] text-on-surface-variant mt-0.5">Enables autonomous device simulation.</Text>
          </View>
          <Switch value={isMockActive} onValueChange={onToggleMockMode} trackColor={{ false: "#1e293b", true: "#3b82f6" }} />
        </View>
      </View>

      <TouchableOpacity onPress={onEndShift} className="w-full h-12 bg-primary-container flex-row items-center justify-center gap-2 mb-10">
        <Power size={16} color="#fff" />
        <Text className="text-white font-bold uppercase tracking-widest text-xs">End Shift (Discharge Duty)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
