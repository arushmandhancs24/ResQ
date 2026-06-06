import pytest
from unittest.mock import patch, MagicMock
from app.db.models import AmbulanceStatus

def test_fleet_status_success(client):
    fake_fleet = [
        {"unit_id": 1, "latitude": 12.0, "longitude": 77.0, "status": "available"}
    ]
    with patch("app.api.fleet.FleetStateManager.get_all_available", return_value=fake_fleet):
        response = client.get("/fleet/status")
        assert response.status_code == 200
        data = response.json()
        assert len(data["available_units"]) == 1
        assert data["available_units"][0]["unit_id"] == 1

def test_fleet_unit_status_success(client):
    fake_unit = {"unit_id": 5, "status": "dispatched"}
    with patch("app.api.fleet.FleetStateManager.get_unit", return_value=fake_unit):
        response = client.get("/fleet/5")
        assert response.status_code == 200
        assert response.json()["unit_id"] == 5

def test_fleet_unit_status_not_found(client):
    with patch("app.api.fleet.FleetStateManager.get_unit", return_value=None):
        response = client.get("/fleet/999")
        assert response.status_code == 404

def test_fleet_update_location(client):
    payload = {"latitude": 12.0, "longitude": 77.0}
    with patch("app.api.fleet.FleetStateManager.update_location") as mock_update:
        response = client.put("/fleet/1/location", json=payload)
        assert response.status_code == 200
        assert response.json()["message"] == "Location updated successfully"
        mock_update.assert_called_once_with(unit_id=1, lat=12.0, lng=77.0)

def test_fleet_update_status(client):
    payload = {"status": AmbulanceStatus.AVAILABLE.value}
    
    mock_db = MagicMock()
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.api.fleet.FleetStateManager.update_status") as mock_update:
        with patch("app.api.fleet.find_rebalance_destination") as mock_reb:
            mock_reb.return_value = None
            response = client.put("/fleet/1/status", json=payload)
            assert response.status_code == 200
            assert response.json()["message"] == "Status updated successfully"
            mock_update.assert_called_once_with(unit_id=1, status=AmbulanceStatus.AVAILABLE.value)
            
    app.dependency_overrides.clear()

def test_fleet_update_status_uppercase_normalization(client):
    """Test that uppercase status values are normalized to lowercase."""
    payload = {"status": "AVAILABLE"}
    
    mock_db = MagicMock()
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.api.fleet.FleetStateManager.update_status") as mock_update:
        with patch("app.api.fleet.find_rebalance_destination") as mock_reb:
            mock_reb.return_value = None
            response = client.put("/fleet/1/status", json=payload)
            assert response.status_code == 200
            # Verify the normalized lowercase value was passed to FleetStateManager
            mock_update.assert_called_once_with(unit_id=1, status="available")
            
    app.dependency_overrides.clear()

def test_fleet_update_status_mixed_case_normalization(client):
    """Test that mixed case status values are normalized to lowercase."""
    payload = {"status": "DiSpAtChEd"}
    
    mock_db = MagicMock()
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.api.fleet.FleetStateManager.update_status") as mock_update:
        with patch("app.api.fleet.find_rebalance_destination") as mock_reb:
            mock_reb.return_value = None
            response = client.put("/fleet/1/status", json=payload)
            assert response.status_code == 200
            # Verify the normalized lowercase value was passed to FleetStateManager
            mock_update.assert_called_once_with(unit_id=1, status="dispatched")
            
    app.dependency_overrides.clear()

def test_fleet_update_status_whitespace_normalization(client):
    """Test that status values with leading/trailing whitespace are normalized."""
    payload = {"status": "  available  "}
    
    mock_db = MagicMock()
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.api.fleet.FleetStateManager.update_status") as mock_update:
        with patch("app.api.fleet.find_rebalance_destination") as mock_reb:
            mock_reb.return_value = None
            response = client.put("/fleet/1/status", json=payload)
            assert response.status_code == 200
            # Verify the normalized lowercase value (stripped and lowercased) was passed
            mock_update.assert_called_once_with(unit_id=1, status="available")
            
    app.dependency_overrides.clear()

def test_fleet_update_status_invalid_status(client):
    """Test that invalid status values return HTTP 422 with descriptive error."""
    payload = {"status": "INVALID_STATUS"}
    
    mock_db = MagicMock()
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.put("/fleet/1/status", json=payload)
    assert response.status_code == 422
    error_detail = response.json()["detail"]
    assert "invalid_status" in error_detail.lower()
    assert "valid values are" in error_detail.lower()
            
    app.dependency_overrides.clear()

def test_fleet_update_status_all_valid_statuses(client):
    """Test that all valid AmbulanceStatus enum values are accepted (in any case)."""
    valid_statuses = ["available", "dispatched", "en_route_hospital", "at_hospital", "returning", "offline"]
    
    mock_db = MagicMock()
    from app.main import app
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    for status in valid_statuses:
        # Test uppercase version
        payload = {"status": status.upper()}
        
        with patch("app.api.fleet.FleetStateManager.update_status") as mock_update:
            with patch("app.api.fleet.find_rebalance_destination") as mock_reb:
                mock_reb.return_value = None
                response = client.put("/fleet/1/status", json=payload)
                assert response.status_code == 200, f"Failed for status: {status}"
                # Verify normalized value was used
                mock_update.assert_called_once_with(unit_id=1, status=status)
            
    app.dependency_overrides.clear()
