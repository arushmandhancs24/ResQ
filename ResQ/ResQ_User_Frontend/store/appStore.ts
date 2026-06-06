import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { config } from '../constants/config';

export interface AppState {
  // User
  userProfile: { fullName: string; phone: string; email: string; address: string };
  deviceId: string;
  emergencyContacts: Array<{ id: string; name: string; phone: string }>;
  medicalInfo: { age: string; height: string; weight: string; bloodType: string; allergies: string; conditions: string };
  
  // Active incident
  activeIncident: {
    incidentId: number;
    dispatchLogId: number;
    incidentType: string;
    severity: number;
    latitude: number;
    longitude: number;
    reportedAt: string;
    status: 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'en_route_hospital' | 'at_hospital' | 'resolved' | 'cancelled';
  } | null;
  
  // Ambulance tracking
  assignedAmbulance: {
    id: number;
    vehicleNumber: string;
    latitude: number;
    longitude: number;
    status: string;
    etaSeconds: number;
  } | null;
  
  // Hospital
  destinationHospital: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    specialties: string[];
    erCapacity: number;
    is24x7: boolean;
  } | null;
  
  // Ambulance tracking specific internal
  originalEtaSeconds: number | null;
  positionHistory: Array<{ latitude: number; longitude: number }>;
  
  // App config
  apiBaseUrl: string;
  wsUrl: string;
  mockMode: boolean;
  
  // Actions
  setUserProfile: (profile: AppState['userProfile']) => void;
  setDeviceId: (id: string) => void;
  setEmergencyContacts: (contacts: AppState['emergencyContacts']) => void;
  setMedicalInfo: (info: AppState['medicalInfo']) => void;
  setActiveIncident: (incident: AppState['activeIncident']) => void;
  setAssignedAmbulance: (ambulance: AppState['assignedAmbulance']) => void;
  setDestinationHospital: (hospital: AppState['destinationHospital']) => void;
  
  updateAmbulanceLocation: (lat: number, lon: number) => void;
  updateAmbulanceStatus: (status: string) => void;
  updateEta: (seconds: number) => void;
  
  resolveIncident: () => void;
  clearIncident: () => void;
  
  setMockMode: (on: boolean) => void;
  setApiBaseUrl: (url: string) => void;
  setWsUrl: (url: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      userProfile: { fullName: '', phone: '', email: '', address: '' },
      deviceId: Crypto.randomUUID(), // Initialize with UUID, persisted
      emergencyContacts: [],
      medicalInfo: { age: '', height: '', weight: '', bloodType: '', allergies: '', conditions: '' },
      
      // Active incident
      activeIncident: null,
      assignedAmbulance: null,
      destinationHospital: null,
      originalEtaSeconds: null,
      positionHistory: [],
      
      // App config
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
      wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000/ws/dispatch',
      mockMode: config.mockModeDefault, // Default from config
      
      // Actions
      setUserProfile: (profile) => set({ userProfile: profile }),
      setDeviceId: (id) => set({ deviceId: id }),
      setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),
      setMedicalInfo: (info) => set({ medicalInfo: info }),
      
      setActiveIncident: (incident) => set({ activeIncident: incident }),
      setAssignedAmbulance: (ambulance) => set({ 
        assignedAmbulance: ambulance,
        originalEtaSeconds: ambulance?.etaSeconds || null,
        positionHistory: ambulance ? [{ latitude: ambulance.latitude, longitude: ambulance.longitude }] : []
      }),
      setDestinationHospital: (hospital) => set({ destinationHospital: hospital }),
      
      updateAmbulanceLocation: (lat, lon) => set((state) => {
        if (!state.assignedAmbulance) return state;
        const newHistory = [{ latitude: lat, longitude: lon }, ...state.positionHistory].slice(0, 10);
        return {
          assignedAmbulance: { ...state.assignedAmbulance, latitude: lat, longitude: lon },
          positionHistory: newHistory
        };
      }),
      
      updateAmbulanceStatus: (status) => set((state) => {
        if (!state.assignedAmbulance) return state;
        
        // Also update activeIncident status to match if applicable
        let incidentStatus = state.activeIncident?.status;
        if (state.activeIncident) {
            const statusMap: Record<string, AppState['activeIncident']['status']> = {
                'DISPATCHED': 'dispatched',
                'EN_ROUTE': 'en_route',
                'ON_SCENE': 'on_scene',
                'EN_ROUTE_HOSPITAL': 'en_route_hospital',
                'AT_HOSPITAL': 'at_hospital',
            };
            incidentStatus = statusMap[status] || incidentStatus;
        }
        
        return {
          assignedAmbulance: { ...state.assignedAmbulance, status },
          ...(state.activeIncident && incidentStatus ? { activeIncident: { ...state.activeIncident, status: incidentStatus } } : {})
        };
      }),
      
      updateEta: (seconds) => set((state) => {
        if (!state.assignedAmbulance) return state;
        return {
          assignedAmbulance: { ...state.assignedAmbulance, etaSeconds: seconds }
        };
      }),
      
      resolveIncident: () => set((state) => {
        if (!state.activeIncident) return state;
        return {
          activeIncident: { ...state.activeIncident, status: 'resolved' }
        };
      }),
      
      clearIncident: () => set({
        activeIncident: null,
        assignedAmbulance: null,
        destinationHospital: null,
        originalEtaSeconds: null,
        positionHistory: []
      }),
      
      setMockMode: (on) => set({ mockMode: on }),
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
      setWsUrl: (url) => set({ wsUrl: url }),
    }),
    {
      name: 'resq-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        deviceId: state.deviceId, 
        userProfile: state.userProfile, 
        emergencyContacts: state.emergencyContacts, 
        medicalInfo: state.medicalInfo,
        mockMode: state.mockMode,
        activeIncident: state.activeIncident,
        assignedAmbulance: state.assignedAmbulance,
        destinationHospital: state.destinationHospital,
        originalEtaSeconds: state.originalEtaSeconds,
        positionHistory: state.positionHistory,
      }),
    }
  )
);
