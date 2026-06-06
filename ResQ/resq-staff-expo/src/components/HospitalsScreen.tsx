import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Search, Bed, Clock, Compass } from "lucide-react-native";
import { Hospital, MOCK_HOSPITALS } from "../types";
import ResQMap from "./ResQMap";

interface HospitalsScreenProps {
  backendUrl: string;
  crewLat: number;
  crewLon: number;
}

export default function HospitalsScreen({ backendUrl, crewLat, crewLon }: HospitalsScreenProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHospitalId, setExpandedHospitalId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const fetchHospitals = async () => {
      setIsLoading(true);
      setIsFallback(false);
      try {
        const response = await fetch(`${backendUrl}/hospital/list`);
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) setHospitals(data);
        else throw new Error("Empty response");
      } catch (err) {
        setHospitals(MOCK_HOSPITALS);
        setIsFallback(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHospitals();
  }, [backendUrl]);

  const filteredHospitals = hospitals.filter((h) => {
    const query = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(query) || h.specialties.some(spec => spec.toLowerCase().includes(query));
  });

  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  return (
    <ScrollView className="flex-1 bg-[#0B1012] px-4 py-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">HOSPITAL RESOURCE DIRECTORY</Text>
        {isFallback && (
          <View className="bg-tertiary/10 border border-tertiary/30 px-2 py-0.5">
            <Text className="text-[9px] text-tertiary font-bold uppercase">SIMULATED FEED</Text>
          </View>
        )}
      </View>

      <View className="relative mb-4">
        <View className="absolute left-3 top-3.5 z-10">
           <Search size={16} color="#cbd5e1" />
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter by name or specialty..."
          placeholderTextColor="#64748b"
          className="w-full h-11 pl-10 pr-4 bg-surface border border-surface-variant text-xs text-white uppercase"
        />
      </View>

      {isLoading ? (
        <View className="py-16 bg-surface border border-surface-variant items-center justify-center mb-10">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-xs text-on-surface-variant mt-3 uppercase tracking-wider">Fetching registered facilities...</Text>
        </View>
      ) : filteredHospitals.length === 0 ? (
        <View className="py-10 bg-surface border border-surface-variant items-center relative mb-10">
          <View className="absolute top-0 left-0 bottom-0 w-[4px] bg-secondary" />
          <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">No matching facilities located</Text>
        </View>
      ) : (
        <View className="space-y-3 mb-10">
          {filteredHospitals.map((hosp) => {
            const isExpanded = expandedHospitalId === hosp.id;
            const distanceValue = getDistanceInKm(crewLat, crewLon, hosp.latitude, hosp.longitude);

            return (
              <View key={hosp.id} className={`border mb-3 ${isExpanded ? "bg-surface border-secondary" : "bg-surface border-surface-variant"} relative`}>
                {isExpanded && <View className="absolute top-0 left-0 bottom-0 w-[3px] bg-secondary" />}
                <TouchableOpacity onPress={() => setExpandedHospitalId(isExpanded ? null : hosp.id)} className="p-4 flex-row items-start justify-between pl-5">
                  <View className="flex-1 mr-2">
                    <View className="flex-row flex-wrap items-center gap-2 mb-2">
                      <Text className="text-xs font-bold text-white uppercase tracking-wider">{hosp.name}</Text>
                      {hosp.is_24x7 && (
                        <View className="bg-primary-container/10 border border-primary-container/30 px-1.5 py-0.5">
                          <Text className="text-primary-container text-[8px] font-bold uppercase tracking-wider">24X7 ER</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row flex-wrap gap-1">
                      {hosp.specialties.map(spec => (
                        <View key={spec} className="bg-surface-container-low border border-surface-variant px-1.5 py-0.5 mb-1">
                          <Text className="text-[9px] font-bold uppercase text-on-surface-variant">{spec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View className="items-end mt-0.5">
                    <Text className="text-xs font-bold text-secondary tracking-wide">{distanceValue.toFixed(1)} km</Text>
                    <Text className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Distance</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View className="border-t border-surface-variant bg-surface-container-low p-4 pl-5">
                    <View className="flex-row gap-3.5 mb-4">
                      <View className="flex-1 bg-surface border border-surface-variant p-2.5 relative">
                        <View className="absolute top-0 left-0 bottom-0 w-[2px] bg-secondary" />
                        <Text className="text-on-surface-variant font-bold text-[9px] uppercase tracking-wider pl-1 mb-1">ER Surge Capacity</Text>
                        <View className="flex-row items-center gap-1.5 pl-1">
                          <Bed size={14} color="#3b82f6" />
                          <Text className="font-bold text-white uppercase text-[11px] tracking-wide">{hosp.er_capacity} free beds</Text>
                        </View>
                      </View>
                      <View className="flex-1 bg-surface border border-surface-variant p-2.5 relative">
                        <View className="absolute top-0 left-0 bottom-0 w-[2px] bg-tertiary" />
                        <Text className="text-on-surface-variant font-bold text-[9px] uppercase tracking-wider pl-1 mb-1">Service Level</Text>
                        <View className="flex-row items-center gap-1.5 pl-1">
                          <Clock size={14} color="#f59e0b" />
                          <Text className="font-bold text-white uppercase text-[11px] tracking-wide">Level-1 Trauma</Text>
                        </View>
                      </View>
                    </View>

                    <View className="mb-2 flex-row items-center gap-1">
                      <Compass size={12} color="#3b82f6" />
                      <Text className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Geographic Point Tracker</Text>
                    </View>
                    <View className="h-44 mb-3">
                      <ResQMap crewLat={crewLat} crewLon={crewLon} hospitalLat={hosp.latitude} hospitalLon={hosp.longitude} showRouteLine={false} />
                    </View>
                    
                    <View className="flex-row justify-between pt-2 border-t border-surface-variant">
                      <Text className="text-[9px] text-on-surface-variant">LAT: {hosp.latitude.toFixed(5)}</Text>
                      <Text className="text-[9px] text-on-surface-variant">LON: {hosp.longitude.toFixed(5)}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
