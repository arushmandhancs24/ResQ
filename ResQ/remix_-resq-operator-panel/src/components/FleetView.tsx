import { useState } from 'react';
import { FleetUnit, UnitStatus } from '../types';

interface FleetViewProps {
  fleetUnits: FleetUnit[];
  onAssignToNewIncident: (unit: FleetUnit) => void;
  onModifyStatus?: (unitId: string, newStatus: UnitStatus) => void;
}

export default function FleetView({
  fleetUnits,
  onAssignToNewIncident,
  onModifyStatus,
}: FleetViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | UnitStatus>('ALL');
  
  // Track expanded state for detailed breakdown cards
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>('KA-01-E-1122'); // default expanded matches mockup

  const statusFilters: ('ALL' | UnitStatus)[] = ['ALL', 'AVAILABLE', 'DISPATCHED', 'RETURNING', 'OFFLINE'];

  // Filter vehicles
  const filteredUnits = fleetUnits.filter((unit) => {
    const matchesSearch = unit.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          unit.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          unit.homeStation.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatusFilter === 'ALL' || unit.status === selectedStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: UnitStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-tertiary/15 border-tertiary-container/30',
          textColor: 'text-tertiary',
          badgeBg: 'bg-tertiary-container text-on-tertiary',
          label: 'AVAILABLE',
          accentBg: 'bg-tertiary-container',
        };
      case 'DISPATCHED':
        return {
          bg: 'bg-primary-container/10 border-primary-container/30 border-primary',
          textColor: 'text-primary',
          badgeBg: 'bg-primary-container text-on-primary-container font-extrabold',
          label: 'DISPATCHED',
          accentBg: 'bg-primary-container',
        };
      case 'RETURNING':
        return {
          bg: 'bg-secondary-container/15 border-secondary-container/30',
          textColor: 'text-secondary-container',
          badgeBg: 'bg-secondary-container text-on-secondary-container',
          label: 'RETURNING',
          accentBg: 'bg-secondary-container',
        };
      case 'OFFLINE':
        return {
          bg: 'bg-zinc-800/25 border-zinc-700/30',
          textColor: 'text-zinc-400',
          badgeBg: 'bg-zinc-800 text-zinc-300',
          label: 'OFFLINE',
          accentBg: 'bg-zinc-600',
        };
    }
  };

  const toggleExpand = (unitId: string) => {
    if (expandedUnitId === unitId) {
      setExpandedUnitId(null);
    } else {
      setExpandedUnitId(unitId);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          id="search-fleet-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-sans text-sm rounded-DEFAULT py-3 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors"
          placeholder="Search Vehicle ID, location, or base station..."
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-[20px]">
          search
        </span>
        {searchTerm && (
          <button 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant hover:text-white"
            onClick={() => setSearchTerm('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Horizontal scroll chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {statusFilters.map((filter) => {
          const isActive = selectedStatusFilter === filter;
          return (
            <button
              key={filter}
              id={`filter-chip-${filter}`}
              className={`flex-shrink-0 px-4 py-1.5 font-mono text-[11px] font-bold uppercase rounded-DEFAULT transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary font-bold shadow-[0_2px_8px_rgba(255,180,172,0.3)]'
                  : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
              onClick={() => setSelectedStatusFilter(filter)}
            >
              {filter === 'ALL' ? 'ALL UNITS' : filter}
            </button>
          );
        })}
      </div>

      <div className="space-y-3.5">
        {filteredUnits.length > 0 ? (
          filteredUnits.slice(0, 50).map((unit) => {
            const isExpanded = expandedUnitId === unit.id;
            const config = getStatusConfig(unit.status);

            return (
              <div
                key={unit.id}
                id={`fleet-card-${unit.id}`}
                className={`relative bg-surface-container rounded-DEFAULT border overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'border-primary' : 'border-outline-variant hover:border-outline'
                }`}
              >
                {/* Visual Status Left Accent Bar */}
                <div className={`w-[4px] h-full absolute left-0 top-0 ${config.accentBg}`} />

                {/* Primary header panel clickable to expand */}
                <div
                  className="p-4 flex justify-between items-start cursor-pointer select-none pl-5"
                  onClick={() => toggleExpand(unit.id)}
                >
                  <div>
                    <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                      {unit.type.replace('_', ' ')} UNIT
                    </div>
                    <h2 className="font-mono text-xl font-bold tracking-tight text-on-surface">
                      {unit.id}
                    </h2>
                    <div className="flex items-center gap-1 mt-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                      <span className="font-sans text-xs font-semibold text-on-surface">
                        {unit.location}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className={`inline-block px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase rounded-DEFAULT mb-2 ${config.badgeBg}`}>
                      {config.label}
                    </span>
                    <div className="font-mono text-[10px] text-on-surface-variant font-semibold mt-0.5">
                      Updated {unit.lastUpdatedMinutesAgo}m ago
                    </div>
                  </div>
                </div>

                {/* Expansion details panel containing GPS and assign triggers */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-3 border-t border-outline-variant bg-surface-container-low/40 animate-fade-in pl-5">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
                      <div>
                        <div className="font-mono text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                          GPS Coordinates
                        </div>
                        <div className="font-mono text-xs font-bold text-on-surface">
                          {unit.coordinates.split(',')[0]}° N, {unit.coordinates.split(',')[1]}° E
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                          Home Station
                        </div>
                        <div className="font-mono text-xs font-bold text-on-surface">
                          {unit.homeStation}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-mono text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                          Daily Operations History
                        </div>
                        <div className="font-sans text-xs text-primary font-bold">
                          {unit.dailyDispatches} Emergency Dispatches today
                        </div>
                      </div>

                      {unit.status !== 'OFFLINE' && onModifyStatus && (
                        <div className="col-span-2 pt-1 border-t border-outline-variant/30 mt-1.5 flex gap-2 items-center">
                          <span className="font-mono text-[9px] text-on-surface-variant font-bold uppercase block">Change Status:</span>
                          <div className="flex gap-1.5">
                            {['AVAILABLE', 'DISPATCHED', 'RETURNING'].map((st) => (
                              <button
                                key={st}
                                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase ${
                                  unit.status === st 
                                    ? 'bg-primary-container text-white' 
                                    : 'bg-surface-container-highest hover:bg-zinc-700 text-on-surface-variant'
                                }`}
                                onClick={() => onModifyStatus(unit.id, st as UnitStatus)}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Peach action button to spawn prefilled dispatch */}
                    {unit.status === 'AVAILABLE' ? (
                      <button
                        id={`fleet-card-dispatch-${unit.id}`}
                        className="w-full bg-primary text-on-primary font-bold tracking-widest text-[11px] font-mono uppercase py-3 rounded-DEFAULT active:scale-95 transition-transform hover:brightness-110"
                        onClick={() => onAssignToNewIncident(unit)}
                      >
                        ASSIGN TO NEW INCIDENT
                      </button>
                    ) : (
                      <div className="text-[10px] font-semibold text-center text-on-surface-variant uppercase py-1 bg-surface-container-high/50 rounded-[2px] border border-outline-variant/30 select-none">
                        Unit is currently locked to active operations
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-surface-container rounded-DEFAULT border border-outline-variant/50">
            <span className="material-symbols-outlined text-[36px] text-outline-variant mb-2">
              local_shipping
            </span>
            <p className="text-sm font-semibold text-on-surface-variant">
              No matching responders found on patrol.
            </p>
            <p className="text-xs text-outline tracking-tight mt-1">
              Verify search tags or status filters.
            </p>
          </div>
        )}

        {filteredUnits.length > 50 && (
          <div className="text-center py-4 bg-surface-container rounded-DEFAULT border border-outline-variant/50">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Showing top 50 results to preserve system performance. Use search to find specific units.
            </span>
          </div>
        )}
      </div>

      {/* Decorative Fleet visual map tracker */}
      <div className="mt-2 rounded-DEFAULT border border-outline-variant overflow-hidden h-36 relative group select-none">
        <img
          alt="Fleet Tactical Map Detail"
          className="w-full h-full object-cover opacity-35 group-hover:opacity-60 transition-opacity duration-500"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_Z8B-JlRndPjshb0EZMMkS66BT9igi-EzCnSqsaVABlikwy_fD5vSnUwwsNyzrjNRinTrImHrlIPbJSpa56Ibs7i5bXQvmehL7RNijAvTrYehcW5EkUz-jn_Oi5INAPPRbFQ_I9Y1HKGdA02hL3nB-9jHCAV534Q--OW5difkM8CjWhklNBiHZwT1YpnwXAUQ4LqKBXl6Lslbt0Buy-13D9P6yR-67yK3mocpZMAQeUO99tsdPHf1irHOl1LqW95hStV7YSKnVB0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">map</span>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface">
            Tactical Fleet Radar View
          </span>
        </div>
      </div>
    </div>
  );
}
