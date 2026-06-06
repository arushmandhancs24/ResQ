import { useState, useEffect } from 'react';
import { EmergencyType, Incident, FleetUnit } from '../types';
import { EMERGENCY_DETAILS, INITIAL_FLEET_UNITS } from '../data';

interface NewDispatchFormProps {
  initialCoordinates: string;
  initialWard: string;
  preselectedUnitId: string | null;
  availableUnits: FleetUnit[];
  onSubmit: (dispatchData: {
    type: EmergencyType;
    severity: number;
    coordinates: string;
    location: string;
    unitId: string;
  }) => void;
  onCancel: () => void;
}

export default function NewDispatchForm({
  initialCoordinates,
  initialWard,
  preselectedUnitId,
  availableUnits,
  onSubmit,
  onCancel,
}: NewDispatchFormProps) {
  const [selectedType, setSelectedType] = useState<EmergencyType>('CARDIAC');
  const [severity, setSeverity] = useState<number>(4); // Default 04
  const [coordinates, setCoordinates] = useState<string>(initialCoordinates || '12.9716, 77.5946');
  const [ward, setWard] = useState<string>(initialWard || 'Ward 162 - Shivajinagar');
  const [assignedUnitId, setAssignedUnitId] = useState<string>('');

  // Auto-prefill the coordinate and unit when props change
  useEffect(() => {
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
    }
  }, [initialCoordinates]);

  useEffect(() => {
    if (initialWard) {
      setWard(initialWard);
    }
  }, [initialWard]);

  useEffect(() => {
    if (preselectedUnitId) {
      setAssignedUnitId(preselectedUnitId);
    } else if (availableUnits.length > 0 && !assignedUnitId) {
      // Pick first available unit as a fallback automatic prefill
      setAssignedUnitId(availableUnits[0].id);
    }
  }, [preselectedUnitId, availableUnits]);

  // Est response calculation: based on severity and random variance
  const calculatedSeconds = Math.round(300 + (10 - severity) * 32 + (coordinates.charCodeAt(4) % 10) * 15);
  const estMins = Math.floor(calculatedSeconds / 60);
  const estSecs = calculatedSeconds % 60;

  const handleDispatch = () => {
    if (!assignedUnitId && availableUnits.length > 0) {
      alert('Error: Please select or assign a fleet response unit.');
      return;
    }
    onSubmit({
      type: selectedType,
      severity,
      coordinates,
      location: ward,
      unitId: assignedUnitId || (availableUnits.length > 0 ? availableUnits[0].id : 'KA-01-E-1122'),
    });
  };

  return (
    <div className="bg-surface p-4 border border-outline-variant rounded-t-xl md:rounded-xl shadow-2xl relative transition-all duration-300 animate-slide-up">
      {/* Panel Top Indicator Accent */}
      <div className="w-12 h-1 bg-outline-variant/50 rounded-full mx-auto mb-3 md:hidden"></div>

      {/* Header Panel */}
      <div className="flex items-center justify-between py-1 border-l-4 border-primary-container pl-3 mb-4">
        <h2 className="font-sans text-headline-sm font-extrabold uppercase tracking-tight text-on-surface">
          NEW EMERGENCY DISPATCH
        </h2>
        <button 
          id="close-dispatch-form"
          className="text-on-surface-variant hover:text-white transition-colors cursor-pointer"
          onClick={onCancel}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Grid of Emergency Categories */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(Object.keys(EMERGENCY_DETAILS) as EmergencyType[]).map((key) => {
          const detail = EMERGENCY_DETAILS[key];
          const isSelected = selectedType === key;
          
          return (
            <button
              key={key}
              id={`category-${key}`}
              type="button"
              className={`technical-outline p-3 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center group rounded-DEFAULT ${
                isSelected 
                  ? 'bg-surface-container-high border-primary emergency-glow text-primary' 
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
              onClick={() => setSelectedType(key)}
            >
              <span 
                className={`material-symbols-outlined text-[32px] ${isSelected ? 'text-primary' : 'text-on-surface-variant/70'}`}
                style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
              >
                {detail.icon}
              </span>
              <span className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                {detail.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Severity Slider */}
      <div className="bg-surface-container p-3.5 technical-outline mb-4 rounded-DEFAULT">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Severity Level
          </span>
          <span className="font-mono font-bold text-xl text-primary-container">
            {severity.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Customized slider input */}
        <div className="relative flex items-center mb-1">
          <input 
            id="severity-slider"
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary-container"
            style={{
              background: `linear-gradient(to right, #ff544c 0%, #ff544c ${(severity - 1) * 11.1}%, #343535 ${(severity - 1) * 11.1}%)`
            }}
          />
        </div>

        {/* Slider Milestones labels matches mockup */}
        <div className="flex justify-between mt-1 text-[10px] font-mono tracking-wide">
          <span className="text-tertiary uppercase font-bold text-[10px]">Low Priority</span>
          <span className="text-primary-container uppercase font-bold text-[10px]">CRITICAL CORE</span>
        </div>
      </div>

      {/* Coordinates information area */}
      <div className="flex flex-col gap-2 mb-4">
        <div>
          <label className="font-mono text-[10px] uppercase text-on-surface-variant ml-1 font-semibold tracking-wider">
            GPS Coordinates (Live)
          </label>
          <div className="technical-outline bg-surface-container-low p-2.5 flex items-center gap-2 rounded-DEFAULT mt-1">
            <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
            <input 
              id="coordinates-input"
              type="text" 
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-mono text-sm w-full text-on-surface focus:outline-none"
              placeholder="e.g. 12.9716, 77.5946"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 ml-1">
          <span className="material-symbols-outlined text-[13px] text-on-surface-variant">domain</span>
          <input 
            id="ward-input"
            type="text"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            className="bg-transparent border-none py-0 px-0 text-xs font-sans text-on-surface font-semibold focus:ring-0 focus:outline-none w-full"
            placeholder="e.g. Ward 162 - Shivajinagar"
          />
        </div>
      </div>

      {/* Fleet vehicle automatic assignments selector */}
      <div className="bg-surface-container-low p-3 border border-outline-variant/60 rounded-DEFAULT mb-4">
        <label className="font-mono text-[9px] uppercase text-primary tracking-widest font-bold block mb-1">
          ASSESSMENT: UNIT DISPATCH SELECTION
        </label>
        
        {availableUnits.length > 0 ? (
          <select
            id="unit-assign-dropdown"
            value={assignedUnitId}
            onChange={(e) => setAssignedUnitId(e.target.value)}
            className="w-full bg-surface border border-outline-variant text-on-surface rounded-DEFAULT py-1.5 px-2 text-xs font-sans mt-1.5 focus:border-primary focus:outline-none"
          >
            {availableUnits.slice(0, 50).map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.id} ({unit.type ? unit.type.replace('_', ' ') : 'UNIT'}) - {unit.location} (ETA Ready)
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[10px] text-primary mt-1 font-medium bg-primary/10 p-1 px-2 border border-primary/20 rounded-DEFAULT">
            ⚠️ Fleet alert: Zero local available units remaining! Returning or nearest units will be force assigned.
          </p>
        )}
      </div>

      {/* Est response mock visual image map */}
      <div className="relative w-full h-28 technical-outline overflow-hidden rounded-DEFAULT mb-4">
        {/* Hotlinked styled dark-aesthetic satellite grid map representing Bengaluru */}
        <img 
          alt="Shivajinagar Map Grid"
          className="w-full h-full object-cover grayscale opacity-30 contrast-125"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_Z8B-JlRndPjshb0EZMMkS66BT9igi-EzCnSqsaVABlikwy_fD5vSnUwwsNyzrjNRinTrImHrlIPbJSpa56Ibs7i5bXQvmehL7RNijAvTrYehcW5EkUz-jn_Oi5INAPPRbFQ_I9Y1HKGdA02hL3nB-9jHCAV534Q--OW5difkM8CjWhklNBiHZwT1YpnwXAUQ4LqKBXl6Lslbt0Buy-13D9P6yR-67yK3mocpZMAQeUO99tsdPHf1irHOl1LqW95hStV7YSKnVB0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        
        {/* Real-time calculated ETA readout Overlay */}
        <div className="absolute bottom-2 left-3 flex flex-col pointer-events-none">
          <span className="font-sans text-[10px] text-secondary-container uppercase tracking-wider font-extrabold">
            Est. Response Time
          </span>
          <span className="font-mono text-3xl text-secondary-container leading-none font-bold">
            {estMins}m {estSecs}s
          </span>
        </div>
      </div>

      {/* Big Dispatch Action Button with glowing state change */}
      <button 
        id="dispatch-button-trigger"
        className="w-full bg-primary-container text-white py-3 font-sans text-lg font-bold uppercase tracking-wider active:scale-95 duration-100 cursor-pointer rounded-DEFAULT text-center shadow-[0_4px_16px_rgba(255,84,76,0.35)] hover:bg-primary-container/90 transition-all font-sans"
        onClick={handleDispatch}
      >
        DISPATCH NOW
      </button>
    </div>
  );
}
