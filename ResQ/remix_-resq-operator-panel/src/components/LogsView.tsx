import { useState, useEffect } from 'react';
import { Incident, FleetUnit } from '../types';
import { EMERGENCY_DETAILS } from '../data';

interface LogsViewProps {
  incidents: Incident[];
  availableUnits: FleetUnit[];
  onSwapUnit: (incidentId: string, newUnitId: string) => void;
  onIntervene?: (incident: Incident) => void;
  onResolveIncident?: (incidentId: string) => void;
}

export default function LogsView({
  incidents,
  availableUnits,
  onSwapUnit,
  onIntervene,
  onResolveIncident,
}: LogsViewProps) {
  // Tracking pull-to-refresh simulating spinning
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ticker, setTicker] = useState(0);

  // Tracking which report modal is expanded
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  
  // Tracking which event is undergoing active intervention (vehicle swap)
  const [interveningIncidentId, setInterveningIncidentId] = useState<string | null>(null);

  // Trigger manual simulated sync logging
  useEffect(() => {
    const handleSync = () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 850);
    };
    
    // Auto sync occasionally simulating remote live updates
    const interval = setInterval(() => {
      handleSync();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Live real-time ticker that decrements active ETAs and count minutes ago
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Pull To Refresh HUD Spinner Element */}
      <div 
        className="flex flex-col items-center justify-center py-2 opacity-60 text-on-surface-variant hover:opacity-100 cursor-pointer active:scale-95 transition-all"
        onClick={handlePullToRefresh}
      >
        <span className={`material-symbols-outlined text-[20px] ${isRefreshing ? 'animate-spin text-primary' : ''}`}>
          sync
        </span>
        <span className="font-mono text-[10px] font-bold uppercase mt-1 tracking-wider text-center">
          {isRefreshing ? 'SYNCHRONIZING WITH BACKEND...' : 'CLICK TO MANUALLY SYNC RECS'}
        </span>
      </div>

      {/* Section Title Header */}
      <section className="mb-2">
        <h1 className="font-sans text-[18px] font-extrabold uppercase tracking-widest border-l-4 border-primary pl-3 text-on-surface">
          Dispatch Logs
        </h1>
      </section>

      {/* Incident logs list */}
      <div className="space-y-4">
        {incidents.slice(-50).reverse().map((inc) => {
          const detail = EMERGENCY_DETAILS[inc.type];
          const isActive = inc.status === 'ACTIVE';
          
          // Compute dynamic ETA counting down
          const elapsedSeconds = Math.max(0, inc.etaInSeconds - ticker);
          
          // Formatted minutes ago calculations
          const mAgo = Math.max(1, Math.round((Date.now() - new Date(inc.createdAt).getTime()) / 60000));
          const timeLabel = mAgo < 60 ? `${mAgo} MINS AGO` : `${Math.floor(mAgo / 60)}H AGO`;

          return (
            <div
              key={inc.id}
              id={`log-card-${inc.id}`}
              className={`bg-surface-container border p-4 relative transition-all duration-300 rounded-DEFAULT ${
                isActive 
                  ? 'border-primary-container pulse-emergency shadow-[0_0_12px_rgba(255,84,76,0.2)]' 
                  : 'border-outline-variant opacity-90'
              }`}
            >
              {/* Vertical Color Ribbon Indicator */}
              <div className={`absolute -left-[1px] top-0 bottom-0 w-1 ${isActive ? 'bg-primary-container' : 'bg-tertiary-container'}`} />

              <div className="flex justify-between items-start mb-3 pl-1.5">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-DEFAULT flex items-center justify-center ${isActive ? 'bg-primary-container text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {detail?.icon || 'medical_services'}
                    </span>
                  </span>
                  <div>
                    <p className="font-mono text-[9px] text-on-surface-variant font-bold">ID #{inc.id}</p>
                    <h2 className="font-sans text-sm font-bold leading-tight uppercase tracking-tight text-white">
                      {inc.type} CASE
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`font-mono text-[9px] font-extrabold px-2 py-0.5 uppercase tracking-wide rounded-[2px] ${
                    isActive ? 'bg-primary-container text-white' : 'bg-tertiary/15 text-tertiary border border-tertiary/20'
                  }`}>
                    {inc.status}
                  </span>
                  <span className="font-mono text-[8px] tracking-tight font-bold text-on-surface-variant/70 mt-1">
                    {timeLabel}
                  </span>
                </div>
              </div>

              {/* Grid detail of Vehicle assigned & ETA */}
              <div className="grid grid-cols-2 gap-2 my-3 bg-surface-container-low p-2.5 border border-outline-variant/60 rounded-DEFAULT">
                <div className="pl-1">
                  <p className="font-mono text-[9px] text-on-surface-variant uppercase font-semibold leading-tight tracking-wider mb-0.5">
                    Unit ID
                  </p>
                  <p className={`font-mono text-xs font-bold ${isActive ? 'text-primary' : 'text-zinc-300'}`}>
                    {inc.unitId || 'UNASSIGNED'}
                  </p>
                </div>
                <div className="text-right pr-1">
                  <p className="font-mono text-[9px] text-on-surface-variant uppercase font-semibold leading-tight tracking-wider mb-0.5">
                    ETA Countdown
                  </p>
                  <p className={`font-mono text-xs font-bold ${isActive ? 'text-primary' : 'text-zinc-500'}`}>
                    {isActive ? (elapsedSeconds > 0 ? `${elapsedSeconds}s` : 'Arrived / Active') : 'Delivered'}
                  </p>
                </div>
              </div>

              {/* Live Location and Ward meta */}
              <div className="flex items-center gap-1 mb-3 bg-surface-container-lowest/60 p-1.5 px-2.5 rounded-sm border border-outline-variant/30 text-xs">
                <span className="material-symbols-outlined text-outline text-[13px]">location_on</span>
                <span className="text-on-surface-variant text-[11px] font-sans font-semibold tracking-wide truncate">
                  {inc.location} ({inc.coordinates})
                </span>
              </div>

              {/* Swaps, alternative routes & dynamic interventions controls */}
              <div className="flex justify-between items-center bg-surface-container/30 pt-2 border-t border-outline-variant/30 select-none">
                <div className="flex items-center gap-1.5 text-on-secondary-container bg-secondary-container/10 px-2 py-0.5 border border-secondary-container/20 text-[10px] font-mono font-bold tracking-wider rounded-sm">
                  <span className="material-symbols-outlined text-[13px] text-secondary-container">alt_route</span>
                  <span>{inc.alternatives} ROUTE ALTS</span>
                </div>

                {isActive ? (
                  <div className="flex gap-1.5">
                    <button 
                      id={`log-intervene-trigger-${inc.id}`}
                      className="bg-primary-container text-white px-3 py-1 font-mono text-[10px] font-bold uppercase transition-transform active:scale-95 cursor-pointer rounded-DEFAULT hover:brightness-110"
                      onClick={() => setInterveningIncidentId(interveningIncidentId === inc.id ? null : inc.id)}
                    >
                      Intervene
                    </button>
                    {onResolveIncident && (
                      <button 
                        id={`log-resolve-trigger-${inc.id}`}
                        className="bg-tertiary-container text-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-transform active:scale-95 cursor-pointer rounded-DEFAULT hover:bg-tertiary-container/80"
                        onClick={() => onResolveIncident(inc.id)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    id={`log-report-trigger-${inc.id}`}
                    className="border border-outline text-on-surface-variant hover:text-white px-3 py-1 font-mono text-[10px] uppercase cursor-pointer rounded-DEFAULT font-semibold"
                    onClick={() => setActiveReportId(activeReportId === inc.id ? null : inc.id)}
                  >
                    {activeReportId === inc.id ? 'Hide Report' : 'View Report'}
                  </button>
                )}
              </div>

              {/* Swapping Dropdown panel for INTERVENTION */}
              {interveningIncidentId === inc.id && (
                <div className="mt-3 bg-surface-container-high border border-primary p-3 rounded-DEFAULT animate-fade-in">
                  <span className="block font-mono text-[9px] text-primary tracking-wider uppercase font-bold mb-2">
                    SELECT INTERVENTION: RE-ROUTE EMERGENCY
                  </span>
                  
                  {availableUnits.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <select
                        id={`log-swap-select-${inc.id}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onSwapUnit(inc.id, e.target.value);
                            setInterveningIncidentId(null);
                          }
                        }}
                        className="w-full bg-surface border border-outline-variant text-[11px] text-on-surface rounded-DEFAULT py-1 px-1.5 focus:outline-none focus:border-primary uppercase font-mono"
                      >
                        <option value="" disabled>-- CHOOSE AMBULANCE REPLACEMENT --</option>
                        {availableUnits.slice(0, 50).map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.id} - {unit.location}
                          </option>
                        ))}
                      </select>
                      <button 
                        className="text-[9px] text-zinc-400 hover:text-white text-right uppercase font-mono tracking-tight"
                        onClick={() => setInterveningIncidentId(null)}
                      >
                        Dismiss Overlay
                      </button>
                    </div>
                  ) : (
                    <p className="text-[9px] text-primary italic">
                      Zero available vehicles currently reporting idle status. Free up units in the fleet card first before hot-swapping ambulance dispatch routes.
                    </p>
                  )}
                </div>
              )}

              {/* Deep-dive Case reports expansion panel */}
              {activeReportId === inc.id && !isActive && (
                <div className="mt-3.5 bg-surface-container-highest/60 border-t border-outline-variant/50 pt-3 text-xs text-on-surface-variant font-sans animate-fade-in">
                  <div className="bg-surface-container-low p-3 border border-outline-variant/30 rounded-DEFAULT">
                    <p className="font-mono text-[9px] text-tertiary uppercase font-bold tracking-widest mb-1.5">
                      PARAMEDIC REPORT & PATIENT PROFILE
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed italic">
                      "{inc.report || 'Patient triaged, stabilized on-site, and safely transported to emergency shock room. Handover notes loaded successfully into clinical hospital logs.'}"
                    </p>
                    <div className="mt-2 text-[9px] font-mono text-zinc-500 flex justify-between">
                      <span>STABILIZATION: SECURE</span>
                      <span>HANDOVER SIGNOFF: VERIFIED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {incidents.length === 0 && (
          <div className="text-center py-12 bg-surface-container rounded-DEFAULT border border-outline-variant/60">
            <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">
              assignment_late
            </span>
            <p className="text-sm font-semibold text-on-surface-variant">
              Operational Logs Empty.
            </p>
            <p className="text-xs text-outline mt-1 tracking-tight">
              Create and dispatch active emergencies to spin logs.
            </p>
          </div>
        )}
      </div>

      {/* Decorative Atmosphere lines */}
      <div className="flex justify-between items-center pt-2 mt-4 text-[9px] font-mono text-zinc-600 border-t border-zinc-900 leading-none">
        <span>ENCRYPTED MOBILE ENVELOPE SHA-256</span>
        <span>LATENCY: 12ms | ONLINE</span>
      </div>
    </div>
  );
}
