from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Incident, DispatchLog, IncidentStatus, Ambulance, Hospital
from app.core.dispatch_engine import find_best_ambulance
from app.core.fleet_state import FleetStateManager
from app.core.websocket_manager import manager
from app.core.hospital_router import rank_hospitals

dispatch_router = APIRouter(
    prefix="/dispatch",
    tags=["Dispatch"]
)

class DispatchRequest(BaseModel):
    latitude: float
    longitude: float
    incident_type: str

@dispatch_router.post("/request")
async def create_dispatch_request(request: DispatchRequest, db: Session = Depends(get_db)):
    """Handles an incoming emergency, calculates best route, and dispatches an ambulance."""
    # 1. Snapshot dispatchable units BEFORE the decision — audit must reflect
    #    the exact pool that was evaluated, not a stale re-query after the fact.
    dispatchable_snapshot = FleetStateManager.get_dispatchable_units()
    alternatives_count = len(dispatchable_snapshot)
    
    # 2. Ask the Brain (Dispatch Engine) for the best ambulance
    best_unit_id, best_eta = await find_best_ambulance(request.latitude, request.longitude)
    
    # 3. If no ambulances are available, fail gracefully
    if not best_unit_id:
        raise HTTPException(status_code=503, detail="No available ambulances at this time.")

    # 4. Query the Ambulance record for the selected unit
    ambulance = db.query(Ambulance).filter(Ambulance.id == best_unit_id).first()
    if not ambulance:
        raise HTTPException(status_code=500, detail="Selected ambulance not found in database.")

    # 5. Rank hospitals for the incident using lat/lon and incident_type
    ranked_hospitals = await rank_hospitals(
        incident_lat=request.latitude,
        incident_lng=request.longitude,
        required_specialty=request.incident_type,
        db=db
    )
    
    # Take the first hospital if available, otherwise None
    selected_hospital = None
    hospital_id = None
    if ranked_hospitals:
        top_hospital_data = ranked_hospitals[0]
        hospital_id = top_hospital_data["hospital_id"]
        # Query the full Hospital object for response
        hospital_obj = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if hospital_obj:
            selected_hospital = {
                "id": hospital_obj.id,
                "name": hospital_obj.name,
                "latitude": float(hospital_obj.latitude),
                "longitude": float(hospital_obj.longitude),
                "specialties": hospital_obj.specialties if hospital_obj.specialties else [],
                "er_capacity": hospital_obj.er_capacity,
                "is_24x7": hospital_obj.is_24x7
            }

    # 6. Create the Incident record in Postgres
    new_incident = Incident(
        latitude=request.latitude,
        longitude=request.longitude,
        incident_type=request.incident_type,
        status=IncidentStatus.DISPATCHED
    )
    db.add(new_incident)
    db.flush() # Flush to assign the incident ID before committing
    
    # 7. Create the Dispatch Log (Audit Trail) with hospital_id
    #    alternatives_count was captured BEFORE dispatch to avoid race conditions.
    dispatch_log = DispatchLog(
        incident_id=new_incident.id,
        ambulance_id=best_unit_id,
        hospital_id=hospital_id,
        eta_seconds=best_eta,
        alternatives_considered=alternatives_count
    )
    db.add(dispatch_log)
    db.commit()

    # 8. Update the hot cache (Redis) so no one else grabs this ambulance
    FleetStateManager.update_status(best_unit_id, "dispatched")
    
    # 9. Broadcast the "dispatch" message to all connected clients
    await manager.broadcast({
        "type": "dispatch",
        "ambulance_id": best_unit_id,
        "incident_id": new_incident.id,
        "incident": {
            "id": new_incident.id,
            "latitude": new_incident.latitude,
            "longitude": new_incident.longitude,
            "incident_type": new_incident.incident_type,
            "severity": new_incident.severity,
            "ward_name": new_incident.ward_name
        },
        "hospital": selected_hospital,
        "eta_seconds": best_eta
    })
    
    # 10. Return the expanded response shape
    return {
        "message": "Dispatch successful",
        "incident_id": new_incident.id,
        "assigned_unit": best_unit_id,
        "eta_seconds": best_eta,
        "ambulance": {
            "id": ambulance.id,
            "vehicle_number": ambulance.vehicle_number,
            "latitude": float(ambulance.latitude),
            "longitude": float(ambulance.longitude),
            "status": ambulance.status.value  # lowercase enum value
        },
        "hospital": selected_hospital
    }

@dispatch_router.get("/history")
def get_dispatch_history(ambulance_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Fetch the recent dispatch audit logs from Postgres."""
    # Base query
    query = db.query(DispatchLog)
    
    if ambulance_id is not None:
        query = query.filter(DispatchLog.ambulance_id == ambulance_id)
        
    logs = query.order_by(DispatchLog.dispatched_at.desc()).limit(50).all()
    
    result = []
    for log in logs:
        hospital_name = None
        if log.hospital_id is not None:
            hospital = db.query(Hospital).filter(Hospital.id == log.hospital_id).first()
            if hospital:
                hospital_name = hospital.name
                
        result.append({
            "id": log.id,
            "incident_id": log.incident_id,
            "ambulance_id": log.ambulance_id,
            "hospital_id": log.hospital_id,
            "eta_seconds": log.eta_seconds,
            "alternatives_considered": log.alternatives_considered,
            "dispatched_at": log.dispatched_at.isoformat() if log.dispatched_at else None,
            "hospital_name": hospital_name
        })
        
    return result
