import httpx
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

async def get_google_maps_eta(
    src_lat: float, src_lng: float, dst_lat: float, dst_lng: float
) -> int:
    return 300

async def get_osrm_eta(
    src_lat: float, src_lng: float, dst_lat: float, dst_lng: float
) -> int:
    return 300