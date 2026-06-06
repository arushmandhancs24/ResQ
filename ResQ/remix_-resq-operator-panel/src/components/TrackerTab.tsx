import { useState, useEffect } from 'react';

interface TrackerTabProps {
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  setSeverity: (val: 'LOW' | 'MEDIUM' | 'CRITICAL') => void;
  incidentType: 'CARDIAC' | 'TRAUMA' | 'RESPIRATORY' | 'OTHER';
  setIncidentType: (val: 'CARDIAC' | 'TRAUMA' | 'RESPIRATORY' | 'OTHER') => void;
  hospital: string;
  countdownSeconds: number;
  setCountdownSeconds: (num: number) => void;
  isTimerRunning: boolean;
  setIsTimerRunning: (val: boolean) => void;
  isDispatched: boolean;
  setIsDispatched: (val: boolean) => void;
  isArrived: boolean;
  setIsArrived: (val: boolean) => void;
  addLog: (msg: string) => void;
  contacts: Array<{ name: string; role: string; phone: string; type: string; enabled: boolean }>;
}

export default function TrackerTab({
  severity,
  setSeverity,
  incidentType,
  setIncidentType,
  hospital,
  countdownSeconds,
  setCountdownSeconds,
  isTimerRunning,
  setIsTimerRunning,
  isDispatched,
  setIsDispatched,
  isArrived,
  setIsArrived,
  addLog,
  contacts,
}: TrackerTabProps) {
  // Local ETA simulation ticking down
  const [etaSeconds, setEtaSeconds] = useState(270); // 04:30 in seconds

  useEffect(() => {
    if (etaSeconds <= 0) return;
    const interval = setInterval(() => {
      setEtaSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [etaSeconds]);

  // Format countdown string
  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleUpdateDispatch = () => {
    addLog(`OPERATIONS: Reconfigured incident details. Severity [${severity}], Category [${incidentType}] on active channel.`);
    alert(`Success: Dispatch & Contacts updated successfully.\nPayload is fully synched with active responders.`);
  };

  const handleCancelCountdown = () => {
    setIsTimerRunning(false);
    addLog(`OPERATIONS: Automated SMS broadcast countdown suppressed by manual command override.`);
  };

  const activeContacts = contacts.filter(c => c.enabled);

  return (
    <div className="flex-1 flex flex-col w-full h-full text-on-surface">
      {/* Auto-Notify Countdown Timer Bar */}
      {isTimerRunning && countdownSeconds > 0 ? (
        <div id="countdown-timer-banner" className="bg-[#2a0a0a] border-b border-[#e63946]/30 px-4 py-2 flex items-center shrink-0 z-40 justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[#e63946] text-[18px] animate-pulse">timer</span>
            <span className="font-display text-[10px] uppercase font-bold text-[#e63946] tracking-[0.1em]">ALERTS BROADCASTING IN:</span>
            <div className="flex items-baseline gap-1 bg-[#e63946]/10 px-2 py-0.5 border border-[#e63946]/20">
              <span className="font-mono text-lg font-bold text-[#e63946] leading-none tabular-nums">
                00:{countdownSeconds.toString().padStart(2, '0')}
              </span>
              <span className="font-mono text-[9px] text-[#e63946]/70 uppercase">sec</span>
            </div>
          </div>
          <button
            onClick={handleCancelCountdown}
            className="flex items-center gap-1 bg-[#e63946] hover:bg-[#ff4d5a] text-white px-2.5 py-1 text-[10px] transition-colors border border-white/10 font-mono font-bold uppercase cursor-pointer"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            <span>CANCEL</span>
          </button>
        </div>
      ) : (
        <div id="countdown-timer-banner-inactive" className="bg-surface-container-low border-b border-outline-variant/30 px-4 py-2 flex items-center shrink-0 justify-between text-xs text-on-surface-variant font-mono">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span>ALERTS STATE: STABILIZED (NO UNRESOLVED BROADCASTS PENDING)</span>
          </div>
          <button
            onClick={() => {
              setCountdownSeconds(30);
              setIsTimerRunning(true);
              addLog(`DIAGNOSTIC: Re-initiated emergency broadcast timers at 30 seconds.`);
            }}
            className="text-[9px] text-[#4fdbcc] hover:underline font-bold uppercase cursor-pointer"
          >
            RESET BROADCAST
          </button>
        </div>
      )}

      {/* Urgent Status Bar */}
      <div className="bg-primary-container text-on-primary-container px-4 py-3 flex items-center justify-between shrink-0 border-b-2 border-surface-variant shadow-md select-none z-30">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 text-on-primary-container/80">
            <span className="material-symbols-outlined text-[16px] animate-pulse">crisis_alert</span>
            <span className="font-mono text-[10px] font-bold tracking-wider">INCIDENT: #99-AX2</span>
          </div>
          <div className="font-display text-2xl font-black uppercase tracking-tight">
            AMBULANCE EN ROUTE
          </div>
        </div>
        <div className="flex flex-col items-end border border-on-primary-container/20 px-3 py-1 bg-on-primary-container/5 font-mono">
          <span className="text-[9px] text-on-primary-container/75 font-semibold">PRIORITY LEVEL</span>
          <span className="text-lg font-bold">CRITICAL-1</span>
        </div>
      </div>

      {/* Main Map Panel with overlays */}
      <div className="flex-1 relative min-h-[300px] bg-surface-container-lowest overflow-hidden flex flex-col">
        {/* Map Background Layer */}
        <div className="absolute inset-0 z-0 select-none">
          <img
            alt="Tactical Map"
            className="w-full h-full object-cover opacity-60 filter contrast-125 saturate-50"
            src="https://lh3.googleusercontent.com/aida/ADBb0ujRHYrRxiHQrI-TxLrtH3T6SsYDnTdjKtuuL_BZgr5lvzYd-qYqiNZrskEMrTrBoGh61D0TWpo_pGeaxML2qU9SiJ_o9f-4bqIcs6hTOMXkDpHpL8aQqgWY59D3oi1aXYNStXWvAp-Us9ESKN686HesFWwM1TTIKyYUUYdwYVSufvALucR1SA_vDTjaTl1ubqQ8iDZ5pRSb_N4egSUyuk2iz1cCTnw5L6M5f7SYgfkp2wbh9hbvQ5Z_NqoG"
          />
          {/* Scanline overlay Texture */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] pointer-events-none opacity-40"></div>
        </div>

        {/* HUD Overlay Interface Elements */}
        <div className="relative z-10 w-full h-full flex flex-col p-4 gap-3 overflow-y-auto">
          
          {/* Top Overlay: Assigned Unit Card */}
          <div className="self-end bg-surface/90 border border-secondary p-3 flex flex-col gap-2 backdrop-blur-sm min-w-[240px] pointer-events-auto shadow-lg select-none">
            <div className="flex justify-between items-center border-b border-surface-variant pb-1.5">
              <span className="font-display text-[9px] font-bold text-secondary uppercase tracking-widest">ASSIGNED UNIT</span>
              <div className="border border-secondary px-2 py-0.5 font-mono text-[10px] text-secondary bg-secondary/10 font-bold">
                [AMB-702]
              </div>
            </div>
            <div className="flex justify-between items-end pt-1">
              <div className="flex flex-col">
                <span className="font-display text-[8px] text-on-surface-variant font-bold">ETA COUNTDOWN</span>
                <span className="font-mono text-2xl font-extrabold text-on-surface leading-none mt-1">
                  {formatCountdown(etaSeconds)}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-display text-[8px] text-on-surface-variant font-bold">OPERATOR</span>
                <span className="font-mono text-[10px] text-on-surface uppercase font-bold">J. KOWALSKI</span>
              </div>
            </div>
          </div>

          {/* Map Vector Indicators Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full h-full max-h-[300px]">
            {/* Target Victim coordinates */}
            <div className="absolute top-[48%] left-[55%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none">
              <div className="relative flex justify-center items-center">
                <div className="absolute w-12 h-12 border-2 border-secondary rounded-full animate-ping opacity-60"></div>
                <div className="absolute w-8 h-8 border border-secondary/40 rounded-full"></div>
                <div className="w-3.5 h-3.5 bg-secondary rounded-full shadow-[0_0_10px_rgba(79,219,204,0.8)]"></div>
              </div>
              <div className="mt-1 bg-surface border border-secondary px-2 py-0.5 font-mono text-[9px] text-[#4fdbcc] font-bold">TARGET_LOC</div>
            </div>

            {/* Ambulance Approaching */}
            <div className="absolute top-[35%] left-[28%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none">
              <div className="relative flex justify-center items-center">
                <div className="w-8 h-8 bg-primary-container border-2 border-surface flex items-center justify-center rotate-45 shadow-[0_0_15px_rgba(255,83,91,0.5)]">
                  <span className="material-symbols-outlined text-white text-[16px] -rotate-45" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                </div>
                {/* SVG path connector */}
                <svg className="absolute top-2 left-6 w-32 h-16 pointer-events-none overflow-visible">
                  <path
                    className="opacity-70"
                    d="M0,0 L85,32"
                    fill="none"
                    stroke="#ff535b"
                    strokeDasharray="4,4"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
              <div className="mt-3 bg-primary-container text-white px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase border border-surface">
                AMB-702
              </div>
            </div>
          </div>

          {/* Quick simulator force arrive toggle block */}
          <div className="mt-auto self-end z-20 pointer-events-auto">
            <button
              onClick={() => {
                setIsArrived(true);
                addLog(`EMERGENCY TELEMETRY: Ambulance [AMB-702] has reported arrival on scene.`);
              }}
              className="bg-[#090e1c]/90 border border-primary-container/40 hover:border-primary-container text-primary-container px-3 py-1.5 text-[10px] font-mono font-bold uppercase cursor-pointer"
            >
              ⚡ FORWARD TIME: ARRIVE ON SCENE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
            {/* Incident Details Selection Card */}
            <div className="bg-surface/95 border border-surface-variant flex shadow-lg backdrop-blur-sm pointer-events-auto">
              <div className="w-[4px] bg-tertiary shrink-0"></div>
              <div className="p-4 flex flex-col gap-3 w-full">
                <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                  <span className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">Configure Incident Details</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">edit_note</span>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-display text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">SEVERITY</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['LOW', 'MEDIUM', 'CRITICAL'] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setSeverity(sev)}
                          className={`py-1 px-2 font-mono text-[10px] font-bold uppercase transition-colors rounded-none cursor-pointer border ${
                            severity === sev
                              ? 'bg-[#ff535b]/10 text-[#ff535b] border-[#ff535b]'
                              : 'bg-surface-variant/30 text-on-surface-variant border-transparent hover:border-surface-variant'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-display text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">TYPE</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['CARDIAC', 'TRAUMA', 'RESPIRATORY', 'OTHER'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setIncidentType(t)}
                          className={`py-1 px-2 font-mono text-[10px] font-bold uppercase transition-colors rounded-none cursor-pointer border ${
                            incidentType === t
                              ? 'bg-[#ffb780]/15 text-[#ffb780] border-[#ffb780]'
                              : 'bg-surface-variant/30 text-on-surface-variant border-transparent hover:border-surface-variant'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleUpdateDispatch}
                  className="w-full bg-surface-container-high hover:bg-[#ffb780]/10 hover:text-[#ffb780] hover:border-[#ffb780] border border-surface-variant text-on-surface transition-all duration-150 py-2 font-mono text-[10px] font-bold flex justify-center items-center gap-1.5 uppercase mt-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">sync</span>
                  <span>UPDATE DISPATCH &amp; CONTACTS</span>
                </button>
              </div>
            </div>

            {/* Bottom Overlay: Automated Alerts Status Card */}
            <div className="bg-surface/95 border border-surface-variant flex shadow-lg backdrop-blur-sm pointer-events-auto">
              <div className="w-[4px] bg-secondary shrink-0"></div>
              <div className="p-4 flex flex-col gap-2 w-full">
                <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-sm font-bold text-secondary uppercase tracking-wider">Automated Alerts</span>
                    <span className="material-symbols-outlined text-secondary animate-pulse text-[18px]">check_circle</span>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-tight mb-1">
                  Alert broadcasters have locked contacts and published active routing data.
                </p>
                
                {/* Shared Details Checklist */}
                <div className="flex flex-col gap-1.5 bg-surface-container-high p-2 border border-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[14px]">location_on</span>
                    <span className="font-mono text-[9px] text-on-surface uppercase font-bold">Location: Ward 162 (34.0522, -118.2437)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[14px]">airport_shuttle</span>
                    <span className="font-mono text-[9px] text-on-surface uppercase font-bold">MAPPED: LIVE AMBULANCE ETA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[14px]">local_hospital</span>
                    <span className="font-mono text-[9px] text-on-surface uppercase font-bold">ROUTING: {hospital}</span>
                  </div>
                </div>

                {/* Technical List: Notifications */}
                <div className="flex flex-col gap-1 mt-1 font-mono text-[9px]">
                  {activeContacts.length > 0 ? (
                    activeContacts.map((contact, i) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-surface-variant/40">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-secondary text-[14px]">done_all</span>
                          <span className="text-on-surface uppercase font-bold">
                            {contact.role} ({contact.name.split(' ')[0][0]}. {contact.name.split(' ').pop()})
                          </span>
                        </div>
                        <div className="border border-secondary px-1 py-[1px] text-[8px] text-secondary bg-secondary/10 font-bold">
                          DELIVERED
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-on-surface-variant italic">
                      Zero automated notification active (All contacts muted)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
