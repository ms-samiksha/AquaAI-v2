"""
FastAPI backend for AquaAI - Marine Intelligence Assistant
Main application with /analyze and /chat endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from routers import analyze, chat
from schemas import AnalyzeResponse, ChatRequest, ChatResponse
from routers import analyze, chat, search   # add search


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AquaAI - Marine Intelligence",
    description="AI-powered fish identification and aquarium care assistant",
    version="1.0.0",
)

# include routers
app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(search.router)   

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AquaAI"}


@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "service": "AquaAI - Marine Intelligence Assistant",
        "version": "1.0.0",
        "endpoints": {
            "POST /analyze": "Upload fish image for analysis",
            "POST /chat": "Chat about identified fish",
            "GET /health": "Health check",
            "GET /docs": "Swagger UI documentation",
            "GET /redoc": "ReDoc documentation",
        },
        "demo": "Upload a fish image to /analyze endpoint",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
