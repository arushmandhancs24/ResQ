from app.core.routing import get_osrm_eta
from app.core.fleet_state import FleetStateManager
from app.core.logger import get_logger

logger = get_logger(__name__)

import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def find_best_ambulance(incident_lat, incident_lng):
    # Free-agent reassignment and No-Withholding Policy:
    # We fetch ALL dispatchable units (available OR returning) across the entire city.
    ambulances_available = FleetStateManager.get_dispatchable_units()
    
    logger.info(f"No-Withholding Policy Enforced: Evaluating {len(ambulances_available)} cross-zone dispatchable units (including returning free-agents).")

    if len(ambulances_available) == 0:
        return None, None

    # FAST PATH: Filter the top 10 closest units using Haversine distance to prevent querying OSRM 2,000 times!
    for amb in ambulances_available:
        amb["_distance"] = haversine_distance(
            float(incident_lat), float(incident_lng), 
            float(amb["latitude"]), float(amb["longitude"])
        )
    
    # Sort by straight-line distance and take top 10
    closest_ambulances = sorted(ambulances_available, key=lambda x: x["_distance"])[:10]

    import asyncio
    
    # SLOW PATH: Query OSRM routing ONLY for the top 10 geometrically closest units (Concurrently!)
    async def evaluate_ambulance(ambulance):
        ambulance_lat = float(ambulance["latitude"])
        ambulance_lng = float(ambulance["longitude"])
        this_eta = await get_osrm_eta(ambulance_lat, ambulance_lng, incident_lat, incident_lng)
        return ambulance["unit_id"], this_eta

    tasks = [evaluate_ambulance(amb) for amb in closest_ambulances]
    results = await asyncio.gather(*tasks)

    best_ambulance_id = None
    best_eta = float('inf')

    for unit_id, this_eta in results:
        if this_eta < best_eta:
            best_eta = this_eta
            best_ambulance_id = unit_id
    
    return best_ambulance_id, best_eta