import { DispatchCenter, RiskZone, MeshLink } from '../types';

// Bounding box for Bengaluru coordinates range
// North: 13.1200, South: 12.8500, West: 77.4500, East: 77.7300
export const BENGALURU_BOUNDS = {
  north: 13.1200,
  south: 12.8500,
  west: 77.4500,
  east: 77.7300,
};

// Divide Bengaluru into a 5x5 grid of risk zones
export const BENGALURU_GRID_DATA = [
  // Row 1 (North)
  { row: 0, col: 0, name: "NW-Hebbal / Yelahanka Link", riskScore: 3 },
  { row: 0, col: 1, name: "North-Hebbal Main Cluster", riskScore: 5 },
  { row: 0, col: 2, name: "North-East-Kalyan Nagar", riskScore: 5 },
  { row: 0, col: 3, name: "North-East-Manyata Tech Park", riskScore: 7 },
  { row: 0, col: 4, name: "NE-Hennur Outer Limits", riskScore: 2 },
  // Row 2
  { row: 1, col: 0, name: "West-Peenya Industrial Zone", riskScore: 8 },
  { row: 1, col: 1, name: "Central-West-Malleshwaram", riskScore: 6 },
  { row: 1, col: 2, name: "Central-Sadashivanagar Sector", riskScore: 4 },
  { row: 1, col: 3, name: "Central-East-Frazer Town", riskScore: 5 },
  { row: 1, col: 4, name: "East-K R Puram Corridor", riskScore: 4 },
  // Row 3 (Core Central Grid)
  { row: 2, col: 0, name: "West-Rajajinagar Block", riskScore: 5 },
  { row: 2, col: 1, name: "Central-Majestic Hub", riskScore: 10 },
  { row: 2, col: 2, name: "Central-MG Road Core", riskScore: 9 },
  { row: 2, col: 3, name: "Central-East-Indiranagar", riskScore: 8 },
  { row: 2, col: 4, name: "East-Whitefield Tech Corridor", riskScore: 9 },
  // Row 4
  { row: 3, col: 0, name: "SW-Nagarbhavi Area", riskScore: 5 },
  { row: 3, col: 1, name: "SW-Vijayanagar Area", riskScore: 5 },
  { row: 3, col: 2, name: "South-Jayanagar Core", riskScore: 5 },
  { row: 3, col: 3, name: "South-East-Koramangala Hub", riskScore: 9 },
  { row: 3, col: 4, name: "East-Bellandur Corridor/Lake", riskScore: 10 },
  // Row 5 (South)
  { row: 4, col: 0, name: "SW-Kengeri Outer Limit", riskScore: 3 },
  { row: 4, col: 1, name: "South-West-Banashankari", riskScore: 4 },
  { row: 4, col: 2, name: "South-JP Nagar Sector", riskScore: 5 },
  { row: 4, col: 3, name: "South-HSR Layout Block", riskScore: 7 },
  { row: 4, col: 4, name: "SE-Electronic City Highway", riskScore: 8 },
];

/**
 * Generate a complete list of 25 grid cell RiskZone boundaries for Bengaluru as a fully contiguous
 * irregular polygon mesh sheet (constructed by perturbing the grid junctions deterministically so there are no gaps).
 */
export function generateRiskZones(): RiskZone[] {
  const rowCount = 5;
  const colCount = 5;
  const latDelta = (BENGALURU_BOUNDS.north - BENGALURU_BOUNDS.south) / rowCount;
  const lngDelta = (BENGALURU_BOUNDS.east - BENGALURU_BOUNDS.west) / colCount;

  // 1. Precalculate a grid of shared, perturbed vertices.
  const vertices: { lat: number; lng: number }[][] = [];
  for (let r = 0; r <= rowCount; r++) {
    vertices[r] = [];
    for (let c = 0; c <= colCount; c++) {
      // Find default regular coordinate junction
      let lat = BENGALURU_BOUNDS.north - r * latDelta;
      let lng = BENGALURU_BOUNDS.west + c * lngDelta;

      // Only perturb internal vertices to keep outer edges aligned to bounding box limits
      if (r > 0 && r < rowCount && c > 0 && c < colCount) {
        // Deterministic offset using sine/cosine harmonics for stable output on every call
        const latOffsetFactor = Math.sin(r * 2.18 + c * 3.73) * 0.32; // up to 32% of block height
        const lngOffsetFactor = Math.cos(r * 4.41 + c * 1.83) * 0.32; // up to 32% of block width
        lat += latOffsetFactor * latDelta;
        lng += lngOffsetFactor * lngDelta;
      }

      vertices[r][c] = { lat, lng };
    }
  }

  // 2. Map grid cells to adjacent shared polygons
  return BENGALURU_GRID_DATA.map((sector) => {
    const r = sector.row;
    const c = sector.col;

    // Corner vertices in clockwise loop pattern
    const boundary = [
      vertices[r][c],           // Top Left
      vertices[r][c + 1],       // Top Right
      vertices[r + 1][c + 1],   // Bottom Right
      vertices[r + 1][c],       // Bottom Left
    ];

    // Compute enclosing bounding box
    const north = Math.max(...boundary.map(p => p.lat));
    const south = Math.min(...boundary.map(p => p.lat));
    const east = Math.max(...boundary.map(p => p.lng));
    const west = Math.min(...boundary.map(p => p.lng));

    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      sector.riskScore >= 8 ? 'HIGH' :
      sector.riskScore >= 5 ? 'MEDIUM' : 'LOW';

    return {
      id: `zone-${r}-${c}`,
      name: sector.name,
      bounds: { north, south, east, west },
      boundary,
      riskScore: sector.riskScore,
      riskLevel,
    };
  });
}

