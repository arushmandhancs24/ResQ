export interface FleetUnit {
  id: number
  vehicle_number: string
  status: 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE_HOSPITAL' | 'AT_HOSPITAL' | 'RETURNING' | 'OFFLINE'
  latitude: number
  longitude: number
  station_id: number
  updated_at: string
}

export const mockDispatchResponse = {
  dispatch_log_id: 101,
  ambulance_id: 7,
  ambulance: {
    id: 7,
    vehicle_number: "KA-01-AB-1234",
    latitude: 12.9200,
    longitude: 77.6150,
    status: "DISPATCHED"
  },
  hospital: {
    id: 1,
    name: "Manipal Hospital (HAL Airport Road)",
    latitude: 12.9592,
    longitude: 77.6490,
    specialties: ["cardiac", "trauma", "neuro"],
    er_capacity: 12,
    is_24x7: true
  },
  eta_seconds: 480,
  alternatives_considered: 6,
  dispatched_at: new Date().toISOString()
}

export const mockIncidentReport = {
  id: 42,
  incident_id: 42,
  status: "dispatched",
  confidence_score: 0.92,
  ward_name: "Koramangala",
  created_at: new Date().toISOString()
}

export const mockFleetStatus: FleetUnit[] = [
  { id: 7,  vehicle_number: "KA-01-AB-1234", status: "DISPATCHED",  latitude: 12.9250, longitude: 77.6180, station_id: 3, updated_at: new Date().toISOString() },
  { id: 12, vehicle_number: "KA-01-CD-5678", status: "AVAILABLE",   latitude: 12.9400, longitude: 77.6300, station_id: 3, updated_at: new Date().toISOString() },
  { id: 15, vehicle_number: "KA-01-EF-9012", status: "EN_ROUTE_HOSPITAL", latitude: 12.9600, longitude: 77.6100, station_id: 4, updated_at: new Date().toISOString() }
]

export const mockDispatchHistory = [
  {
    id: 100,
    incident_id: 41,
    ambulance_id: 12,
    hospital_id: 1,
    eta_seconds: 420,
    alternatives_considered: 4,
    dispatched_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    status: 'resolved',
    incident_type: 'general',
    severity: 3
  }
];

// In services/mock.ts — add this simulation engine
export function startMockAmbulanceSimulation(
  userLat: number,
  userLon: number,
  onUpdate: (lat: number, lon: number, etaSeconds: number) => void,
  onStatusChange: (status: string) => void
) {
  // Start ~0.8km away from user (roughly 8 min ETA at Bengaluru traffic speeds)
  let currentLat = userLat - 0.007;
  let currentLon = userLon - 0.005;
  
  // Total journey ~16 steps of 3s each = ~48 seconds of demo
  const TOTAL_STEPS = 16;
  const latStep = (userLat - currentLat) / TOTAL_STEPS;
  const lonStep = (userLon - currentLon) / TOTAL_STEPS;
  
  let step = 0;
  
  const intervalId = setInterval(() => {
    step++;
    
    currentLat += latStep;
    currentLon += lonStep;
    
    // approx km/s in city traffic
    const remainingDistanceDegrees = Math.sqrt(
      Math.pow(userLat - currentLat, 2) + Math.pow(userLon - currentLon, 2)
    );
    // Rough approx: 1 degree ~ 111km. 
    const distanceKm = remainingDistanceDegrees * 111;
    const etaSeconds = Math.max(0, Math.floor(distanceKm / 0.00278));
    
    if (step === 2) {
      onStatusChange('EN_ROUTE');
    }
    
    if (step >= 14) {
      currentLat = userLat;
      currentLon = userLon;
      onStatusChange('ON_SCENE');
      onUpdate(currentLat, currentLon, 0);
      clearInterval(intervalId);
    } else {
      onUpdate(currentLat, currentLon, etaSeconds);
    }
  }, 3000);
  
  // Return a cleanup function
  return () => clearInterval(intervalId);
}
