import pytest
import asyncio
from unittest.mock import patch
from app.core.dispatch_engine import find_best_ambulance

@pytest.mark.asyncio
async def test_find_best_ambulance_zero_availability():
    # Mock FleetStateManager to return no available ambulances
    with patch("app.core.dispatch_engine.FleetStateManager.get_dispatchable_units", return_value=[]):
        unit_id, eta = await find_best_ambulance(12.0, 77.0)
        assert unit_id is None
        assert eta is None

@pytest.mark.asyncio
async def test_find_best_ambulance_osrm_success():
    fake_ambulances = [
        {"unit_id": 1, "latitude": "12.91", "longitude": "77.62"},
        {"unit_id": 2, "latitude": "12.92", "longitude": "77.63"}
    ]
    with patch("app.core.dispatch_engine.FleetStateManager.get_dispatchable_units", return_value=fake_ambulances):
        # Mock OSRM ETA: returns 300 for unit 1, 150 for unit 2
        async def mock_osrm(alat, alng, ilat, ilng):
            if alat == 12.91:
                return 300
            return 150
            
        with patch("app.core.dispatch_engine.get_osrm_eta", side_effect=mock_osrm):
            unit_id, eta = await find_best_ambulance(12.90, 77.60)
            assert unit_id == 2
            assert eta == 150

@pytest.mark.asyncio
async def test_find_best_ambulance_osrm_failure_fallback():
    # If OSRM fails, get_osrm_eta handles fallback internally.
    # We should test that find_best_ambulance can handle large ETAs or fallback values correctly.
    # Let's mock it to return high ETAs (which get_osrm_eta does on failure by defaulting to Haversine-based ETA).
    fake_ambulances = [
        {"unit_id": 1, "latitude": "12.91", "longitude": "77.62"},
        {"unit_id": 2, "latitude": "12.92", "longitude": "77.63"}
    ]
    with patch("app.core.dispatch_engine.FleetStateManager.get_dispatchable_units", return_value=fake_ambulances):
        async def mock_osrm(alat, alng, ilat, ilng):
            return 999999 # Simulating a failure or unreachable state
            
        with patch("app.core.dispatch_engine.get_osrm_eta", side_effect=mock_osrm):
            unit_id, eta = await find_best_ambulance(12.90, 77.60)
            assert unit_id == 1
            assert eta == 999999

@pytest.mark.asyncio
async def test_find_best_ambulance_equidistant():
    # Two ambulances with same ETA, should pick the first one
    fake_ambulances = [
        {"unit_id": 1, "latitude": "12.91", "longitude": "77.62"},
        {"unit_id": 2, "latitude": "12.92", "longitude": "77.63"}
    ]
    with patch("app.core.dispatch_engine.FleetStateManager.get_dispatchable_units", return_value=fake_ambulances):
        async def mock_osrm(alat, alng, ilat, ilng):
            return 200
            
        with patch("app.core.dispatch_engine.get_osrm_eta", side_effect=mock_osrm):
            unit_id, eta = await find_best_ambulance(12.90, 77.60)
            assert unit_id == 1
            assert eta == 200


def test_dispatch_response_shape_completeness(client):
    """
    **Validates: Requirements 5.1, 5.2, 5.3**
    
    Test that POST /dispatch/request returns a response with all required 
    top-level keys and that ambulance.status is lowercase.
    """
    from unittest.mock import MagicMock, AsyncMock
    from app.db.models import Ambulance, Hospital, AmbulanceStatus
    
    # Mock database objects
    mock_db = MagicMock()
    mock_incident = MagicMock()
    mock_incident.id = 42
    mock_incident.latitude = 12.9716
    mock_incident.longitude = 77.5946
    mock_incident.incident_type = "cardiac"
    mock_incident.severity = 4
    mock_incident.ward_name = "Koramangala"
    
    # Mock the Ambulance query result
    mock_ambulance = MagicMock()
    mock_ambulance.id = 7
    mock_ambulance.vehicle_number = "KA-01-AB-1234"
    mock_ambulance.latitude = 12.9200
    mock_ambulance.longitude = 77.6150
    mock_ambulance.status.value = "dispatched"  # Lowercase enum value
    
    # Mock the Hospital query result
    mock_hospital = MagicMock()
    mock_hospital.id = 1
    mock_hospital.name = "Manipal Hospital (HAL Airport Road)"
    mock_hospital.latitude = 12.9592
    mock_hospital.longitude = 77.6490
    mock_hospital.specialties = ["cardiac", "trauma", "neuro"]
    mock_hospital.er_capacity = 12
    mock_hospital.is_24x7 = True
    
    # Setup query mocks
    def mock_query(model):
        query_mock = MagicMock()
        if model.__name__ == "Ambulance":
            query_mock.filter.return_value.first.return_value = mock_ambulance
        elif model.__name__ == "Hospital":
            query_mock.filter.return_value.first.return_value = mock_hospital
        return query_mock
    
    mock_db.query.side_effect = mock_query
    mock_db.add.return_value = None
    mock_db.flush.return_value = None
    mock_db.commit.return_value = None
    
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with patch("app.api.dispatch.find_best_ambulance", new_callable=AsyncMock) as mock_find:
        mock_find.return_value = (7, 480)
        with patch("app.api.dispatch.rank_hospitals", new_callable=AsyncMock) as mock_rank:
            mock_rank.return_value = [
                {
                    "hospital_id": 1,
                    "name": "Manipal Hospital (HAL Airport Road)",
                    "eta_seconds": 420,
                    "specialties": ["cardiac", "trauma", "neuro"],
                    "er_capacity": 12,
                    "score": 14580
                }
            ]
            with patch("app.api.dispatch.FleetStateManager.get_dispatchable_units", return_value=[{"unit_id": 7}]):
                with patch("app.api.dispatch.FleetStateManager.update_status"):
                    with patch("app.api.dispatch.manager.broadcast", new_callable=AsyncMock):
                        # Call the endpoint
                        response = client.post(
                            "/dispatch/request",
                            json={
                                "latitude": 12.9716,
                                "longitude": 77.5946,
                                "incident_type": "cardiac"
                            }
                        )
                        
                        # Assert response status
                        assert response.status_code == 200
                        data = response.json()
                        
                        # Assert all required top-level keys are present
                        required_keys = ["message", "incident_id", "assigned_unit", "eta_seconds", "ambulance", "hospital"]
                        for key in required_keys:
                            assert key in data, f"Missing required key: {key}"
                        
                        # Assert ambulance object has all required keys
                        ambulance_keys = ["id", "vehicle_number", "latitude", "longitude", "status"]
                        for key in ambulance_keys:
                            assert key in data["ambulance"], f"Missing required ambulance key: {key}"
                        
                        # Assert ambulance.status is lowercase
                        assert data["ambulance"]["status"] == data["ambulance"]["status"].lower(), \
                            f"ambulance.status must be lowercase, got: {data['ambulance']['status']}"
                        
                        # Assert hospital object has all required keys (when present)
                        if data["hospital"] is not None:
                            hospital_keys = ["id", "name", "latitude", "longitude", "specialties", "er_capacity", "is_24x7"]
                            for key in hospital_keys:
                                assert key in data["hospital"], f"Missing required hospital key: {key}"
    
    app.dependency_overrides.clear()