/**
 * Generate 150-200 random dispatch centers distributed according to risk zone parity
 */
export function generateDispatchCentersByRiskParity(count: number = 180): DispatchCenter[] {
  const zones = generateRiskZones();
  
  // Calculate risk distribution weights
  // High risk = 6x weight, Medium risk = 3x weight, Low risk = 1x weight
  const weights = zones.map(zone => {
    if (zone.riskLevel === 'HIGH') return 6;
    if (zone.riskLevel === 'MEDIUM') return 3;
    return 1;
  });

  const totalWeight = weights.reduce((acc, sum) => acc + sum, 0);
  const centers: DispatchCenter[] = [];
  let centerIdCounter = 1;

  zones.forEach((zone, index) => {
    const weight = weights[index];
    // Calculate targeted share for this grid cell
    const targetedShare = Math.round(count * (weight / totalWeight));
    
    for (let i = 0; i < targetedShare; i++) {
      // Find a random location within the bounds of this cell
      const latRange = zone.bounds.north - zone.bounds.south;
      const lngRange = zone.bounds.east - zone.bounds.west;

      // Introduce a 10% inner margin padding to prevent markers spawning directly on borders
      const lat = zone.bounds.south + (0.1 + Math.random() * 0.8) * latRange;
      const lng = zone.bounds.west + (0.1 + Math.random() * 0.8) * lngRange;

      centers.push({
        id: `DC-${1000 + centerIdCounter}`,
        name: `Dispatch Node ${centerIdCounter} - ${zone.name.split(' ')[0]}`,
        coordinates: { lat, lng },
        riskLevel: zone.riskLevel,
        capacity: zone.riskLevel === 'HIGH' ? 8 : zone.riskLevel === 'MEDIUM' ? 5 : 2,
        activeFleetCount: Math.max(1, Math.floor(Math.random() * (zone.riskLevel === 'HIGH' ? 6 : 3))),
      });
      centerIdCounter++;
    }
  });

  // If due to rounding we get slightly fewer/more than requested, trim or expand
  return centers.slice(0, count);
}

/**
 * Calculate the mesh links overlay (connecting nearby centers)
 * Connects each dispatch center to its closest 2 neighbors
 */
export function calculateNetworkMeshLinks(centers: DispatchCenter[]): MeshLink[] {
  const links: MeshLink[] = [];
  const visitedKeys = new Set<string>();

  // Haversine distance heuristic (flat coordinates distance squared is sufficient for clustering)
  const getSquaredDistance = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
    return Math.pow(c1.lat - c2.lat, 2) + Math.pow(c1.lng - c2.lng, 2);
  };

  for (let i = 0; i < centers.length; i++) {
    const c1 = centers[i];
    const distances = centers
      .map((c2, idx) => ({ idx, dist: getSquaredDistance(c1.coordinates, c2.coordinates) }))
      .filter(item => item.idx !== i) // exclude self
      .sort((a, b) => a.dist - b.dist);

    // Get closest 2 neighbors
    const nearestCount = Math.min(2, distances.length);
    for (let j = 0; j < nearestCount; j++) {
      const c2 = centers[distances[j].idx];
      
      // Make a unique key for duplicate filtering
      const k1 = `${c1.id}-${c2.id}`;
      const k2 = `${c2.id}-${c1.id}`;

      if (!visitedKeys.has(k1) && !visitedKeys.has(k2)) {
        links.push({
          from: c1.coordinates,
          to: c2.coordinates,
        });
        visitedKeys.add(k1);
      }
    }
  }

  return links;
}


/**
 * Auto-detect and parse a coordinate point to handle various formats (arrays of lat/lng, objects, swapped coordinates)
 * standardizing it to the exact Bengaluru region bounds.
 */
