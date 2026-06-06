import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import Hospital
from app.core.routing import get_osrm_eta

logger = logging.getLogger(__name__)

import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def rank_hospitals(
    incident_lat: float,
    incident_lng: float,
    required_specialty: Optional[str],
    db: Session
) -> List[Dict[str, Any]]:
    """
    Ranks available hospitals based on a composite scoring function.
    """
    # 1. Fetch all operational hospitals from the database
    all_hospitals = db.query(Hospital).filter(Hospital.is_24x7 == True).all()
    
    # 2. FAST PATH: Filter the top 5 closest hospitals using Haversine distance
    for h in all_hospitals:
        h._distance = haversine_distance(
            float(incident_lat), float(incident_lng), 
            float(h.latitude), float(h.longitude)
        )
    
    closest_hospitals = sorted(all_hospitals, key=lambda x: x._distance)[:5]
    
    ranked_list = []
    
    for hospital in closest_hospitals:
        # 3. Compute real-time ETA via OSRM ONLY for the top 5
        eta_seconds = await get_osrm_eta(
            src_lat=incident_lat,
            src_lng=incident_lng,
            dst_lat=float(hospital.latitude),
            dst_lng=float(hospital.longitude)
        )
        
        # 4. Base Score Calculation
        score = max(0, 10000 - eta_seconds)
        
        # 5. Specialty Bonus Application
        hospital_specialties = hospital.specialties if hospital.specialties else []
        if required_specialty:
            specialties_lower = [s.lower() for s in hospital_specialties]
            if required_specialty.lower() in specialties_lower:
                score += 5000 
                
        # 6. Capacity Checks
        if hospital.er_capacity <= 0:
            continue
            
        ranked_list.append({
            "hospital_id": hospital.id,
            "name": hospital.name,
            "eta_seconds": eta_seconds,
            "specialties": hospital_specialties,
            "er_capacity": hospital.er_capacity,
            "score": score
        })
        
    # 7. Sort the list descending so the highest score is at index 0
    ranked_list.sort(key=lambda x: x["score"], reverse=True)
    
    return ranked_list
