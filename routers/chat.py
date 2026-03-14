"""Chat router: handles /chat endpoint."""

from fastapi import APIRouter, HTTPException
import logging
from schemas import ChatRequest, ChatResponse
from services.chat_service import chat_about_species

logger = logging.getLogger(__name__)
router = APIRouter()

# simple in-memory session store
chat_sessions: dict = {}


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):

    if not request.species_name or not request.message:
        raise HTTPException(
            status_code=400,
            detail="species_name and message are required"
        )

    logger.info("Chat request for species: %s", request.species_name)

    # Merge provided chat history + stored session history
    history = request.chat_history or []

    if request.session_id:
        existing = chat_sessions.get(request.session_id, [])
        history = existing + history

    # Define species context (THIS WAS MISSING BEFORE)
    care_summary = f"Conversation about marine species: {request.species_name}"

    # Call Nova chat service
    reply = chat_about_species(
        species_name=request.species_name,
        species_description="Species identified from marine analysis",
        care_summary=care_summary,
        user_message=request.message,
        chat_history=history,
    )

    # Update session history
    if request.session_id:
        updated = history + [
            {"role": "user", "content": request.message},
            {"role": "assistant", "content": reply},
        ]
        chat_sessions[request.session_id] = updated

    logger.info("Chat response generated")

    return ChatResponse(
        reply=reply,
        species_context=care_summary
    )