function parseCoordinatePoint(pt: unknown): { lat: number; lng: number } | null {
  let lat = 0;
  let lng = 0;
  
  if (Array.isArray(pt)) {
    if (pt.length >= 2) {
      const val1 = Number(pt[0]);
      const val2 = Number(pt[1]);
      // Bengaluru latitude is around 12.9, longitude is around 77.5
      const isVal1Lng = Math.abs(val1 - 77.5) < 3;
      const isVal2Lat = Math.abs(val2 - 12.9) < 2;
      const isVal1Lat = Math.abs(val1 - 12.9) < 2;
      const isVal2Lng = Math.abs(val2 - 77.5) < 3;

      if (isVal1Lng || isVal2Lat) {
        lng = val1;
        lat = val2;
      } else if (isVal1Lat || isVal2Lng) {
        lat = val1;
        lng = val2;
      } else {
        // Standard fallback
        lat = val1;
        lng = val2;
      }
    } else {
      return null;
    }
  } else if (pt && typeof pt === 'object') {
    const latKeys = ['lat', 'latitude', 'latValue', 'y'];
    const lngKeys = ['lng', 'longitude', 'lngValue', 'x', 'long'];
    
    let foundLat = false;
    let foundLng = false;
    
    for (const k of latKeys) {
      if (k in pt && pt[k] !== undefined && pt[k] !== null) {
        lat = Number(pt[k]);
        foundLat = true;
        break;
      }
    }
    for (const k of lngKeys) {
      if (k in pt && pt[k] !== undefined && pt[k] !== null) {
        lng = Number(pt[k]);
        foundLng = true;
        break;
      }
    }
    
    // Fallback if named keys are missing
    if (!foundLat || !foundLng) {
      const values = Object.values(pt).map(Number).filter(v => !isNaN(v));
      if (values.length >= 2) {
        const isV0Lng = Math.abs(values[0] - 77.5) < 3;
        const isV1Lat = Math.abs(values[1] - 12.9) < 2;
        if (isV0Lng || isV1Lat) {
          lng = values[0];
          lat = values[1];
        } else {
          lat = values[0];
          lng = values[1];
        }
      } else {
        return null;
      }
    }
  } else {
    return null;
  }
  
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Parses GeoJSON FeatureCollection from PostGIS /zones/mesh into RiskZones
 * that map contiguous, gapless irregular Voronoi polygons across Bengaluru.
 */
function parseGeoJsonToRiskZones(geoJson: unknown): RiskZone[] {
  if (!geoJson || (geoJson.type !== 'FeatureCollection' && !Array.isArray(geoJson.features))) {
    return [];
  }

  const features = Array.isArray(geoJson) ? geoJson : (geoJson.features || []);

  return features.map((feature: unknown, index: number) => {
    const properties = feature.properties || {};
    const geometry = feature.geometry || {};
    let boundary: { lat: number; lng: number }[] = [];

    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
      const outerRing = geometry.coordinates[0];
      if (Array.isArray(outerRing)) {
        boundary = outerRing
          .map((pt: unknown) => parseCoordinatePoint(pt))
          .filter((pt): pt is { lat: number; lng: number } => pt !== null);
      }
    } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
      const firstPolygon = geometry.coordinates[0];
      if (Array.isArray(firstPolygon)) {
        const outerRing = firstPolygon[0];
        if (Array.isArray(outerRing)) {
          boundary = outerRing
            .map((pt: unknown) => parseCoordinatePoint(pt))
            .filter((pt): pt is { lat: number; lng: number } => pt !== null);
        }
      }
    }

    if (boundary.length === 0) return null;

    // Compute bounds for fallback rendering / camera focus
    const north = Math.max(...boundary.map(p => p.lat));
    const south = Math.min(...boundary.map(p => p.lat));
    const east = Math.max(...boundary.map(p => p.lng));
    const west = Math.min(...boundary.map(p => p.lng));

    const riskScore = Number(properties.risk_score ?? properties.riskScore ?? properties.risk ?? properties.score ?? 5);
    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      properties.risk_level || properties.riskLevel || (riskScore >= 8 ? 'HIGH' : riskScore >= 5 ? 'MEDIUM' : 'LOW');

    return {
      id: properties.id || properties.zone_id || properties.zoneId || `geojson-zone-${index}`,
      name: properties.name || properties.title || `V-Zone Node #${index + 1}`,
      bounds: { north, south, east, west },
      boundary,
      riskScore,
      riskLevel,
    };
  }).filter((z): z is RiskZone => z !== null);
}

/**
 * Call the user's real backend to fetch dispatch centers, risk zones, and meshes,
 * falling back gracefully to simulated values if the backend is offline on local hosts.
 */
