import { FleetUnit, Incident, EmergencyType } from './types';

// Bengaluru geographic and ward information
export const BENGALURU_STATIONS = [
  { id: 'ALPHA', name: 'STATION ALPHA', coordinates: '12.9912, 77.6145', info: 'North East Division' },
  { id: 'BETA', name: 'STATION BETA', coordinates: '12.9482, 77.5684', info: 'South West Division' },
];

export const INITIAL_FLEET_UNITS: FleetUnit[] = [
  {
    id: 'KA-01-E-1122',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    location: 'Cubbon Park Metro',
    coordinates: '12.9716, 77.5946',
    homeStation: 'Central Base',
    dailyDispatches: 4,
    lastUpdatedMinutesAgo: 2,
  },
  {
    id: 'KA-05-M-4455',
    type: 'PARAMEDIC',
    status: 'DISPATCHED',
    location: 'Indiranagar 100ft Rd',
    coordinates: '12.9815, 77.6409',
    homeStation: 'East Base',
    dailyDispatches: 6,
    lastUpdatedMinutesAgo: 4,
  },
  {
    id: 'KA-03-F-9988',
    type: 'RAPID_RESPONSE',
    status: 'RETURNING',
    location: 'Victoria Hospital',
    coordinates: '12.9592, 77.5731',
    homeStation: 'South Base',
    dailyDispatches: 2,
    lastUpdatedMinutesAgo: 1,
  },
  {
    id: 'KA-02-B-3344',
    type: 'PARAMEDIC',
    status: 'AVAILABLE',
    location: 'Koramangala 5th Block',
    coordinates: '12.9348, 77.6189',
    homeStation: 'Central Base',
    dailyDispatches: 3,
    lastUpdatedMinutesAgo: 8,
  },
  {
    id: 'KA-04-A-7700',
    type: 'AMBULANCE',
    status: 'OFFLINE',
    location: 'Malleshwaram Depot',
    coordinates: '13.0031, 77.5694',
    homeStation: 'North Base',
    dailyDispatches: 0,
    lastUpdatedMinutesAgo: 45,
  }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: '9982',
    type: 'CARDIAC',
    severity: 8, // 8 on 1-10 slider (or 04 on 01-05 indicator of images)
    location: 'Ward 162 - Shivajinagar',
    coordinates: '12.9716, 77.5946',
    status: 'ACTIVE',
    etaInSeconds: 380,
    unitId: 'KA-01-E-1122',
    alternatives: 3,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  },
  {
    id: '9981',
    type: 'TRAUMA',
    severity: 10,
    location: 'Indiranagar Metro Station',
    coordinates: '12.9815, 77.6409',
    status: 'RESOLVED',
    etaInSeconds: 420,
    unitId: 'KA-05-M-4455',
    alternatives: 1,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    report: 'Patient experienced severe orthopaedic trauma following a motor vehicle crash. Paramedics stabilized the spine and transported the patient to Victoria Allied Trauma Care. Dynamic rerouting successful.',
  },
  {
    id: '9980',
    type: 'GENERAL',
    severity: 6,
    location: 'Victoria Hospital Outer Compound',
    coordinates: '12.9592, 77.5731',
    status: 'RESOLVED',
    etaInSeconds: 120,
    unitId: 'KA-02-B-3344',
    alternatives: 0,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    report: 'Elderly patient with signs of heat stress. Hydration and cooling protocol administered on-site. Transport declined. Unit flagged back to base.',
  }
];

export const EMERGENCY_DETAILS = {
  TRAUMA: {
    label: 'TRAUMA',
    icon: 'home_health', // we'll use Material icon name
    color: 'text-primary',
    bg: 'bg-primary/10',
    description: 'Orthopaedic, bleed, accident & mechanical impact emergencies.',
    colorHex: '#ff544c',
  },
  CARDIAC: {
    label: 'CARDIAC',
    icon: 'cardiology',
    color: 'text-primary',
    bg: 'bg-primary/10',
    description: 'Myocardial infarcts, arrhythmias, and sudden circulatory failures.',
    colorHex: '#ff544c',
  },
  BURNS: {
    label: 'BURNS',
    icon: 'local_fire_department',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container',
    description: 'Thermal, chemical, radiation, or electrical contact skin and organ damage.',
    colorHex: '#ff751b',
  },
  RESPIRATORY: {
    label: 'RESPIRATORY',
    icon: 'air',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container',
    description: 'Severe airway obstruction, asthma flare, anaphylaxis or hypoxia.',
    colorHex: '#ffb691',
  },
  NEUROLOGICAL: {
    label: 'NEUROLOGICAL',
    icon: 'neurology',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container',
    description: 'Seizures, strokes, head wounds, and critical neural incidents.',
    colorHex: '#7ddc7a',
  },
  GENERAL: {
    label: 'GENERAL',
    icon: 'medical_services',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container',
    description: 'All other medical assistance calls, vital checks and basic life support.',
    colorHex: '#93f994',
  },
};
