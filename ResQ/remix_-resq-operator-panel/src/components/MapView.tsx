import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { FleetUnit, Incident, EmergencyType, DispatchCenter, RiskZone, MeshLink } from '../types';
import { BENGALURU_STATIONS } from '../data';
import { fetchMapIntegrationsData, BENGALURU_BOUNDS } from '../utils/geoUtils';

interface MapViewProps {
  fleetUnits: FleetUnit[];
  activeIncidents: Incident[];
  onNewIncidentClick: (coords: string, wardName: string) => void;
  onSelectUnit?: (unit: FleetUnit) => void;
}

export default function MapView({
  fleetUnits,
  activeIncidents,
  onNewIncidentClick,
  onSelectUnit,
}: MapViewProps) {
  // Map container and map instance references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Toggles and configuration deck
  const [showMesh, setShowMesh] = useState(true);
  const [showRiskGrid, setShowRiskGrid] = useState(true);
  const [showDispatchCenters, setShowDispatchCenters] = useState(true);
  const [dispatchCenterCount, setDispatchCenterCount] = useState(180);

  // Integration states
  const [dispatchCenters, setDispatchCenters] = useState<DispatchCenter[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [meshLinks, setMeshLinks] = useState<MeshLink[]>([]);
  const [isRealBackend, setIsRealBackend] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tactical popup HUD overlays
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number; lat: string; lng: string; ward: string } | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<DispatchCenter | null>(null);

  // Refs for tracking map layers dynamically
  const riskGridLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const meshLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const dispatchCentersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseStationsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const fleetLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const isMockMode = new URLSearchParams(window.location.search).get('mock') === 'true';
  const [animatedCoords, setAnimatedCoords] = useState<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
    if (!isMockMode) return;
    
    const interval = setInterval(() => {
      setAnimatedCoords(prev => {
        const next = { ...prev };
        fleetUnits.forEach(unit => {
          if (unit.status === 'DISPATCHED' || unit.status === 'EN_ROUTE_HOSPITAL') {
            const current = next[unit.id] || (() => {
              const [lat, lng] = unit.coordinates.split(',').map(Number);
              return { lat: lat || 12.9716, lng: lng || 77.5946 };
            })();
            
            const targetInc = activeIncidents.find(i => i.status === 'ACTIVE' && i.unitId === unit.id);
            if (targetInc) {
              const [tLat, tLng] = targetInc.coordinates.split(',').map(Number);
              const dLat = (tLat || 12.9716) - current.lat;
              const dLng = (tLng || 77.5946) - current.lng;
              
              if (Math.abs(dLat) > 0.0001 || Math.abs(dLng) > 0.0001) {
                next[unit.id] = {
                  lat: current.lat + dLat * 0.05,
                  lng: current.lng + dLng * 0.05
                };
              }
            }
          }
        });
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isMockMode, fleetUnits, activeIncidents]);

  // Fetch data from real backend or calculate risk parity simulation
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMapIntegrationsData(dispatchCenterCount, import.meta.env.VITE_API_URL || 'http://localhost:8000')
      .then((res) => {
        if (!active) return;
        setDispatchCenters(res.dispatchCenters);
        setRiskZones(res.riskZones);
        setMeshLinks(res.meshLinks);
        setIsRealBackend(res.isRealBackend);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Integrations loading failed: ', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dispatchCenterCount]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map Instance centered in Bengaluru Core
    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 11.5,
      zoomControl: false, // Custom placement later or keep it sleek
      attributionControl: false
    });

    mapRef.current = map;

    // Add CartoDB Dark Matter tile layer for an incredibly premium tactical sci-fi aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Initialize individual layer groups
    riskGridLayerGroupRef.current = L.layerGroup().addTo(map);
    meshLayerGroupRef.current = L.layerGroup().addTo(map);
    dispatchCentersLayerGroupRef.current = L.layerGroup().addTo(map);
    baseStationsLayerGroupRef.current = L.layerGroup().addTo(map);
    fleetLayerGroupRef.current = L.layerGroup().addTo(map);
    incidentsLayerGroupRef.current = L.layerGroup().addTo(map);

    // Click handler to draw the popup/interactive HUD to dispatch
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const point = map.latLngToContainerPoint(e.latlng);

      // Approximate standard municipal ward borders based on coordinates
      let ward = 'Bengaluru Metro Core';
      if (lat > 12.98 && lng < 77.58) ward = 'Ward 112 - Malleshwaram / Rajajinagar';
      else if (lat > 12.98 && lng >= 77.58) ward = 'Ward 80 - Indiranagar Area';
      else if (lat <= 12.98 && lng < 77.58) ward = 'Ward 141 - Jayanagar / Banashankari';
      else if (lat <= 12.98 && lng >= 77.58) ward = 'Ward 151 - Koramangala / HSR Layout';

      setHoveredCoords({
        x: point.x,
        y: point.y,
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        ward
      });
      setSelectedCenter(null);
    });

    // Reset modals on dragging or interactive repositioning
    map.on('drag', () => {
      setHoveredCoords(null);
    });

    // Cleanup Leaflet Map when component unmounts
    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map container invalidation whenever tabs switch or size resets
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, []);

  // Sync Risk Zones (Parity Grids) Map Layer
  useEffect(() => {
    const layerGroup = riskGridLayerGroupRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    if (showRiskGrid && riskZones.length > 0) {
      riskZones.forEach((zone) => {
        const color =
          zone.riskLevel === 'HIGH' ? '#dc2626' :
          zone.riskLevel === 'MEDIUM' ? '#ea580c' : '#10b981';

        const styleOptions: L.PolylineOptions = {
          color: '#2a2c2c',
          weight: 1,
          opacity: 0.25,
          fillColor: color,
          fillOpacity: 0.055,
        };

        if (zone.boundary && zone.boundary.length > 0) {
          // Render irregular polygon from backend representation
          const latLngs = zone.boundary.map((pt) => [pt.lat, pt.lng] as L.LatLngExpression);
          L.polygon(latLngs, styleOptions).addTo(layerGroup);
        } else if (zone.bounds) {
          // Render standard rectangular grid cell fallback
          const bounds: L.LatLngBoundsExpression = [
            [zone.bounds.south, zone.bounds.west],
            [zone.bounds.north, zone.bounds.east],
          ];
          L.rectangle(bounds, styleOptions).addTo(layerGroup);
        }
      });
    }
  }, [riskZones, showRiskGrid]);

  // Sync Tactical Mesh Polylines Map Layer
  useEffect(() => {
    const layerGroup = meshLayerGroupRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    if (showMesh && meshLinks.length > 0) {
      meshLinks.forEach((link) => {
        L.polyline(
          [
            [link.from.lat, link.from.lng],
            [link.to.lat, link.to.lng],
          ],
          {
            color: '#0284c7',
            weight: 1.1,
            opacity: 0.22,
          }
        ).addTo(layerGroup);
      });
    }
  }, [meshLinks, showMesh]);

  // Sync Parity Dispatch Centers Map Layer
  useEffect(() => {
    const layerGroup = dispatchCentersLayerGroupRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    if (showDispatchCenters && dispatchCenters.length > 0) {
      dispatchCenters.forEach((dc) => {
        const color =
          dc.riskLevel === 'HIGH' ? '#EF4444' :
          dc.riskLevel === 'MEDIUM' ? '#F59E0B' : '#10B981';

        // DivIcon lets us inject gorgeous high-performance custom HTML elements inside Leaflet
        const icon = L.divIcon({
          html: `
            <div class="flex items-center justify-center cursor-pointer pointer-events-auto" style="width: 10px; height: 10px;">
              <div class="rounded-full shadow-lg border border-stone-900 transition-transform active:scale-110"
                   style="background-color: ${color}; width: 7px; height: 7px; opacity: 0.8;">
              </div>
            </div>
          `,
          className: 'custom-leaflet-dc-node',
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });

        const marker = L.marker([dc.coordinates.lat, dc.coordinates.lng], { icon })
          .addTo(layerGroup);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setHoveredCoords(null);
          setSelectedCenter(dc);
        });
      });
    }
  }, [dispatchCenters, showDispatchCenters]);

  // Sync Station Cores (Alpha & Bravo Stations)
  useEffect(() => {
    const layerGroup = baseStationsLayerGroupRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    BENGALURU_STATIONS.forEach((station) => {
      const lat = station.id === 'ALPHA' ? 12.9816 : 12.9416;
      const lng = station.id === 'ALPHA' ? 77.6146 : 77.5646;

      const icon = L.divIcon({
        html: `
          <div class="flex flex-col items-center cursor-pointer select-none" style="width: 80px; height: 35px;">
            <div class="w-3.5 h-3.5 rounded-full bg-stone-950 border-2 border-[#ff544c] flex items-center justify-center shadow">
              <div class="w-1.5 h-1.5 bg-[#ff544c] rounded-full animate-ping"></div>
            </div>
            <span class="bg-stone-900/95 border border-stone-800 text-[7.5px] font-mono font-bold text-stone-200 mt-1 px-1 py-0.2 rounded shadow tracking-tight uppercase whitespace-nowrap">
              ${station.name}
            </span>
          </div>
        `,
        className: 'custom-leaflet-station',
        iconSize: [80, 35],
        iconAnchor: [40, 7]
      });

      L.marker([lat, lng], { icon }).addTo(layerGroup);
    });
  }, []);

  const fleetMarkersRef = useRef<Record<string, L.Marker>>({});

  // Sync Emergency Fleet Vehicles
  useEffect(() => {
    const layerGroup = fleetLayerGroupRef.current;
    if (!layerGroup) return;

    // To prevent severe DOM lag with thousands of units, limit map to active + 100 idle units
    const activeUnits = fleetUnits.filter(u => u.status !== 'AVAILABLE' && u.status !== 'OFFLINE');
    const availableUnits = fleetUnits.filter(u => u.status === 'AVAILABLE');
    const renderLimitUnits = [...activeUnits, ...availableUnits.slice(0, 100)];
    const renderUnitIds = new Set(renderLimitUnits.map(u => u.id));

    // Remove markers that are no longer in renderLimitUnits or went offline
    Object.keys(fleetMarkersRef.current).forEach((id) => {
      if (!renderUnitIds.has(id)) {
        layerGroup.removeLayer(fleetMarkersRef.current[id]);
        delete fleetMarkersRef.current[id];
      }
    });

    renderLimitUnits.forEach((unit) => {
      if (unit.status === 'OFFLINE') return;
      let lat, lng;
      if (isMockMode && animatedCoords[unit.id]) {
        lat = animatedCoords[unit.id].lat;
        lng = animatedCoords[unit.id].lng;
      } else {
        const parts = unit.coordinates.split(',').map(Number);
        lat = parts[0] || 12.9716;
        lng = parts[1] || 77.5946;
      }

      const existingMarker = fleetMarkersRef.current[unit.id];

      if (existingMarker) {
        existingMarker.setLatLng([lat, lng]);
        
        // Update the visual status (color) by recreating the divIcon HTML
        const statusColor =
          unit.status === 'AVAILABLE' ? '#10B981' :
          unit.status === 'DISPATCHED' ? '#EF4444' : '#F59E0B';

        const borderClass =
          unit.status === 'AVAILABLE' ? 'border-emerald-500' :
          unit.status === 'DISPATCHED' ? 'border-rose-500' : 'border-amber-500';

        const glowPing =
          unit.status === 'AVAILABLE'
            ? '<div class="absolute inset-1 rounded bg-emerald-500/20 animate-ping pointer-events-none"></div>'
            : '';

        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: 32px; height: 32px;">
              ${glowPing}
              <div class="w-6.5 h-6.5 bg-stone-900 border ${borderClass} rounded flex items-center justify-center font-mono font-extrabold text-[9px] shadow-lg text-white">
                A
              </div>
              <div class="absolute -top-3.5 bg-[#121313] border border-stone-800 rounded-[1px] text-[6px] font-mono text-center text-stone-300 px-1 whitespace-nowrap">
                ${unit.id.split('-').pop()}
              </div>
              <div class="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-stone-950" style="background-color: ${statusColor};"></div>
            </div>
          `,
          className: 'custom-leaflet-fleet',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        existingMarker.setIcon(icon);
      } else {
        const statusColor =
          unit.status === 'AVAILABLE' ? '#10B981' :
          unit.status === 'DISPATCHED' ? '#EF4444' : '#F59E0B';

        const borderClass =
          unit.status === 'AVAILABLE' ? 'border-emerald-500' :
          unit.status === 'DISPATCHED' ? 'border-rose-500' : 'border-amber-500';

        const glowPing =
          unit.status === 'AVAILABLE'
            ? '<div class="absolute inset-1 rounded bg-emerald-500/20 animate-ping pointer-events-none"></div>'
            : '';

        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: 32px; height: 32px;">
              ${glowPing}
              <div class="w-6.5 h-6.5 bg-stone-900 border ${borderClass} rounded flex items-center justify-center font-mono font-extrabold text-[9px] shadow-lg text-white">
                A
              </div>
              <div class="absolute -top-3.5 bg-[#121313] border border-stone-800 rounded-[1px] text-[6px] font-mono text-center text-stone-300 px-1 whitespace-nowrap">
                ${unit.id.split('-').pop()}
              </div>
              <div class="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-stone-950" style="background-color: ${statusColor};"></div>
            </div>
          `,
          className: 'custom-leaflet-fleet',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectUnit?.(unit);
        });
        fleetMarkersRef.current[unit.id] = marker;
      }
    });
  }, [fleetUnits, onSelectUnit, animatedCoords, isMockMode]);

  // Sync Active Incident Badges
  useEffect(() => {
    const layerGroup = incidentsLayerGroupRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    activeIncidents.forEach((inc) => {
      if (inc.status !== 'ACTIVE') return;
      const parts = inc.coordinates.split(',').map(Number);
      const lat = parts[0] || 12.9716;
      const lng = parts[1] || 77.5946;

      const icon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center cursor-pointer" style="width: 40px; height: 40px;">
            <div class="absolute inset-0 rounded-full bg-rose-500/20 animate-pulse pointer-events-none"></div>
            <div class="absolute inset-1 rounded-full bg-rose-500/15 animate-ping pointer-events-none"></div>
            <div class="w-7.5 h-7.5 rounded-full bg-[#E53935] border border-white flex items-center justify-center shadow-lg">
              <span class="material-symbols-outlined text-[14px] text-white" style="font-size: 14px;">emergency</span>
            </div>
            <div class="absolute -top-4.5 bg-red-950 border border-red-500 text-white font-mono text-[7px] font-extrabold px-1 tracking-wide rounded whitespace-nowrap">
              ID ${inc.id}
            </div>
          </div>
        `,
        className: 'custom-leaflet-incident',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      L.marker([lat, lng], { icon }).addTo(layerGroup);
    });
  }, [activeIncidents]);

  return (
    <div className="relative w-full h-[530px] bg-stone-950 border border-outline-variant overflow-hidden group flex flex-col">
      
      {/* MAP HUD PANEL HEADER (Interactive controls) */}
      <div className="bg-[#121313]/95 border-b border-outline-variant/60 p-2.5 z-20 flex flex-col gap-2 relative">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[9px] text-white tracking-wider uppercase font-bold">
              Metropolitan Operations Area (OpenStreetMap / Leaflet)
            </span>
          </div>
          
          {/* Synchronisation Status Tag */}
          <div className="flex items-center gap-1.5">
            {isRealBackend ? (
              <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                🌐 BACKEND CONNECTED
              </span>
            ) : (
              <span className="bg-amber-950/60 text-amber-400 border border-amber-500/20 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wide">
                📡 OFFLINE SIMULATION
              </span>
            )}
          </div>
        </div>

        {/* Tactical layers toggle deck */}
        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-stone-400 pb-0.5 mt-0.5">
          <span className="text-[8px] text-stone-500 font-bold uppercase tracking-tight mr-1">LAYERS:</span>
          
          <button
            onClick={() => setShowRiskGrid(!showRiskGrid)}
            className={`px-1.5 py-0.5 border rounded-sm transition-all hover:text-white cursor-pointer ${
              showRiskGrid
                ? 'bg-[#E53935]/15 text-primary border-[#E53935]/40'
                : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
            }`}
          >
            GRID HEAT {showRiskGrid ? '●' : '○'}
          </button>

          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`px-1.5 py-0.5 border rounded-sm transition-all hover:text-white cursor-pointer ${
              showMesh
                ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
            }`}
          >
            LINK MESH {showMesh ? '●' : '○'}
          </button>

          <button
            onClick={() => setShowDispatchCenters(!showDispatchCenters)}
            className={`px-1.5 py-0.5 border rounded-sm transition-all hover:text-white cursor-pointer ${
              showDispatchCenters
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                : 'bg-stone-900 border-stone-800 hover:bg-stone-800'
            }`}
          >
            DISPATCH CENTERS ({dispatchCenterCount}) {showDispatchCenters ? '●' : '○'}
          </button>

          {/* Density tuning slider */}
          <div className="flex items-center gap-1.5 ml-auto text-[8px] text-stone-500 font-bold">
            <span>UNITS:</span>
            <select
              value={dispatchCenterCount}
              onChange={(e) => setDispatchCenterCount(Number(e.target.value))}
              className="bg-stone-900 border border-stone-800 text-stone-300 rounded font-mono text-[8px] px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="50">50 Nodes</option>
              <option value="100">100 Nodes</option>
              <option value="150">150 Nodes</option>
              <option value="180">180 Nodes</option>
              <option value="220">220 Nodes</option>
            </select>
          </div>
        </div>
      </div>

      {/* RENDER SYSTEM */}
      <div className="relative flex-1 w-full bg-stone-950 overflow-hidden">
        
        {/* Loading overlay panel */}
        {loading && (
          <div className="absolute inset-0 bg-stone-950/80 z-40 flex flex-col items-center justify-center font-mono gap-2 text-stone-400 text-xs">
            <span className="material-symbols-outlined text-primary text-[28px] animate-spin">sync</span>
            <span>POLISHING RISK ZONE PARITY MESH...</span>
          </div>
        )}

        {/* Pure Leaflet / OpenStreetMap Dark Matter Container */}
        <div ref={mapContainerRef} className="width-full h-full min-h-[425px] relative z-10" />

        {/* CLICK ACTION HUD TOOLTIP POPUP OVERLAY */}
        {hoveredCoords && (
          <div 
            className="absolute z-20 bg-[#121313]/95 text-stone-200 max-w-[210px] technical-outline border-primary p-2.5 rounded shadow-2xl transition-all animate-fade-in"
            style={{
              left: Math.min(hoveredCoords.x + 12, window.innerWidth > 480 ? 250 : 200),
              top: Math.min(hoveredCoords.y + 12, 280),
            }}
          >
            <div className="flex justify-between items-center pb-1 border-b border-outline-variant/50">
              <span className="font-mono text-[9px] text-primary tracking-widest uppercase font-bold">RADAR LOC LOCKED</span>
              <button 
                className="text-stone-400 text-[11px] hover:text-white"
                onClick={() => setHoveredCoords(null)}
              >
                ×
              </button>
            </div>
            <p className="font-sans text-xs font-semibold text-white mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-primary">domain</span>
              {hoveredCoords.ward}
            </p>
            <p className="font-mono text-[9.5px] text-zinc-400 mt-0.5">
              GPS: {hoveredCoords.lat}, {hoveredCoords.lng}
            </p>
            <button 
              id="map-prefill-dispatch"
              className="w-full mt-2.5 bg-[#E53935] hover:bg-[#E53935]/90 text-white font-sans text-[10px] font-bold uppercase tracking-wider py-1.5 px-2 rounded-sm active:scale-95 transition-all text-center cursor-pointer"
              onClick={() => {
                onNewIncidentClick(`${hoveredCoords.lat}, ${hoveredCoords.lng}`, hoveredCoords.ward);
                setHoveredCoords(null);
              }}
            >
              DISPATCH TO THIS POINT
            </button>
          </div>
        )}

        {/* CLUSTER NODE SELECTION DETAILS FLOATING HUD OVERLAY */}
        {selectedCenter && (
          <div className="absolute bottom-2 left-2 right-2 z-25 bg-[#121313]/98 border border-outline-variant/80 p-2.5 rounded-md shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-1 mb-1.5">
              <span className="font-mono text-[9px] text-sky-400 font-bold uppercase tracking-wider">
                🔬 NODE TELEMETRY • {selectedCenter.id}
              </span>
              <button 
                className="text-stone-400 hover:text-stone-100 text-xs font-mono font-bold leading-none px-1"
                onClick={() => setSelectedCenter(null)}
              >
                ×
              </button>
            </div>
            <div className="flex gap-2 items-center justify-between">
              <div>
                <p className="font-sans font-bold text-white text-xs leading-none">{selectedCenter.name}</p>
                <p className="font-mono text-[9px] text-stone-400 mt-1">
                  GPS: {selectedCenter.coordinates.lat.toFixed(4)}, {selectedCenter.coordinates.lng.toFixed(4)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 font-mono text-[9.5px]">
                <span className="text-stone-400 font-bold">
                  FLEET: <strong className="text-white">{selectedCenter.activeFleetCount}/{selectedCenter.capacity} UNITS</strong>
                </span>
                <span className={`px-1 rounded-sm text-[8px] font-bold ${
                  selectedCenter.riskLevel === 'HIGH' ? 'bg-red-950/85 text-red-400 border border-red-500/30' :
                  selectedCenter.riskLevel === 'MEDIUM' ? 'bg-amber-950/85 text-amber-400 border border-amber-500/30' :
                  'bg-emerald-950/85 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedCenter.riskLevel} RISK ZONE
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* COMPASS ROSE HUD MARKER Overlay Decoration */}
      <div className="absolute bottom-2 right-2 pointer-events-none w-10 h-10 border border-stone-800 rounded-full flex items-center justify-center bg-stone-950/60 backdrop-blur-xs select-none z-20">
        <span className="text-[7.5px] text-stone-500 font-mono font-bold absolute top-0.5">N</span>
        <div className="w-0.5 h-6 bg-gradient-to-b from-primary/60 to-transparent absolute" />
      </div>

    </div>
  );
}
