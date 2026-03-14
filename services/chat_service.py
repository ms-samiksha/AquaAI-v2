"""
Chat service providing conversation logic for aquarium questions.
"""

import logging
from typing import List, Dict, Optional
from services.nova_client import call_nova

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def build_care_summary(care_guide: Optional[Dict[str, any]]) -> str:
    if not care_guide:
        return "No ecological summary available. Species may be unknown."

    parts = [
        f"Tank: {care_guide.get('tank_size_liters')}L ({care_guide.get('tank_size_gallons')}G) - {care_guide.get('tank_dimensions_cm')}",
        f"Water Type: {care_guide.get('category')}",
        f"Temperature: {care_guide.get('temperature_celsius')} / {care_guide.get('temperature_fahrenheit')}",
        f"pH: {care_guide.get('ph_range')}",
        f"Hardness: {care_guide.get('general_hardness')}",
        f"Feeding: {care_guide.get('feeding_schedule')} - {', '.join(care_guide.get('feeding_types', []))}",
        f"Difficulty: {care_guide.get('care_difficulty')}",
        f"Lifespan: ~{care_guide.get('average_lifespan_years')} years",
    ]

    return "\n".join(parts)


def chat_about_species(
    species_name: str,
    species_description: str,
    care_summary: str,
    user_message: str,
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Send chat message with species context. Returns Nova reply text.
    """

    if chat_history is None:
        chat_history = []

    system_prompt = (
        f"You are MarineAI, an expert in marine ecosystems and species ecology.\n\n"
        f"Species: {species_name}\n"
        f"Description: {species_description}\n\n"
        f"Context:\n{care_summary}\n\n"
        "Guidelines:\n"
        "- Answer questions about species ecology, reef interactions, and conservation.\n"
        "- If the user asks for operational or hazardous actions, be cautious and recommend contacting local authorities or researchers.\n"
        "- If species is unknown, explain limitations and provide general guidance for monitoring or reporting.\n"
        "Respond only with plain text, no markdown."
    )

    full_prompt = (
        system_prompt
        + "\n\nUser Question:\n"
        + user_message
    )

    logger.info("Sending chat message for species %s", species_name)

    reply = call_nova(full_prompt)

    return reply