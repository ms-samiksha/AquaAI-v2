"""
FastAPI backend for AquaAI v2 - Marine Intelligence Assistant
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from routers import analyze, chat, search, sightings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AquaAI v2 - Marine Intelligence",
    description="AI-powered marine species identification, reef health monitoring, and invasive species tracking",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        "https://aqua-ai-v2.vercel.app",
        "https://aquaai-v2.vercel.app",
        "https://aquai-ai.vercel.app",
        "https://aquaiai.onrender.com",
        "https://aquaai-v2-backend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(search.router)
app.include_router(sightings.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AquaAI v2"}

@app.get("/")
async def root():
    return {
        "service": "AquaAI v2 - Marine Intelligence Assistant",
        "version": "2.0.0",
        "endpoints": {
            "POST /analyze":              "Upload marine creature image for analysis",
            "POST /search":               "Search species by name",
            "POST /chat":                 "Chat about identified species",
            "GET  /sightings/{species}":  "Get sightings for a species",
            "POST /sightings/report":     "Report a new invasive species sighting",
            "GET  /sightings/all/map":    "Get all sightings for globe",
            "GET  /health":               "Health check",
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")