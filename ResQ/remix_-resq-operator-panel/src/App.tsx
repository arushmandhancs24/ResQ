import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import FleetView from './components/FleetView';
import LogsView from './components/LogsView';
import NewDispatchForm from './components/NewDispatchForm';
import { INITIAL_FLEET_UNITS, INITIAL_INCIDENTS } from './data';
import { FleetUnit, Incident, EmergencyType, UnitStatus, ActiveTab } from './types';
import { computeBackoff } from './utils/backoff';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/dispatch';

function SystemClock() {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('18:42:20');
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const hrs = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      const secs = d.getSeconds().toString().padStart(2, '0');
      setCurrentTimeStr(`${hrs}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 font-mono select-none">
      <div className="flex items-center gap-1.5 bg-[#060a16] px-2.5 py-1 border border-surface-container-highest">
        <span className="text-[10px] text-on-surface-variant/60 font-semibold uppercase leading-none">SYS_CLOCK:</span>
        <span className="text-xs text-white font-bold tracking-widest leading-none tabular-nums">
          {currentTimeStr}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  // --- Core State Registries ---
  const [fleetUnits, setFleetUnits] = useState<FleetUnit[]>(INITIAL_FLEET_UNITS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('MAP');
  const [wsConnected, setWsConnected] = useState(false);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const [reconnectCounter, setReconnectCounter] = useState(0);

  // --- Dispatch Wizard Trigger States ---
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchCoords, setDispatchCoords] = useState<string>('');
  const [dispatchWard, setDispatchWard] = useState<string>('');
  const [preselectedUnitId, setPreselectedUnitId] = useState<string | null>(null);

  // --- Operator Notes Console Stream ---
  const [operationLogs, setOperationLogs] = useState<Array<{ timestamp: string; text: string; category: string }>>([
    { timestamp: '18:42:01', text: 'INGRESS: Initialized Bengaluru municipal tracking telemetry gateway.', category: 'SYS' },
    { timestamp: '18:42:05', text: 'NETWORK: Voronoi risk zones tiling compiled at 500m mesh parity.', category: 'SYS' },
    { timestamp: '18:42:10', text: 'FLEET: Registered ambulances and rapid responders reporting online.', category: 'FLEET' },
    { timestamp: '18:42:15', text: 'SYS: Listening on standard port 3000 for server-side telemetry broadcasts.', category: 'SYS' },
    { timestamp: '18:42:20', text: 'OPS: System active. Continuous tracking of Cubbon Park & Indiranagar bounds loaded.', category: 'OPS' },
  ]);

  const [terminalInput, setTerminalInput] = useState<string>('');

  // Clock extracted to separate component to prevent 1-second full tree re-renders

  // --- Logger Helper to update operator HUD feeds ---
  const addLog = (text: string, category = 'SYS') => {
    const d = new Date();
    const timestamp = d.toTimeString().split(' ')[0];
    setOperationLogs((prev) => [...prev, { timestamp, text, category }]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fleetRes, historyRes] = await Promise.allSettled([
          fetch(`${apiBaseUrl}/fleet/status`),
          fetch(`${apiBaseUrl}/dispatch/history`)
        ]);

        let hasError = false;

        if (fleetRes.status === 'fulfilled' && fleetRes.value.ok) {
          const fleetData = await fleetRes.value.json();
          if (fleetData.available_units) {
            const mappedUnits = fleetData.available_units.map((u: unknown) => ({
              id: String(u.unit_id),
              type: 'AMBULANCE',
              status: (u.status || 'AVAILABLE').toUpperCase(),
              location: u.home_station_id ? `Station ${u.home_station_id}` : 'In Transit',
              coordinates: `${u.latitude || 12.9716},${u.longitude || 77.5946}`,
              homeStation: u.home_station_id ? `Station ${u.home_station_id}` : 'Alpha Base',
              dailyDispatches: 0,
              lastUpdatedMinutesAgo: 0
            }));
            setFleetUnits(mappedUnits);
          }
        } else {
          hasError = true;
          addLog('SYS: Failed to fetch live fleet status. Using local fallback.', 'SYS');
        }

        if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
          const historyData = await historyRes.value.json();
          if (Array.isArray(historyData)) {
            const mappedIncidents: Incident[] = historyData.map((log: unknown) => ({
              id: String(log.id),
              type: (log.incident_type || 'GENERAL').toUpperCase(),
              severity: log.severity || 3,
              location: log.hospital_name || `Hospital #${log.hospital_id}`,
              coordinates: '12.9716,77.5946', // Fallback default
              status: 'RESOLVED',
              etaInSeconds: log.eta_seconds || 0,
              unitId: String(log.ambulance_id),
              alternatives: log.alternatives_considered || 0,
              createdAt: log.dispatched_at || new Date().toISOString(),
              report: `Incident ${log.incident_id} dispatched to ${log.hospital_name || 'Hospital'}`
            }));
            setIncidents(mappedIncidents);
          }
        } else {
          hasError = true;
          addLog('SYS: Failed to fetch live dispatch history. Using local fallback.', 'SYS');
        }

        if (hasError) {
          setBackendWarning('Live backend disconnected. Using local simulated data.');
        } else {
          setBackendWarning(null);
          addLog('SYS: Live backend connected and data synced.', 'SYS');
        }
      } catch (err) {
        setBackendWarning('Failed to connect to backend. Using local simulated data.');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isActive = true;

    const connectWebsocket = (attempt = 0) => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isActive) { ws.close(); return; }
          setWsConnected(true);
          setBackendWarning(null);
          addLog('SYS: WebSocket telemetry stream connected.', 'SYS');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'LOCATION_UPDATE') {
              setFleetUnits(prev => prev.map(u => 
                Number(u.id) === data.unit_id 
                  ? { ...u, coordinates: `${data.latitude},${data.longitude}` } 
                  : u
              ));
            } else if (data.type === 'STATUS_UPDATE') {
              setFleetUnits(prev => prev.map(u => 
                Number(u.id) === data.unit_id 
                  ? { ...u, status: data.status.toUpperCase() as UnitStatus } 
                  : u
              ));
            } else if (data.type === 'dispatch') {
              setIncidents(prev => {
                const newIncident: Incident = {
                  id: String(data.incident_id),
                  type: (data.incident?.incident_type || 'GENERAL').toUpperCase(),
                  severity: data.incident?.severity || 3,
                  location: data.hospital?.name || `Hospital`,
                  coordinates: `${data.incident?.latitude || 12.9716},${data.incident?.longitude || 77.5946}`,
                  status: 'ACTIVE',
                  etaInSeconds: data.eta_seconds || 300,
                  unitId: String(data.ambulance_id),
                  alternatives: 0,
                  createdAt: new Date().toISOString()
                };
                return [newIncident, ...prev];
              });
              addLog(`OPS: New active incident #${data.incident_id} dispatched.`, 'OPS');
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!isActive) return;
          setWsConnected(false);
          addLog('SYS: WebSocket telemetry stream disconnected. Reconnecting...', 'SYS');
          reconnectTimeout = setTimeout(() => {
            connectWebsocket(attempt + 1);
          }, computeBackoff(attempt));
        };
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
      }
    };

    connectWebsocket();

    return () => {
      isActive = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // --- Handlers for Tactical operations ---

  // 1. Operator opens dispatch card by clicking point on Map
  const handleNewIncidentClick = (coords: string, wardName: string) => {
    setDispatchCoords(coords);
    setDispatchWard(wardName);
    setPreselectedUnitId(null);
    setIsDispatching(true);
    addLog(`CONSOLE: Handshaking GPS grid cell [${coords}] in ${wardName}. Ready for deployment.`, 'OPS');
  };

  // 2. Operator opens dispatch card by assigning vehicle from Fleet Lists
  const handleAssignToNewIncident = (unit: FleetUnit) => {
    setDispatchCoords(unit.coordinates);
    setDispatchWard(`Route via ${unit.location}`);
    setPreselectedUnitId(unit.id);
    setIsDispatching(true);
    addLog(`CONSOLE: Prefilled dispatch lock for vehicle [${unit.id}] stationed at ${unit.homeStation}.`, 'FLEET');
  };

  // 3. Close the dispatch trigger panel
  const handleCancelDispatch = () => {
    setIsDispatching(false);
    addLog(`SYS: Aborted emergency dispatch card composition.`, 'SYS');
  };

  // 4. Dispatch a new active emergency incident
  const handleDispatchSubmit = async (dispatchData: {
    type: EmergencyType;
    severity: number;
    coordinates: string;
    location: string;
    unitId: string;
  }) => {
    let finalId = (Math.max(...incidents.map((i) => Number(i.id) || 0), 9980) + 1).toString();
    let assignedUnitId = dispatchData.unitId;
    let eta = 300 + (10 - dispatchData.severity) * 30;

    try {
      const [latStr, lonStr] = dispatchData.coordinates.split(',');
      const res = await fetch(`${apiBaseUrl}/dispatch/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(latStr),
          longitude: parseFloat(lonStr),
          incident_type: dispatchData.type.toLowerCase(),
        })
      });
      if (res.ok) {
        const data = await res.json();
        finalId = String(data.incident_id);
        assignedUnitId = String(data.assigned_unit);
        if (data.eta_seconds) {
            eta = data.eta_seconds;
        }
      } else {
        console.warn("Backend dispatch failed, using local fallback");
      }
    } catch (err) {
      console.warn("Backend dispatch error, using local fallback", err);
    }

    const newIncident: Incident = {
      id: finalId,
      type: dispatchData.type,
      severity: dispatchData.severity,
      location: dispatchData.location,
      coordinates: dispatchData.coordinates,
      status: 'ACTIVE',
      etaInSeconds: eta,
      unitId: assignedUnitId,
      alternatives: Math.round(1 + Math.random() * 3),
      createdAt: new Date().toISOString(),
    };

    // Append to incidents array
    setIncidents((prev) => [...prev, newIncident]);

    // Set designated vehicle status to DISPATCHED
    setFleetUnits((prev) =>
      prev.map((u) => {
        if (u.id === assignedUnitId) {
          return {
            ...u,
            status: 'DISPATCHED' as UnitStatus,
            location: dispatchData.location,
            coordinates: dispatchData.coordinates,
            dailyDispatches: u.dailyDispatches + 1,
          };
        }
        return u;
      })
    );

    setIsDispatching(false);
    addLog(`FLEET: Emergency active. Despatched vehicle [${assignedUnitId}] to municipal Ward [${dispatchData.location}].`, 'FLEET');
    addLog(`OPS: Dynamic incident Case #${finalId} established for ${dispatchData.type}. Level: ${dispatchData.severity}.`, 'OPS');
    
    // Switch to Map to follow response path
    setActiveTab('MAP');
    alert(`DISPATCH CODE LOCKED:\nCase #${finalId} successfully published. Unit ${assignedUnitId} routed.`);
  };

  // 5. Change vehicle status directly
  const handleModifyStatus = (unitId: string, newStatus: UnitStatus) => {
    setFleetUnits((prev) =>
      prev.map((u) => {
        if (u.id === unitId) {
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
    addLog(`FLEET: Responder unit [${unitId}] registered manual status shift to: [${newStatus}].`, 'FLEET');

    fetch(`${apiBaseUrl}/fleet/${unitId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus.toLowerCase() }),
    }).catch(err => {
      console.warn("Failed to update status on backend:", err);
    });
  };

  // 6. Swap vehicles mid-route (Intervention)
  const handleSwapUnit = (incidentId: string, newUnitId: string) => {
    const targetIncident = incidents.find((i) => i.id === incidentId);
    if (!targetIncident) return;

    const oldUnitId = targetIncident.unitId;

    // Update incident assigned unit
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id === incidentId) {
          return { ...i, unitId: newUnitId };
        }
        return i;
      })
    );

    // Free old unit and engage new unit
    setFleetUnits((prev) =>
      prev.map((u) => {
        if (u.id === oldUnitId) {
          return { ...u, status: 'AVAILABLE' as UnitStatus };
        }
        if (u.id === newUnitId) {
          const matchingInc = incidents.find(item => item.id === incidentId);
          return {
            ...u,
            status: 'DISPATCHED' as UnitStatus,
            location: matchingInc?.location || u.location,
            coordinates: matchingInc?.coordinates || u.coordinates,
          };
        }
        return u;
      })
    );

    addLog(`OPS: Hot route intervention initiated on Case #${incidentId}. Substituted [${oldUnitId}] with unit [${newUnitId}].`, 'OPS');
    alert(`INTERVENTION SUCCESSFUL:\nAmbulance replaced. Dispatch rerouted to Unit ${newUnitId}.`);
  };

  // 7. Settle case once paramedics report contact & stabilization achieved
  const handleResolveIncident = (incidentId: string) => {
    const targetIncident = incidents.find((i) => i.id === incidentId);
    if (!targetIncident) return;

    const assignedUnitId = targetIncident.unitId;

    // Complete incident status
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id === incidentId) {
          return {
            ...i,
            status: 'RESOLVED',
            report: `Stabilization achieved within operational parameters. Transferred details to receiving clinical shock compound. Responding clinician: Team J. Reynolds.`,
          };
        }
        return i;
      })
    );

    // Free responding vehicle
    if (assignedUnitId) {
      setFleetUnits((prev) =>
        prev.map((u) => {
          if (u.id === assignedUnitId) {
            return {
              ...u,
              status: 'RETURNING' as UnitStatus,
            };
          }
          return u;
        })
      );
    }

    addLog(`SYS: Emergency Case #${incidentId} resolved. Transport logged. Responding ambulance released to home station.`, 'SYS');
    alert(`CASE COMPLETED:\nEmergency Case #${incidentId} stabilized. Fleet unit returning to home base.`);
  };

  // 8. Custom logging form submission from side console
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    addLog(`OPERATOR: "${terminalInput.trim()}"`, 'EXEC');
    setTerminalInput('');
  };

  // Filter available units for prefill dropdown selection
  const availableUnits = fleetUnits.filter((u) => u.status === 'AVAILABLE');

  return (
    <div className="flex flex-col w-full h-screen bg-[#0e1322] font-sans antialiased text-on-surface relative overflow-hidden">
      
      {/* 1. Header Control Tower */}
      <header className="bg-[#090e1c] border-b border-surface-container-highest px-4 py-3 flex items-center justify-between shrink-0 relative z-50 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-[52px] w-[52px] shrink-0 -my-2 select-none" aria-label="ResQ Logo">
              {/* Back Speed lines indicating rapid response */}
              <path d="M 15,18 L 22,18" stroke="#ff535b" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 9,24 L 20,24" stroke="#ff535b" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 13,30 L 20,30" stroke="#ff535b" strokeWidth="3.5" strokeLinecap="round" />
              
              {/* Ambulance main frame layout */}
              <path d="M 29,14 L 68,14 C 72,14 76,16 79,20 L 85,27 C 88,30 90,34 90,38 L 90,42 L 82,42 A 6 6 0 0 1 70,42 L 46,42 A 6 6 0 0 1 34,42 L 29,42 C 27,42 26,41 26,39 L 26,17 C 26,15 27,14 29,14 Z" stroke="#ff535b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              
              {/* Mid-cabin vertical frame split */}
              <line x1="52" y1="14" x2="52" y2="42" stroke="#ff535b" strokeWidth="3" strokeLinecap="round" />
              
              {/* Emergency vehicle driver side window */}
              <path d="M 58,18 L 68,18 C 70,18 72,19 74,21 L 80,27 C 82,29 83,31 83,33 L 58,33 Z" stroke="#ff535b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              
              {/* Specialized emergency red cross */}
              <path d="M 33,28 L 45,28" stroke="#ff535b" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 39,22 L 39,34" stroke="#ff535b" strokeWidth="3.5" strokeLinecap="round" />
              
              {/* High traction wheels */}
              <circle cx="40" cy="42" r="5.5" stroke="#ff535b" strokeWidth="3" fill="#090e1c" />
              <circle cx="76" cy="42" r="5.5" stroke="#ff535b" strokeWidth="3" fill="#090e1c" />
              
              {/* Typography matches user's request perfectly */}
              <text x="50" y="76" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="23" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">
                Res<tspan fill="#ff535b">Q</tspan>
              </text>
            </svg>
            <span className="font-display text-xs font-black uppercase tracking-wider text-on-surface-variant/70 border-l border-surface-container-high pl-3 mt-1 hidden sm:inline-block">
              COMMAND_CENTER
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 border-l border-surface-container-high pl-3 text-[10px] font-mono text-on-surface-variant font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-[#4fdbcc] rounded-full animate-ping"></span>
            <span>GRID_SECURE // TEL_NET: VERIFIED</span>
            <span className="text-surface-variant/40">|</span>
            <span>BENGALURU PORT COORD BOUNDS</span>
          </div>
        </div>

        {/* Dynamic ticking clock */}
        <SystemClock />
      </header>

      {/* 2. Main split desktop layout / full view workspace */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden relative">
        
        {/* Left Side: Dynamic Workspace Area */}
        <main className="flex-1 flex flex-col md:flex-row lg:flex-row overflow-hidden relative bg-[#0e1322]">
          
          {/* Main Visual Center (either Map, or specific toggle) */}
          <section className="flex-1 flex flex-col h-full overflow-hidden p-4 gap-4 relative min-h-0">
            
            {/* Split controls row for desktop layout */}
            <div className="flex justify-between items-center bg-[#090e1c] border border-surface-container-highest p-3 rounded-DEFAULT shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-black text-[#ff535b] uppercase tracking-wider">
                  Tactical Grid Panel
                </span>
                <span className="text-zinc-500 font-mono text-[10px]">|</span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {activeTab === 'MAP' ? 'RADAR MESH SHEET' : activeTab === 'FLEET' ? 'VEHICLES ENVELOPE' : 'ACTIVE CHRONOMETRY'}
                </span>
              </div>

              {/* Dynamic View Selector button bar */}
              <div className="flex gap-1.5">
                {[
                  { id: 'MAP', label: 'RADAR MAP' },
                  { id: 'FLEET', label: 'FLEET UNITS' },
                  { id: 'LOGS', label: 'DISPATCH LOGS' },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as ActiveTab)}
                      className={`px-3 py-1 text-[10px] font-mono font-extrabold uppercase transition-all duration-100 cursor-pointer ${
                        isActive
                          ? 'bg-[#ff535b] text-white border-transparent'
                          : 'bg-[#161b2b] text-on-surface-variant/80 hover:text-white border border-surface-container-highest'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Central Render Box */}
            <div className="flex-1 bg-[#090e1c] border border-surface-container-highest rounded-DEFAULT overflow-hidden relative min-h-0">
              
              {activeTab === 'MAP' && (
                <div className="w-full h-full relative">
                  <MapView
                    fleetUnits={fleetUnits}
                    activeIncidents={incidents}
                    onNewIncidentClick={handleNewIncidentClick}
                    onSelectUnit={(unit) => {
                      addLog(`SYS: Radar beacon selected Unit [${unit.id}]. Status: ${unit.status}.`, 'FLEET');
                      setActiveTab('FLEET');
                    }}
                  />

                  {/* Absolute positioning overlay list for fast incident lookups on Map overlay */}
                  <div className="absolute bottom-3 left-3 z-30 flex flex-col gap-1.5 max-w-[280px]">
                    {incidents.filter(i => i.status === 'ACTIVE').slice(0, 2).map((inc) => (
                      <div key={inc.id} className="bg-[#090e1c]/95 border border-[#ff535b]/30 p-2 text-[10px] font-mono leading-tight">
                        <div className="flex justify-between font-bold text-white uppercase">
                          <span>⚠️ ACTIVE {inc.type}</span>
                          <span className="text-[#ff535b]">#{inc.id}</span>
                        </div>
                        <div className="text-zinc-400 mt-1">Routed to {inc.unitId || 'UNKNOWN'}</div>
                        <div className="text-zinc-500 text-[8px] truncate">{inc.location}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'FLEET' && (
                <div className="w-full h-full p-4 overflow-y-auto scrollbar-hide">
                  <FleetView
                    fleetUnits={fleetUnits}
                    onAssignToNewIncident={handleAssignToNewIncident}
                    onModifyStatus={handleModifyStatus}
                  />
                </div>
              )}

              {activeTab === 'LOGS' && (
                <div className="w-full h-full p-4 overflow-y-auto scrollbar-hide">
                  <LogsView
                    incidents={incidents}
                    availableUnits={availableUnits}
                    onSwapUnit={handleSwapUnit}
                    onResolveIncident={handleResolveIncident}
                  />
                </div>
              )}

            </div>
          </section>

          {/* New Dispatch Form: Slide-up panel over the active map area or beside it right inside main workspace */}
          {isDispatching && (
            <div className="w-full md:w-[380px] lg:w-[410px] border-t md:border-t-0 md:border-l border-surface-container-highest bg-[#090e1c] shrink-0 overflow-y-auto p-4 flex flex-col gap-3 relative z-40">
              <NewDispatchForm
                initialCoordinates={dispatchCoords}
                initialWard={dispatchWard}
                preselectedUnitId={preselectedUnitId}
                availableUnits={availableUnits}
                onSubmit={handleDispatchSubmit}
                onCancel={handleCancelDispatch}
              />
            </div>
          )}

        </main>

        {/* Right Side: Operations Log Sidebar (Always Visible on Desktop screens) */}
        <aside className="hidden lg:flex flex-col w-[350px] shrink-0 bg-[#090e1c] border-l border-surface-container-highest p-4 gap-4 overflow-hidden select-none">
          <div className="flex justify-between items-center border-b border-surface-container-highest pb-2 shrink-0">
            <span className="font-display text-xs font-black text-white uppercase tracking-wider block">
              OPERATIONS JOURNAL
            </span>
            <div className="border border-[#4fdbcc]/30 bg-[#4fdbcc]/10 px-2 py-0.5 font-mono text-[8px] text-[#4fdbcc] font-bold">
              SYS STATUS: OPERATIONAL
            </div>
          </div>

          <div className="font-mono text-[9px] text-[#4fdbcc] bg-[#4fdbcc]/5 p-2 border border-[#4fdbcc]/20">
            <span className="font-bold">GRID MAP BOUNDS:</span> [12.8500 N, 77.4500 E] to [13.1200 N, 77.7300 E]. Map renders CartoDB Dark Matter with realtime Leaflet coordinate binding.
          </div>

          {/* System Stream of event logs */}
          <div className="flex-1 overflow-y-auto font-mono text-[10.5px] p-2.5 bg-[#060a16] border border-surface-container-low max-h-full flex flex-col gap-1.5 scrollbar-hide">
            {operationLogs.slice().reverse().map((log, idx) => (
              <div key={idx} className="flex gap-1.5 leading-normal opacity-90 border-b border-[#0e1322]/40 pb-1 flex-col">
                <div className="flex justify-between text-[8.5px] text-on-surface-variant/60 font-semibold mb-0.5">
                  <span>[{log.timestamp}]</span>
                  <span className={`px-1 text-[7px] font-bold ${
                    log.category === 'SYS' ? 'bg-[#161b2b] text-[#4fdbcc]' :
                    log.category === 'OPS' ? 'bg-[#161b2b] text-primary' :
                    log.category === 'FLEET' ? 'bg-[#161b2b] text-tertiary' : 'bg-stone-800 text-zinc-300'
                  }`}>
                    {log.category}
                  </span>
                </div>
                <span className="text-white text-xs font-semibold select-all break-words leading-tight">{log.text}</span>
              </div>
            ))}
          </div>

          {/* Operator Direct Console Input box */}
          <form onSubmit={handleTerminalSubmit} className="shrink-0 flex gap-2 border-t border-surface-container-highest pt-3 font-mono text-[11px]">
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Inject command note..."
              className="flex-1 bg-[#060a16] text-white border border-surface-container-highest px-3 py-2 focus:outline-none focus:border-[#ff535b] font-semibold text-xs rounded-sm placeholder:text-stone-500"
            />
            <button
              type="submit"
              className="bg-[#25293a] border border-surface-container-highest hover:bg-surface-bright px-3 text-white font-extrabold uppercase transition-colors rounded-sm cursor-pointer"
            >
              LOG
            </button>
          </form>
        </aside>

      </div>

      {/* 3. Bottom Mobile/Tablet responsive Navigation footer */}
      <nav className="lg:hidden bg-[#090e1c] border-t border-[#1a1f2f] flex justify-around items-center h-16 shrink-0 relative z-50 select-none">
        {[
          { id: 'MAP', label: 'RADAR MAP', icon: 'satellite_alt' },
          { id: 'FLEET', label: 'FLEET UNITS', icon: 'local_shipping' },
          { id: 'LOGS', label: 'DISPATCH LOGS', icon: 'sms_failed' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center justify-center w-24 py-1.5 transition-all text-center rounded-none cursor-pointer border-t-2 ${
                isActive
                  ? 'border-[#ff535b] text-[#ff535b] bg-[#ff535b]/5 font-black'
                  : 'border-transparent text-on-surface-variant/80 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-display text-[9.5px] uppercase font-extrabold tracking-widest mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
