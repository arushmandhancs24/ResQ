import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Truck, User, Server, Cpu } from "lucide-react-native";
import { CrewShift } from "../types";

interface OnboardingScreenProps {
  onStartShift: (data: CrewShift) => void;
  defaultBackendUrl?: string;
}

export default function OnboardingScreen({
  onStartShift,
  defaultBackendUrl = "http://localhost:8000",
}: OnboardingScreenProps) {
  const [unitId, setUnitId] = useState<string>("7");
  const [vehicleNumber, setVehicleNumber] = useState<string>("KA-01-AB-1234");
  const [crewName, setCrewName] = useState<string>("A. Kumar & R. Prasad");
  const [backendUrl, setBackendUrl] = useState<string>(defaultBackendUrl);

  const isValid = unitId.trim() !== "" &&
                  vehicleNumber.trim() !== "" &&
                  crewName.trim() !== "" &&
                  backendUrl.trim() !== "";

  const handleSubmit = () => {
    if (!isValid) return;

    onStartShift({
      unitId: parseInt(unitId, 10) || 7,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      crewName: crewName.trim(),
      backendUrl: backendUrl.trim(),
      gpsInterval: 10,
      isShiftActive: true,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0B1012]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 32, justifyContent: 'space-between' }}>
          
          <View className="items-center justify-center py-8 my-auto">
            <View className="text-center items-center">
              <Text className="text-4xl font-bold tracking-widest text-white uppercase">
                RES<Text className="text-primary-container">Q</Text>
              </Text>
              <Text className="text-[10px] tracking-[2px] text-on-surface-variant uppercase mt-1">
                NETWORK PORTAL // DISPATCH AMBULANCE CREW
              </Text>
            </View>
          </View>

          <View className="w-full max-w-sm mx-auto bg-surface border border-surface-variant p-6 relative">
            <View className="absolute top-0 left-0 w-[4px] h-full bg-secondary" />
            
            <View className="flex-row items-center gap-2 border-b border-surface-variant pb-2 mb-5 pl-1">
              <Cpu size={16} color="#cbd5e1" />
              <Text className="text-sm font-bold uppercase text-white">CREW & FLEET CONFIG</Text>
            </View>

            <View className="space-y-4 pl-1">
              <View className="mb-4">
                <View className="flex-row items-center gap-1.5 mb-1.5 pl-0.5">
                  <User size={14} color="#cbd5e1" />
                  <Text className="text-[10px] font-bold text-on-surface-variant uppercase">Crew Assignments</Text>
                </View>
                <TextInput
                  value={crewName}
                  onChangeText={setCrewName}
                  className="w-full h-11 px-3 bg-surface border border-surface-variant text-xs text-white uppercase"
                  placeholder="e.g. A. Kumar & R. Prasad"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 mb-1.5 pl-0.5">
                    <Truck size={14} color="#cbd5e1" />
                    <Text className="text-[10px] font-bold text-on-surface-variant uppercase">Vehicle No</Text>
                  </View>
                  <TextInput
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    className="w-full h-11 px-3 bg-surface border border-surface-variant text-xs text-white uppercase"
                    placeholder="KA-01-AB-1234"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 mb-1.5 pl-0.5">
                    <Cpu size={14} color="#cbd5e1" />
                    <Text className="text-[10px] font-bold text-on-surface-variant uppercase">Unit ID</Text>
                  </View>
                  <TextInput
                    value={unitId}
                    onChangeText={setUnitId}
                    keyboardType="numeric"
                    className="w-full h-11 px-3 bg-surface border border-surface-variant text-xs text-white"
                    placeholder="7"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View className="mb-4">
                <View className="flex-row items-center gap-1.5 mb-1.5 pl-0.5">
                  <Server size={14} color="#cbd5e1" />
                  <Text className="text-[10px] font-bold text-on-surface-variant uppercase">System Base URL</Text>
                </View>
                <TextInput
                  value={backendUrl}
                  onChangeText={setBackendUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  className="w-full h-11 px-3 bg-surface border border-surface-variant text-[11px] text-white"
                  placeholder="http://localhost:8000"
                  placeholderTextColor="#64748b"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isValid}
                className={`w-full mt-2 h-12 flex-row items-center justify-center border ${
                  isValid
                    ? "bg-primary-container border-transparent"
                    : "bg-surface-variant/20 border-surface-variant opacity-50"
                }`}
              >
                <Text className={`font-bold tracking-widest uppercase text-xs ${isValid ? "text-white" : "text-on-surface-variant"}`}>
                  Start Shift & Go Live
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-auto pt-6 items-center">
            <Text className="text-[9px] tracking-wider uppercase text-on-surface-variant text-center">
              ResQ Dispatch Fleet protocol v3.12 // Bengaluru Division
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
