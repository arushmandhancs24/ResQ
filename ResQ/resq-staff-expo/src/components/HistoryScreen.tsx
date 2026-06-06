import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Calendar, Clock, Shuffle, Building2, FileText, Bookmark } from "lucide-react-native";
import { DispatchLog, MOCK_DISPATCH_HISTORY } from "../types";

interface HistoryScreenProps {
  backendUrl: string;
  unitId: number;
}

export default function HistoryScreen({ backendUrl, unitId }: HistoryScreenProps) {
  const [history, setHistory] = useState<DispatchLog[]>([]);
  const [filterMode, setFilterMode] = useState<"mine" | "all">("mine");
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setIsFallback(false);
      try {
        const url = filterMode === "mine" ? `${backendUrl}/dispatch/history?ambulance_id=${unitId}` : `${backendUrl}/dispatch/history`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const data = await response.json();
        if (Array.isArray(data)) setHistory(data);
        else throw new Error("Empty or invalid array");
      } catch (err) {
        setHistory(MOCK_DISPATCH_HISTORY);
        setIsFallback(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [backendUrl, filterMode, unitId]);

  const filteredHistory = [...history]
    .sort((a, b) => new Date(b.dispatched_at).getTime() - new Date(a.dispatched_at).getTime());

  const formatEta = (seconds: number) => `~${Math.floor(seconds / 60)} mins`;

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false
      }) + " IST";
    } catch {
      return dateString;
    }
  };

  const getSeverityDots = (sev: number) => (
    <View className="flex-row gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((d) => (
        <View key={d} className={`w-1.5 h-1.5 rounded-full ${d <= sev ? "bg-red-500" : "bg-slate-800"}`} />
      ))}
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-[#0B1012] px-4 py-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">DEPLOYMENT LOGS</Text>
        {isFallback && (
          <View className="bg-tertiary/10 border border-tertiary/30 px-2 py-0.5">
            <Text className="text-[9px] text-tertiary font-bold uppercase">SIMULATED LOG DATABASE</Text>
          </View>
        )}
      </View>

      <View className="flex-row bg-surface-container-low border border-surface-variant mb-4">
        <TouchableOpacity
          onPress={() => setFilterMode("mine")}
          className={`flex-1 h-9 flex-row items-center justify-center gap-1.5 ${filterMode === "mine" ? "bg-secondary" : ""}`}
        >
          <Bookmark size={14} color={filterMode === "mine" ? "#fff" : "#cbd5e1"} />
          <Text className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === "mine" ? "text-white" : "text-on-surface-variant"}`}>
            Unit #{unitId} (MINE)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterMode("all")}
          className={`flex-1 h-9 flex-row items-center justify-center gap-1.5 ${filterMode === "all" ? "bg-secondary" : ""}`}
        >
          <FileText size={14} color={filterMode === "all" ? "#fff" : "#cbd5e1"} />
          <Text className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === "all" ? "text-white" : "text-on-surface-variant"}`}>
            GRID LOG REGISTER
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="items-center justify-center py-16 bg-surface border border-surface-variant">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-xs text-on-surface-variant mt-3 uppercase tracking-wider">Fetching logs history...</Text>
        </View>
      ) : filteredHistory.length === 0 ? (
        <View className="items-center justify-center py-14 border border-surface-variant bg-surface relative">
          <View className="absolute top-0 left-0 bottom-0 w-[4px] bg-secondary" />
          <Calendar size={32} color="#94a3b8" className="mb-3" />
          <Text className="text-xs font-bold text-white uppercase tracking-wider mb-2">No Deployments Registered</Text>
          <Text className="text-[11px] text-on-surface-variant text-center px-4">
            {filterMode === "mine" ? "Your unit ID has not recorded unknown dispatch events under current shift." : "No historical logged dispatches found in the network."}
          </Text>
        </View>
      ) : (
        <View className="space-y-3.5 mb-10">
          {filteredHistory.map((log) => {
            const isMine = log.ambulance_id === unitId;
            return (
              <View key={log.id} className={`p-4 border bg-surface relative mb-3 ${isMine ? "border-surface-variant" : "border-surface-variant/40 opacity-60"}`}>
                {isMine && <View className="absolute top-0 left-0 bottom-0 w-[3px] bg-secondary" />}
                
                <View className="flex-row items-center justify-between border-b border-surface-variant pb-2.5 mb-3 pl-1">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-surface-container-low border border-surface-variant px-2 py-0.5">
                      <Text className="text-[9px] font-bold uppercase text-white">AMB #{log.ambulance_id}</Text>
                    </View>
                    {isMine && (
                      <View className="bg-secondary/10 border border-secondary/30 px-1.5 py-0.5">
                        <Text className="text-[8px] font-bold text-secondary uppercase tracking-wide">ACTIVE UNIT</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={12} color="#3b82f6" />
                    <Text className="text-[9px] text-on-surface-variant">{formatTimestamp(log.dispatched_at)}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-3 pl-1">
                  <View>
                    <Text className="text-on-surface-variant font-bold text-[9px] uppercase mb-0.5">Incident Class</Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <Text className="font-bold text-white uppercase text-[11px]">{log.incident_type || "general"}</Text>
                      {getSeverityDots(log.severity || 1)}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-on-surface-variant font-bold text-[9px] uppercase mb-0.5">Computed ETA</Text>
                    <Text className="font-bold text-secondary text-[11px] mt-0.5">{formatEta(log.eta_seconds)}</Text>
                  </View>
                </View>

                <View className="pt-2.5 border-t border-surface-variant pl-1 mb-2.5">
                  <View className="flex-row items-start gap-1.5">
                    <View className="mt-0.5"><Building2 size={14} color="#94a3b8" /></View>
                    <View className="flex-1">
                      <Text className="text-[9px] font-bold text-on-surface-variant uppercase">Delivered Facility Destination</Text>
                      <Text className="font-bold uppercase tracking-wider text-[11px] text-white mt-1" numberOfLines={1}>
                        {log.hospital_name || `Hospital ID #${log.hospital_id}`}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-surface-variant pl-1">
                  <View className="flex-row items-center gap-1">
                    <Shuffle size={12} color="#94a3b8" />
                    <Text className="text-[9px] uppercase text-on-surface-variant">Alternatives considered: {log.alternatives_considered}</Text>
                  </View>
                  <Text className="text-[9px] text-on-surface-variant">LOG: #{log.id}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
