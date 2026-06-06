export type EmergencyType = 'TRAUMA' | 'CARDIAC' | 'BURNS' | 'RESPIRATORY' | 'NEUROLOGICAL' | 'GENERAL';

export type UnitType = 'AMBULANCE' | 'PARAMEDIC' | 'RAPID_RESPONSE';

export type UnitStatus = 'AVAILABLE' | 'DISPATCHED' | 'RETURNING' | 'OFFLINE';

export type IncidentStatus = 'ACTIVE' | 'RESOLVED';

export interface Incident {
  id: string; // e.g., "9982"
  type: EmergencyType;
  severity: number; // 1 to 10
  location: string;
  coordinates: string; // "12.9716, 77.5946"
  status: IncidentStatus;
  etaInSeconds: number;
  unitId: string | null;
  alternatives: number;
  createdAt: string;
  report?: string;
}

export interface FleetUnit {
  id: string; // e.g. "KA-01-E-1122"
  type: UnitType;
  status: UnitStatus;
  location: string;
  coordinates: string;
  homeStation: string;
  dailyDispatches: number;
  lastUpdatedMinutesAgo: number;
}

export type ActiveTab = 'MAP' | 'INCIDENTS' | 'FLEET' | 'LOGS';

export interface DispatchCenter {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  capacity: number;
  activeFleetCount: number;
}

export interface RiskZone {
  id: string;
  name: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  boundary?: { lat: number; lng: number }[]; // Irregular polygon mesh coordinates from real-time spatial APIs
  riskScore: number; // 1 to 10
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MeshLink {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

