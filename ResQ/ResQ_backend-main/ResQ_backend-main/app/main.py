import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import main_router
from app.api.mesh import mesh_router
from app.api.ws import ws_router
from app.core.rebalancing import rebalancing_task_loop
from app.core.logger import get_logger

logger = get_logger(__name__)

def parse_allowed_origins(raw: str) -> list[str]:
    if not raw:
        return []
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the Tier 2 rebalancing background loop
    task = asyncio.create_task(rebalancing_task_loop())
    yield
    # Shutdown: Cancel the task
    task.cancel()

app = FastAPI(
    title="ResQ Backend",
    description="built to move faster than tragedy",
    version="0.1.0 beta",
    lifespan=lifespan
)

allowed_origins = parse_allowed_origins(os.getenv("ALLOWED_ORIGINS", ""))
if not allowed_origins:
    allowed_origins = ["*"]

# CORS — allow the Expo/React Native frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "Message": "Welcome to ResQ backend",
        "version": "0.1.0 beta"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(main_router)
app.include_router(mesh_router)
app.include_router(ws_router)