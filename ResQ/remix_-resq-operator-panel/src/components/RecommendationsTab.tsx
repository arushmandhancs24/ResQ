import { useState, useEffect } from 'react';

interface Hospital {
  name: string;
  specialty: string;
  capacity: number;
  eta: string;
  tag?: string;
  color: string;
}

interface RecommendationsTabProps {
  hospital: string;
  setHospital: (val: string) => void;
  isArrived: boolean;
  setIsArrived: (val: boolean) => void;
  addLog: (msg: string) => void;
  isConfirmArrival: boolean;
  setIsConfirmArrival: (val: boolean) => void;
  isLiveTripShared: boolean;
  setIsLiveTripShared: (val: boolean) => void;
}

export default function RecommendationsTab({
  hospital,
  setHospital,
  isArrived,
  setIsArrived,
  addLog,
  isConfirmArrival,
  setIsConfirmArrival,
  isLiveTripShared,
  setIsLiveTripShared,
}: RecommendationsTabProps) {
  // Simulator stopwatch state counting up when arrived
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  useEffect(() => {
    if (!isArrived) {
      setStopwatchSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setStopwatchSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isArrived]);

  const formatStopwatch = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rSeconds = secs % 60;
    return `T+${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${rSeconds.toString().padStart(2, '0')}`;
  };

  const hospitals: Hospital[] = [
    {
      name: "St. John's Hospital",
      specialty: "Trauma, Burns & General Shock Care",
      capacity: 85,
      eta: "08m",
      tag: "CLOSEST",
      color: "#ff535b",
    },
    {
      name: "Manipal Hospital",
      specialty: "Cardiac, Pulmonary & Complex Neuro Care",
      capacity: 40,
      eta: "12m",
      color: "#4fdbcc",
    },
    {
      name: "Apollo Hospitals",
      specialty: "Multi-specialty Clinic & Emergency Response",
      capacity: 60,
      eta: "15m",
      color: "#ffb780",
    },
  ];

  const handleSelectHospital = (hospName: string) => {
    setHospital(hospName);
    addLog(`OPERATIONS: Re-allocated incoming tracking index target to clinic [${hospName}].`);
  };

  const handleConfirmContact = () => {
    setIsConfirmArrival(true);
    addLog(`CREW: Lead paramedic J. Reynolds reports patient contact confirmed. Commencing triage operations.`);
    alert('Success: Contact confirmed. Patient status locked to operational dossier.');
  };

  const handleShareLiveTrip = () => {
    setIsLiveTripShared(true);
    addLog(`COMMS: Live-trip map shared with patient primary emergency contacts.`);
    alert('Success: SMS tracking credentials dispatched to family members.');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 overflow-y-auto text-on-surface">
      {/* recommendations Header */}
      <div className="border-l-4 border-secondary pl-3 mb-4 shrink-0">
        <h1 className="font-display text-lg font-black uppercase tracking-tight text-white leading-none">RESOURCES &amp; RE-ROUTING</h1>
        <span className="font-mono text-[9px] text-[#4fdbcc] font-bold uppercase tracking-widest mt-1 inline-block">
          Manage clinical handovers and emergency clinic capacities
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Arrival Terminal OR Live GPS Tracker */}
        <div className="flex flex-col gap-3">
          {isArrived ? (
            /* Ambulance Arrived Panel */
            <div className="bg-surface-container-low border-2 border-[#ff535b] p-4 flex flex-col gap-3 relative animate-pulse-border">
              {/* Flashing Arrival Bar */}
              <div className="bg-[#ff535b]/25 border border-[#ff535b]/50 p-2.5 flex justify-between items-center text-white">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff535b] animate-ping"></span>
                  <span className="font-display text-xs font-bold tracking-wider">AMBULANCE ARRIVED</span>
                </div>
                <div className="font-mono text-[11px] font-bold tabular-nums">
                  {formatStopwatch(stopwatchSeconds)}
                </div>
                <div className="border border-[#ff535b] px-2 py-0.5 text-[8px] bg-[#ff535b]/10 font-mono font-bold tracking-wider uppercase">
                  ON SCENE
                </div>
              </div>

              {/* Paramedic Camera feed window simulation */}
              <div className="relative border border-surface-variant min-h-[160px] overflow-hidden bg-slate-950 flex items-center justify-center select-none">
                {/* Background image preview depicting ambulance open doors or screen */}
                <div className="absolute inset-0 z-0">
                  <img
                    alt="Clinical Camera feed"
                    className="w-full h-full object-cover opacity-50 filter contrast-125 saturate-50"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQvY6_b8bVp_mHeoZAt_oY-9_73Z_14b_S6hRkP5uM-o_Pq8U-T7lY8-W8X9b_2p-P_950S50W214H"
                  />
                  <div className="absolute inset-0 bg-[#090e1c]/45"></div>
                  {/* scanline filter */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjIiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIyIiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsMCwwLDAuMTUpIi8+Cjwvc3ZnPg==')] pointer-events-none"></div>
                </div>

                {/* Overhead scope reticle marker */}
                <div className="absolute inset-4 border border-white/5 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 border border-[#ff535b]/35 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#ff535b]/45 rounded-full"></div>
                  </div>
                </div>

                {/* Camera metadata headers */}
                <div className="absolute top-2 left-3 font-mono text-[8px] text-white/70 flex flex-col pointer-events-none">
                  <span>CAM-EXT-04 // BAY 2</span>
                  <span>1080P // NIGHT SECURE</span>
                </div>
                <div className="absolute top-2 right-3 font-mono text-[8px] text-emerald-400 font-bold pointer-events-none animate-pulse">
                  ● REC FEED LIVE
                </div>
              </div>

              {/* Vehicle Dispatch Detail indicators */}
              <div className="bg-[#090e1c] border border-surface-variant p-3 font-mono text-[10px] flex flex-col gap-1 select-none">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">ASSIGNED UNIT:</span>
                  <span className="text-white font-bold uppercase">[MED-42]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">PERSONNEL:</span>
                  <span className="text-white font-bold uppercase">J. Reynolds (Lead), M. Chen (Support)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">TIMESTAMP LOCK:</span>
                  <span className="text-white">14:32:05 UTC (Scene Ingress Checked)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">INCIDENT REFERENCE:</span>
                  <span className="text-white font-bold text-secondary">#INC-2023-884A</span>
                </div>
              </div>

              {/* Action Buttons inside Arrived scenario mockup */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={handleConfirmContact}
                  className={`py-2 text-[10px] font-mono font-bold uppercase transition-transform cursor-pointer text-center outline-none border ${
                    isConfirmArrival
                      ? 'bg-secondary/15 text-secondary border-secondary/40'
                      : 'bg-secondary text-black hover:bg-[#85ebd3] border-transparent font-black active:translate-y-[1px]'
                  }`}
                >
                  {isConfirmArrival ? 'CONTACT CONFIRMED' : 'CONFIRM CONTACT'}
                </button>
                <button
                  onClick={handleShareLiveTrip}
                  className={`py-2 text-[10px] font-mono font-bold uppercase transition-transform cursor-pointer text-center outline-none border ${
                    isLiveTripShared
                      ? 'bg-surface-variant/40 text-on-surface-variant border-surface-variant'
                      : 'bg-[#25293a] text-white hover:bg-surface-bright border-surface-variant hover:-translate-y-[1px]'
                  }`}
                >
                  {isLiveTripShared ? 'TRIP LINK BROADCASTED' : 'SHARE LIVE TRIP'}
                </button>
              </div>

              {/* Clear event trigger and return simulation back */}
              <button
                onClick={() => {
                  setIsArrived(false);
                  setIsConfirmArrival(false);
                  setIsLiveTripShared(false);
                  addLog(`EMERGENCY TIMELINE: Scene clearance verified. Returning MED-42 unit back to idle standby.`);
                }}
                className="w-full bg-[#161b2b] hover:bg-surface-bright border border-surface-variant text-[9px] font-mono text-on-surface-variant py-1.5 uppercase transition-colors"
              >
                RESET ARRIVAL SIMU (CLEAR SCENE)
              </button>
            </div>
          ) : (
            /* Live GPS Radar Simulation panel if not arrived */
            <div className="bg-surface-container-low border border-surface-variant p-4 flex flex-col gap-3 relative min-h-[360px] select-none justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                  <span className="font-display text-xs font-bold text-white uppercase tracking-wider">
                    Incident Ingress Telemetric
                  </span>
                  <span className="bg-secondary/15 border border-secondary/30 text-[8px] font-mono font-extrabold px-1.5 py-0.5 text-secondary tracking-widest uppercase">
                    ETA 08m Ready
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-normal mt-2.5">
                  The responding unit is currently processing coordinates on standard orbital routing grids. Maintain constant link communication.
                </p>
              </div>

              {/* Compass Radar sweep graphic representation */}
              <div className="h-44 border border-surface-container-high relative overflow-hidden bg-slate-950 flex items-center justify-center">
                {/* Radar Sweep vector */}
                <div className="absolute w-[260px] h-[260px] border border-secondary/15 rounded-full flex items-center justify-center">
                  <div className="absolute w-[180px] h-[180px] border border-secondary/10 rounded-full"></div>
                  <div className="absolute w-[100px] h-[100px] border border-secondary/5 rounded-full"></div>
                  <div className="w-0.5 h-full bg-secondary/5 absolute animate-spin origin-center"></div>
                </div>
                <span className="font-mono text-[7px] text-[#4fdbcc]/60 absolute top-2 left-3">RADAR SCALE: x0.5KM</span>
                <span className="font-mono text-[7px] text-[#4fdbcc]/50 absolute bottom-2 right-3">TEL_LOCK // 34.0522</span>

                {/* Pulsing indicator marker */}
                <div className="absolute top-[40%] left-[60%] flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(79,219,204,1)] animate-pulse"></span>
                  <span className="font-mono text-[7.5px] text-secondary font-bold uppercase mt-1">MED_UNIT_ROUTE</span>
                </div>
              </div>

              {/* Trigger simulation */}
              <button
                onClick={() => {
                  setIsArrived(true);
                  addLog('EMERGENCY: Direct manual command trigger bypassed ETA locks — Ambulance designated Arrived.');
                }}
                className="w-full bg-[#ff535b] hover:bg-[#ff4d5a] text-white text-[11px] font-mono font-bold uppercase py-2.5 shadow-[0_2px_10px_rgba(255,83,91,0.25)] cursor-pointer border border-[#ff535b]/35"
              >
                MANUALLY INJECT "AMBULANCE ARRIVED" SCENARIO
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Hospital Recommendations Selector */}
        <div className="flex flex-col gap-3">
          <div className="bg-surface-container-low border border-surface-variant p-4 flex flex-col gap-3">
            <span className="font-display text-xs font-bold text-white uppercase tracking-wider border-b border-surface-variant pb-2">
              Clinics &amp; hospital recommendations
            </span>
            <p className="text-[11px] text-on-surface-variant leading-tight mb-1">
              Select an option below to update the target emergency clinic on the live tracker. Local EMS capacities are updated in real-time.
            </p>

            <div className="flex flex-col gap-3">
              {hospitals.map((hosp, idx) => {
                const isSelected = hospital === hosp.name;
                return (
                  <div
                    key={idx}
                    className={`border p-3.5 transition-all duration-150 flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-surface border-secondary shadow-[0_0_12px_rgba(79,219,204,0.15)]'
                        : 'bg-[#090e1c] border-surface-variant/75 hover:border-surface-bright'
                    }`}
                  >
                    {/* Selected Left accent indicator */}
                    {isSelected && <div className="absolute -left-[1px] top-0 bottom-0 w-1 bg-secondary" />}

                    {/* Top hospital row */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-display text-sm font-black text-white uppercase">{hosp.name}</h2>
                          {hosp.tag && (
                            <span className="bg-[#ff535b]/10 border border-[#ff535b]/25 px-1 py-[2px] text-[7.5px] font-mono text-[#ff535b] font-extrabold tracking-widest leading-none">
                              {hosp.tag}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9px] text-[#4fdbcc] uppercase mt-1 leading-none">
                          {hosp.specialty}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="font-mono text-sm font-extrabold text-white leading-none">{hosp.eta}</span>
                        <span className="font-mono text-[8px] text-on-surface-variant mt-1">OPERATIONAL ETA</span>
                      </div>
                    </div>

                    {/* Middle Capacity bar row */}
                    <div className="border-t border-surface-variant/40 pt-2 mt-0.5 flex justify-between items-center bg-surface-container-low/30 px-2 py-1">
                      <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
                        <span className="text-on-surface-variant font-medium">CAPACITY LOADING:</span>
                        <span className={`font-extrabold ${hosp.capacity > 75 ? 'text-[#ff535b]' : 'text-[#4fdbcc]'}`}>
                          {hosp.capacity}%
                        </span>
                      </div>
                      <div className="w-24 h-1.5 bg-surface rounded-none overflow-hidden relative border border-surface-variant/40 shrink-0">
                        <div
                          className="h-full"
                          style={{
                            width: `${hosp.capacity}%`,
                            backgroundColor: hosp.capacity > 75 ? '#ff535b' : '#4fdbcc',
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Selector button */}
                    <button
                      onClick={() => handleSelectHospital(hosp.name)}
                      className={`w-full py-1.5 font-mono text-[9.5px] font-bold uppercase transition-all duration-100 select-none cursor-pointer mt-1 ${
                        isSelected
                          ? 'bg-secondary text-black font-extrabold'
                          : 'bg-[#25293a] text-white hover:bg-surface-bright border border-surface-variant'
                      }`}
                    >
                      {isSelected ? '★ TARGET CLINIC LOCKED' : 'SELECT TARGET CLINIC'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
