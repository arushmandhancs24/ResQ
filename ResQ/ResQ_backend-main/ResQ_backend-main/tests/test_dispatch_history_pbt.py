import pytest
from hypothesis import given, settings, strategies as st
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, DispatchLog, Incident, Ambulance, IncidentStatus, AmbulanceStatus
from app.main import app
from app.db.session import get_db
from fastapi.testclient import TestClient

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed data
    # Create incidents
    for i in range(1, 10):
        inc = Incident(id=i, latitude=12.0, longitude=77.0, incident_type="medical", status=IncidentStatus.DISPATCHED)
        db.add(inc)
        
    # Create ambulances
    for i in range(1, 101):
        amb = Ambulance(id=i, vehicle_number=f"KA-01-{i}", latitude=12.0, longitude=77.0, status=AmbulanceStatus.AVAILABLE)
        db.add(amb)
        
    db.commit()

    # Create dispatch logs with mixed ambulance IDs
    import random
    random.seed(42) # Deterministic seeding
    for i in range(1, 200):
        amb_id = random.randint(1, 100)
        log = DispatchLog(
            incident_id=(i % 9) + 1,
            ambulance_id=amb_id,
            hospital_id=None,
            eta_seconds=300,
            alternatives_considered=10
        )
        db.add(log)
    db.commit()
    db.close()

# Initialize DB once for the tests
setup_db()

@settings(max_examples=100)
@given(ambulance_id=st.integers(min_value=1, max_value=100))
def test_dispatch_history_filter_correctness(ambulance_id):
    """
    Property 7: Dispatch history filter correctness — for any ambulance_id integer, 
    every record in the response array SHALL have ambulance_id equal to the filter value, 
    and len(logs) <= 50.
    """
    response = client.get(f"/dispatch/history?ambulance_id={ambulance_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 50
    
    for log in data:
        assert log["ambulance_id"] == ambulance_id
