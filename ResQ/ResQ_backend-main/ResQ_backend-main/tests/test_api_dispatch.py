import pytest
from unittest.mock import patch, MagicMock, AsyncMock

def test_dispatch_request_success(client):
    payload = {
        "latitude": 12.91,
        "longitude": 77.62,
        "incident_type": "trauma",
        "severity": 3
    }
    
    # Mock database objects
    mock_db = MagicMock()
    mock_incident = MagicMock()
    mock_incident.id = 1
    mock_incident.latitude = 12.91
    mock_incident.longitude = 77.62
    mock_incident.incident_type = "trauma"
    mock_incident.severity = 3
    mock_incident.ward_name = None
    
    # Mock ambulance object
    mock_ambulance = MagicMock()
    mock_ambulance.id = 10
    mock_ambulance.vehicle_number = "KA-01-AB-1234"
    mock_ambulance.latitude = 12.92
    mock_ambulance.longitude = 77.63
    mock_ambulance.status.value = "available"
    
    # Mock hospital object
    mock_hospital = MagicMock()
    mock_hospital.id = 1
    mock_hospital.name = "Test Hospital"
    mock_hospital.latitude = 12.93
    mock_hospital.longitude = 77.64
    mock_hospital.specialties = ["trauma", "cardiac"]
    mock_hospital.er_capacity = 10
    mock_hospital.is_24x7 = True
    
    # Mock ranked hospitals result
    mock_ranked_hospitals = [{
        "hospital_id": 1,
        "name": "Test Hospital",
        "eta_seconds": 240,
        "specialties": ["trauma", "cardiac"],
        "er_capacity": 10,
        "score": 9760
    }]
    
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
        mock_find.return_value = (10, 300)
        with patch("app.api.dispatch.rank_hospitals", new_callable=AsyncMock) as mock_rank:
            mock_rank.return_value = mock_ranked_hospitals
            with patch("app.api.dispatch.FleetStateManager.get_dispatchable_units", return_value=[{"unit_id": 10}]):
                with patch("app.api.dispatch.FleetStateManager.update_status"):
                    with patch("app.api.dispatch.manager.broadcast", new_callable=AsyncMock):
                        response = client.post("/dispatch/request", json=payload)
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert data["message"] == "Dispatch successful"
                        assert data["assigned_unit"] == 10
                        assert data["eta_seconds"] == 300
                        
                        # Verify new response fields
                        assert "ambulance" in data
                        assert data["ambulance"]["id"] == 10
                        assert data["ambulance"]["vehicle_number"] == "KA-01-AB-1234"
                        assert data["ambulance"]["status"] == "available"
                        
                        assert "hospital" in data
                        assert data["hospital"] is not None
                        assert data["hospital"]["id"] == 1
                        assert data["hospital"]["name"] == "Test Hospital"
                        assert data["hospital"]["specialties"] == ["trauma", "cardiac"]
                        
                        mock_find.assert_called_once_with(12.91, 77.62)
                        mock_rank.assert_called_once()
                
    app.dependency_overrides.clear()

def test_dispatch_request_no_ambulances(client):
    payload = {
        "latitude": 12.91,
        "longitude": 77.62,
        "incident_type": "trauma",
        "severity": 3
    }
    
    with patch("app.api.dispatch.find_best_ambulance", new_callable=AsyncMock) as mock_find:
        mock_find.return_value = (None, None)
        
        response = client.post("/dispatch/request", json=payload)
        
        assert response.status_code == 503
        assert "No available ambulances" in response.json()["detail"]


def test_dispatch_request_no_hospital(client):
    """Test dispatch when no hospital is available - should still succeed with hospital=None"""
    payload = {
        "latitude": 12.91,
        "longitude": 77.62,
        "incident_type": "trauma",
        "severity": 3
    }
    
    # Mock database objects
    mock_db = MagicMock()
    mock_incident = MagicMock()
    mock_incident.id = 1
    mock_incident.latitude = 12.91
    mock_incident.longitude = 77.62
    mock_incident.incident_type = "trauma"
    mock_incident.severity = 3
    mock_incident.ward_name = None
    
    # Mock ambulance object
    mock_ambulance = MagicMock()
    mock_ambulance.id = 10
    mock_ambulance.vehicle_number = "KA-01-AB-1234"
    mock_ambulance.latitude = 12.92
    mock_ambulance.longitude = 77.63
    mock_ambulance.status.value = "available"
    
    # Setup query mocks
    def mock_query(model):
        query_mock = MagicMock()
        if model.__name__ == "Ambulance":
            query_mock.filter.return_value.first.return_value = mock_ambulance
        return query_mock
    
    mock_db.query.side_effect = mock_query
    mock_db.add.return_value = None
    mock_db.flush.return_value = None
    mock_db.commit.return_value = None
    
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with patch("app.api.dispatch.find_best_ambulance", new_callable=AsyncMock) as mock_find:
        mock_find.return_value = (10, 300)
        with patch("app.api.dispatch.rank_hospitals", new_callable=AsyncMock) as mock_rank:
            # Empty list - no hospitals available
            mock_rank.return_value = []
            with patch("app.api.dispatch.FleetStateManager.get_dispatchable_units", return_value=[{"unit_id": 10}]):
                with patch("app.api.dispatch.FleetStateManager.update_status"):
                    with patch("app.api.dispatch.manager.broadcast", new_callable=AsyncMock):
                        response = client.post("/dispatch/request", json=payload)
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert data["message"] == "Dispatch successful"
                        assert data["assigned_unit"] == 10
                        
                        # Verify ambulance is present
                        assert "ambulance" in data
                        assert data["ambulance"]["id"] == 10
                        
                        # Verify hospital is None when no hospital found
                        assert "hospital" in data
                        assert data["hospital"] is None
                
    app.dependency_overrides.clear()
