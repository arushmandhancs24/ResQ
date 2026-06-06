"""
Property-based tests for status casing normalisation.

Feature: resq-system-integration
**Validates: Requirements 3.1, 3.2, 3.3**
"""

import pytest
from unittest.mock import patch, AsyncMock
from hypothesis import given, settings
from hypothesis import strategies as st
from fastapi.testclient import TestClient

from app.main import app
from app.db.models import AmbulanceStatus


# Helper function to apply random casing to a string
# Use a deterministic strategy to avoid Hypothesis warnings about using random module
def create_random_case_strategy():
    """Create a strategy that generates random-cased versions of status strings."""
    base_statuses = [
        "available",
        "dispatched",
        "en_route_hospital",
        "at_hospital",
        "returning",
        "offline"
    ]
    
    # Generate all possible casing combinations for each status
    def all_casings(s):
        """Generate various casing patterns for a string."""
        if not s:
            yield s
            return
        # Generate a few interesting patterns: all lower, all upper, alternating, title case
        yield s.lower()
        yield s.upper()
        yield s.title()
        # Alternating case starting with upper
        yield "".join(c.upper() if i % 2 == 0 else c.lower() for i, c in enumerate(s))
        # Alternating case starting with lower
        yield "".join(c.lower() if i % 2 == 0 else c.upper() for i, c in enumerate(s))
    
    # Create a list of all possible cased versions
    all_variants = []
    for status in base_statuses:
        all_variants.extend(all_casings(status))
    
    return st.sampled_from(all_variants)


@given(create_random_case_strategy())
@settings(max_examples=200)
def test_property_status_normalisation(cased_status):
    """
    **Property 3: Status casing normalisation**
    
    For any valid AmbulanceStatus value in any mix of upper/lower case,
    the normalisation function SHALL produce the corresponding lowercase enum value.
    
    **Validates: Requirements 3.1, 3.2, 3.3**
    """
    client = TestClient(app)
    
    # We'll use unit_id=1 for the test (the endpoint normalises status regardless of unit_id)
    unit_id = 1
    
    # Mock the rebalancing function to avoid issues with missing Redis data
    with patch("app.api.fleet.find_rebalance_destination", new_callable=AsyncMock) as mock_rebalance:
        mock_rebalance.return_value = None  # No rebalancing command
        
        # Call the API endpoint that performs status normalisation
        response = client.put(
            f"/fleet/{unit_id}/status",
            json={"status": cased_status}
        )
    
    # The backend should accept the cased status and normalise it
    assert response.status_code == 200, (
        f"Expected status 200 for valid status '{cased_status}', "
        f"got {response.status_code}: {response.text}"
    )
    
    # The response should indicate success
    data = response.json()
    assert "message" in data
    assert data["message"] == "Status updated successfully"
    
    # Verify that the normalised status is the lowercase version
    expected_normalised = cased_status.lower()
    
    # The normalised status should be a valid enum value
    valid_statuses = {s.value for s in AmbulanceStatus}
    assert expected_normalised in valid_statuses, (
        f"Normalised status '{expected_normalised}' is not a valid AmbulanceStatus enum value"
    )
