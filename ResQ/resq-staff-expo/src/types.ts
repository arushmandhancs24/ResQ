/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AmbulanceStatus = "AVAILABLE" | "DISPATCHED" | "EN_ROUTE_HOSPITAL" | "AT_HOSPITAL" | "RETURNING" | "OFFLINE";

export interface Ambulance {
  id: number;
  vehicle_number: string;
  status: AmbulanceStatus;
  latitude: number;
  longitude: number;
  station_id: number;
  updated_at: string;
}

export type IncidentType = "cardiac" | "trauma" | "burns" | "neuro" | "general";

export interface Incident {
  id: number;
  latitude: number;
  longitude: number;
  incident_type: IncidentType;
  severity: number; // 1 to 5
  confidence_score: number;
  ward_id: number;
  ward_name: string;
  timestamp: string;
  status: "open" | "dispatched" | "resolved";
  created_at: string;
  resolved_at: string | null;
  notes?: string;
}

export interface Hospital {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  er_capacity: number;
  is_24x7: boolean;
  eta_seconds?: number;
}

export interface DispatchLog {
  id: number;
  incident_id: number;
  ambulance_id: number;
  hospital_id: number;
  eta_seconds: number;
  alternatives_considered: number;
  dispatched_at: string;
  // Visual fields
  incident_type?: IncidentType;
  severity?: number;
  hospital_name?: string;
}

export interface CrewShift {
  unitId: number;
  vehicleNumber: string;
  crewName: string;
  backendUrl: string;
  gpsInterval: number; // e.g. 10 seconds
  isShiftActive: boolean;
}

export interface ActiveIncidentState {
  incident: Incident;
  stage: 1 | 2 | 3 | 4 | 5 | 6; // 1: En Route, 2: On Scene, 3: Patient Loaded / Hospital Select, 4: En Route Hospital, 5: At Hospital / Handoff, 6: Complete
  selectedHospital: Hospital | null;
  isOverridden: boolean;
  originalRecommendedHospital: Hospital | null;
  onSceneTime: number; // seconds spent on stage 2
  hospitalTime: number; // seconds spent on stage 5
  totalTime: number; // seconds spent across active job
  patientHanded: boolean;
  paperworkSubmitted: boolean;
  ambulanceCleaned: boolean;
  routeWaypoints?: [number, number][];
  routeIndex?: number;
}

// --------------------------------------------------------------------------
// MOCK DATASETS
// --------------------------------------------------------------------------

// Coords for Bangalore Outer Ring Road area (Koramangala, HSR, Indiranagar, HAL etc.)
export const BENGALURU_COORDS = {
  latitude: 12.9352,
  longitude: 77.6245,
};

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 1,
    name: "Manipal Hospital (HAL Road)",
    latitude: 12.9592,
    longitude: 77.6490,
    specialties: ["cardiac", "trauma", "neuro", "general"],
    er_capacity: 12,
    is_24x7: true,
  },
  {
    id: 2,
    name: "St. John's Medical College Hospital",
    latitude: 12.9250,
    longitude: 77.6210,
    specialties: ["cardiac", "general", "neuro"],
    er_capacity: 8,
    is_24x7: true,
  },
  {
    id: 3,
    name: "Fortis Hospital (Bannerghatta Road)",
    latitude: 12.8923,
    longitude: 77.5985,
    specialties: ["trauma", "burns", "general"],
    er_capacity: 5,
    is_24x7: false,
  },
  {
    id: 4,
    name: "Narayana Health City",
    latitude: 12.8139,
    longitude: 77.6934,
    specialties: ["cardiac", "trauma", "neuro", "burns"],
    er_capacity: 15,
    is_24x7: true,
  },
  {
    id: 5,
    name: "Victoria Hospital Bengaluru",
    latitude: 12.9634,
    longitude: 77.5739,
    specialties: ["trauma", "burns", "general"],
    er_capacity: 20,
    is_24x7: true,
  }
];

export const MOCK_DISPATCH_HISTORY: DispatchLog[] = [
  {
    id: 101,
    ambulance_id: 7,
    incident_id: 39,
    incident_type: "trauma",
    severity: 3,
    hospital_id: 1,
    hospital_name: "Manipal Hospital (HAL Road)",
    eta_seconds: 540,
    alternatives_considered: 6,
    dispatched_at: "2026-06-01T14:23:00Z"
  },
  {
    id: 98,
    ambulance_id: 7,
    incident_id: 35,
    incident_type: "general",
    severity: 2,
    hospital_id: 2,
    hospital_name: "St. John's Medical College Hospital",
    eta_seconds: 380,
    alternatives_considered: 4,
    dispatched_at: "2026-06-01T09:11:00Z"
  },
  {
    id: 95,
    ambulance_id: 7,
    incident_id: 28,
    incident_type: "cardiac",
    severity: 5,
    hospital_id: 1,
    hospital_name: "Manipal Hospital (HAL Road)",
    eta_seconds: 420,
    alternatives_considered: 9,
    dispatched_at: "2026-05-31T18:05:00Z"
  }
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 42,
    latitude: 12.9716,
    longitude: 77.5946,
    incident_type: "cardiac",
    severity: 4,
    confidence_score: 0.92,
    ward_id: 142,
    ward_name: "Koramangala",
    status: "dispatched",
    timestamp: "2026-06-02T17:30:00Z",
    created_at: "2026-06-02T17:30:00Z",
    resolved_at: null,
    notes: "Patient reports severe chest pains radiating down left arm. High priority."
  },
  {
    id: 43,
    latitude: 12.9301,
    longitude: 77.6148,
    incident_type: "trauma",
    severity: 5,
    confidence_score: 0.88,
    ward_id: 151,
    ward_name: "HSR Layout",
    status: "dispatched",
    timestamp: "2026-06-02T17:35:00Z",
    created_at: "2026-06-02T17:35:00Z",
    resolved_at: null,
    notes: "Multi-vehicle major collision at Agara flyover junction. Road traffic trauma."
  },
  {
    id: 44,
    latitude: 12.9802,
    longitude: 77.6405,
    incident_type: "burns",
    severity: 3,
    confidence_score: 0.95,
    ward_id: 88,
    ward_name: "Indiranagar",
    status: "dispatched",
    timestamp: "2026-06-02T17:37:00Z",
    created_at: "2026-06-02T17:37:00Z",
    resolved_at: null,
    notes: "Commercial kitchen oil spill accident. Second degree burns covering upper body."
  }
];

export const MOCK_FLEET: Ambulance[] = [
  {
    id: 1,
    vehicle_number: "KA-01-M-1111",
    status: "AVAILABLE",
    latitude: 12.9270,
    longitude: 77.6250,
    station_id: 2,
    updated_at: "2026-06-02T17:36:00Z"
  },
  {
    id: 3,
    vehicle_number: "KA-03-N-3333",
    status: "DISPATCHED",
    latitude: 12.9620,
    longitude: 77.6410,
    station_id: 1,
    updated_at: "2026-06-02T17:37:00Z"
  },
  {
    id: 5,
    vehicle_number: "KA-02-E-5555",
    status: "EN_ROUTE_HOSPITAL",
    latitude: 12.9400,
    longitude: 77.6050,
    station_id: 2,
    updated_at: "2026-06-02T17:35:00Z"
  },
  {
    id: 8,
    vehicle_number: "KA-04-A-8888",
    status: "OFFLINE",
    latitude: 12.9100,
    longitude: 77.5800,
    station_id: 3,
    updated_at: "2026-06-02T17:20:00Z"
  }
];
