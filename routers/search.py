"""Search router: handles /search endpoint for text-based species lookup."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from services.nova_client import call_nova_with_json

logger = logging.getLogger(__name__)
router = APIRouter()


class SearchRequest(BaseModel):
    species_name: str
    analysis_type: str = "fish"


@router.post("/search")
async def search_species(req: SearchRequest):
    analysis_type = req.analysis_type.lower().strip()
    species_name  = req.species_name.strip()

    if not species_name:
        raise HTTPException(status_code=400, detail="species_name is required")
    if analysis_type not in ["fish", "coral"]:
        raise HTTPException(status_code=400, detail="analysis_type must be 'fish' or 'coral'")

    if analysis_type == "coral":
        prompt = f"""
You are a coral reef ecologist and taxonomist with deep expertise.

Provide rich, detailed information about the coral: "{species_name}"

Be specific. Write full sentences. Do NOT use vague answers.

Return STRICT JSON only (no markdown):
{{
  "species_name": "{species_name}",
  "confidence": 0.95,
  "common_names": ["name1", "name2"],
  "description": "2-3 vivid sentences about appearance, structure, and biology",
  "reef_role": "specific and detailed ecological role on coral reefs",
  "coral_health_status": "healthy",
  "sensitivity_level": "2-3 sentences about how sensitive this coral is to temperature, bleaching, pollution, ocean acidification",
  "possible_bleaching_causes": ["specific cause 1", "specific cause 2", "specific cause 3"],
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "interesting_facts": [
    "Specific fact 1 about this coral species",
    "Specific fact 2 about reproduction or growth",
    "Specific fact 3 about its role in the ecosystem",
    "Specific fact 4 about its history or discovery",
    "Specific fact 5 about threats or conservation"
  ],
  "natural_habitat": "specific depth range, geography, reef zone where this coral is found",
  "ecosystem_role": "detailed role in broader marine ecosystem",
  "rarity_level": "common/uncommon/rare with context"
}}
"""
    else:
        prompt = f"""
You are a marine ichthyologist with deep expertise in reef fish.

Provide rich, detailed information about: "{species_name}"

Be specific and vivid. Write full sentences. Do NOT use vague answers.

Return STRICT JSON only (no markdown):
{{
  "species_name": "{species_name}",
  "confidence": 0.95,
  "common_names": ["name1", "name2"],
  "description": "2-3 vivid sentences describing appearance, behavior and biology",
  "natural_habitat": "specific habitat — exact depth range, reef zones, geographic range",
  "ecosystem_role": "specific role — prey, predator relationships, reef impact",
  "rarity_level": "common/uncommon/rare with a sentence of context",
  "reef_dependency": "high/medium/low — explain the exact relationship with coral reefs",
  "interesting_facts": [
    "Specific surprising fact 1",
    "Specific fact 2 about diet or hunting",
    "Specific fact 3 about reproduction",
    "Specific fact 4 about defense or venom",
    "Specific fact 5 about conservation status",
    "Specific fact 6 about behavior or social structure"
  ]
}}
"""

    try:
        res = call_nova_with_json(prompt)
        res["analysis_type"] = analysis_type
        res["image_url"] = ""
        res["s3_key"] = ""

        return {
            "image_url": "",
            "s3_key": "",
            "analysis_type": analysis_type,
            "visual_features": { "organism_type": analysis_type },
            "species": res,
        }

    except Exception as e:
        logger.error("Search failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Species search failed")