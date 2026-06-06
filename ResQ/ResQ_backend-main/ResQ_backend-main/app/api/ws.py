from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import manager

ws_router = APIRouter(tags=["WebSocket"])

@ws_router.websocket("/ws/dispatch")
async def dispatch_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for dispatch notifications and real-time updates.
    All clients (Operator Panel, Staff App, User App) connect here to receive:
    - dispatch messages when incidents are assigned
    - STATUS_UPDATE messages when ambulance status changes
    - LOCATION_UPDATE messages when ambulance location changes
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop; clients may send pings but we don't process them
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