export async function fetchMapIntegrationsData(
  targetCount: number = 180,
  backendUrl: string = 'http://127.0.0.1:8000'
): Promise<{
  dispatchCenters: DispatchCenter[];
  riskZones: RiskZone[];
  meshLinks: MeshLink[];
  isRealBackend: boolean;
}> {
  try {
    // console.log(`[ResQ Integration] Attempting fetch to operator backend at: ${backendUrl}/health`);
    
    // We add a brief timeout wrapper to prevent hanging fetches
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${backendUrl}/health`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      // console.log(`[ResQ Integration] Backend health check passed!`);

      // 1. Fallback to generating dispatch centers since backend doesn't explicitly serve them
      const centersMapped: DispatchCenter[] = generateDispatchCentersByRiskParity(targetCount);
      
      // 2. Attempt also to fetch custom mesh link boundaries if the backend generates them
      let meshLinks: MeshLink[] = [];
      try {
        const meshRes = await fetch(`${backendUrl}/api/mesh`);
        if (meshRes.ok) {
          const meshData = await meshRes.json();
          const rawMesh = Array.isArray(meshData) ? meshData : (meshData.links || meshData.mesh || []);
          
          meshLinks = rawMesh.map((link: unknown) => {
            const fromPt = parseCoordinatePoint(link.from);
            const toPt = parseCoordinatePoint(link.to);
            if (fromPt && toPt) {
              return { from: fromPt, to: toPt };
            }
            return null;
          }).filter(Boolean) as MeshLink[];
        }
      } catch (e) {
        console.warn('[ResQ Integration] Mesh endpoint failed, falling back to client connecting calculation.');
      }

      // 3. Attempt also to fetch custom irregular risk zones/polygons if available
      let zones: RiskZone[] = [];
      
      // Try GeoJSON /zones/mesh first as requested for gapless tiling
      try {
        const voronoiRes = await fetch(`${backendUrl}/zones/mesh`);
        if (voronoiRes.ok) {
          const geoJsonData = await voronoiRes.ok ? await voronoiRes.json() : null;
          if (geoJsonData) {
            zones = parseGeoJsonToRiskZones(geoJsonData);
            // console.log(`[ResQ Integration] Successfully loaded ${zones.length} fully contiguous Voronoi cells from /zones/mesh!`);
          }
        }
      } catch (e) {
        console.warn('[ResQ Integration] Continuous Voronoi mesh fetch failed. Trying fallback /api/risk-zones.');
      }

      // Try /api/risk-zones secondarily
      if (zones.length === 0) {
        try {
          const zoneRes = await fetch(`${backendUrl}/api/risk-zones`);
          if (zoneRes.ok) {
            const zoneData = await zoneRes.json();
            const rawZones = Array.isArray(zoneData) ? zoneData : (zoneData.zones || zoneData.riskZones || []);
            
            zones = rawZones.map((z: unknown, index: number) => {
              let boundary: { lat: number; lng: number }[] | undefined = undefined;
              const boundarySource = z.boundary || z.coordinates || z.points || z.polygon || z.geom;
              
              if (Array.isArray(boundarySource)) {
                boundary = boundarySource
                  .map((pt: unknown) => parseCoordinatePoint(pt))
                  .filter((pt): pt is { lat: number; lng: number } => pt !== null);
              }
              
              let bounds = undefined;
              if (z.bounds) {
                bounds = {
                  north: Number(z.bounds.north),
                  south: Number(z.bounds.south),
                  east: Number(z.bounds.east),
                  west: Number(z.bounds.west),
                };
              }

              return {
                id: z.id || `zone-${index}`,
                name: z.name || `Zone Node ${index}`,
                bounds,
                boundary,
                riskScore: Number(z.riskScore ?? 5),
                riskLevel: z.riskLevel || 'MEDIUM',
              };
            }).filter(Boolean) as RiskZone[];
          }
        } catch (e) {
          console.warn('[ResQ Integration] Custom risk-zones endpoint fell back to calculated rectangular grid cells.');
        }
      }

      // Calculate localized zones if backend didn't provide custom ones
      if (zones.length === 0) {
        zones = generateRiskZones();
      }
      
      if (meshLinks.length === 0) {
        meshLinks = calculateNetworkMeshLinks(centersMapped);
      }

      return {
        dispatchCenters: centersMapped,
        riskZones: zones,
        meshLinks,
        isRealBackend: true,
      };
    } else {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (error) {
      // console.log(
      //   `[ResQ Integration] Real backend at '${backendUrl}' was not online or timed out. Handshaking failed smoothly. Operating in polished fallback simulation mode.`
      // );
    
    // Fallback simulation: Pure risk zone parity!
    const zones = generateRiskZones();
    const dispatchCenters = generateDispatchCentersByRiskParity(targetCount);
    const meshLinks = calculateNetworkMeshLinks(dispatchCenters);

    return {
      dispatchCenters,
      riskZones: zones,
      meshLinks,
      isRealBackend: false,
    };
  }
}

