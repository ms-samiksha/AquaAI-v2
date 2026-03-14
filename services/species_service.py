"""
Species identification service for marine ecosystem intelligence.
Handles fish, coral, and all marine creatures with health/disease assessment.
"""

import base64
import json
import logging
import re
from typing import Dict, Any, Optional

import boto3

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MODEL_ID = "arn:aws:bedrock:us-east-1:452031276818:application-inference-profile/8wimphg6jjvj"
CONFIDENCE_THRESHOLD = 0.7

client = boto3.client("bedrock-runtime", region_name="us-east-1")


def _call_nova(prompt: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    """Call Nova with optional image, return parsed JSON."""
    content = [{"text": prompt}]
    if image_bytes:
        content.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": image_bytes}
            }
        })

    response = client.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": content}],
        inferenceConfig={"maxTokens": 1000, "temperature": 0.2},
    )

    output_text = response["output"]["message"]["content"][0]["text"]
    logger.info("[Species] Raw response: %s", output_text[:500])

    cleaned = output_text.strip().replace("```json", "").replace("```", "").strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


def identify_species(
    visual_features: Dict[str, Any],
    analysis_type: str = "fish",
    image_bytes: Optional[bytes] = None,
) -> Dict[str, Any]:

    logger.info("[Species] Identifying species (mode=%s)", analysis_type)

    if analysis_type == "coral":
        return _identify_coral(visual_features, image_bytes)
    elif analysis_type == "marine":
        return _identify_marine(visual_features, image_bytes)
    else:
        return _identify_fish(visual_features, image_bytes)


# ─────────────────────────────────────────────
# FISH
# ─────────────────────────────────────────────
def _identify_fish(visual_features: Dict[str, Any], image_bytes: Optional[bytes]) -> Dict[str, Any]:
    health_obs = visual_features.get("health_observations", [])
    features_str = json.dumps(visual_features, indent=2)

    prompt = f"""You are a marine ichthyologist specializing in reef fish identification.

Visual features extracted from the image:
{features_str}

Health observations: {health_obs}

STEP 1: Identify fish species using body shape, color, pattern, and markings.
STEP 2: Provide ecological information.
STEP 3: Assess health — describe any fin damage, parasites, lesions, discoloration, or wounds observed.

Return STRICT JSON only (no markdown):
{{
  "species_name": "Genus species",
  "confidence": 0.85,
  "common_names": ["name1", "name2"],
  "description": "2-3 vivid sentences about appearance and biology",
  "natural_habitat": "specific habitat with depth range and geography",
  "ecosystem_role": "specific ecological role on the reef",
  "rarity_level": "common/uncommon/rare with context sentence",
  "reef_dependency": "high/medium/low with explanation",
  "health_status": "healthy/stressed/injured/diseased/unknown",
  "observed_conditions": ["condition1", "condition2"],
  "health_notes": "Detailed description of any observed health issues — fin damage, parasites like ich (white spots), lesions, wounds, discoloration, or 'No abnormalities observed' if healthy.",
  "interesting_facts": [
    "Specific fact 1 about this species",
    "Specific fact 2 about diet or hunting",
    "Specific fact 3 about reproduction",
    "Specific fact 4 about defense or behavior",
    "Specific fact 5 about conservation status"
  ]
}}"""

    try:
        res = _call_nova(prompt, image_bytes)
    except Exception as e:
        logger.error("[Species] Fish ID failed: %s", str(e))
        return _fish_fallback()

    return _finalize(res, "fish")


# ─────────────────────────────────────────────
# MARINE (lobsters, crabs, turtles, octopus…)
# ─────────────────────────────────────────────
def _identify_marine(visual_features: Dict[str, Any], image_bytes: Optional[bytes]) -> Dict[str, Any]:
    features_str    = json.dumps(visual_features, indent=2)
    creature_class  = visual_features.get("creature_class", "unknown")
    appendages      = visual_features.get("appendages", "")
    notable         = visual_features.get("notable_features", "")
    health_obs      = visual_features.get("health_observations", [])

    prompt = f"""You are a marine biologist with deep expertise in ALL ocean creatures — crustaceans, fish, mollusks, echinoderms, cephalopods, marine reptiles, and mammals.

Visual analysis from image:
{features_str}

Creature class detected: {creature_class}
Notable features: {notable}
Appendages/structures: {appendages}
Health observations from vision analysis: {health_obs}

STEP 1: Identify this creature to species level. Use ALL visual clues — shell shape, claw structure, antennae, body segments, color, size.
STEP 2: Provide ecological and biological information.
STEP 3: HEALTH ASSESSMENT — this is critical. Based on health_observations:
  - Describe barnacle coverage in detail (location, density, if heavy infestation)
  - Describe any missing or damaged claws/limbs
  - Describe any wounds, lesions, or unusual growths
  - Describe any parasites or shell damage
  - State whether these conditions are normal (e.g. barnacles on lobsters are common) or concerning
  - Say 'No abnormalities observed' only if truly nothing is detected

Return STRICT JSON only (no markdown):
{{
  "species_name": "Genus species",
  "confidence": 0.85,
  "common_names": ["common name 1", "common name 2"],
  "description": "2-3 vivid sentences about appearance, behavior and biology",
  "natural_habitat": "specific habitat — depth, geography, substrate type",
  "ecosystem_role": "specific ecological role — diet, predators, ecosystem impact",
  "rarity_level": "common/uncommon/rare with context sentence",
  "reef_dependency": "high/medium/low with explanation",
  "health_status": "healthy/stressed/injured/parasitized/unknown",
  "observed_conditions": [
    "Each specific condition as a separate string — e.g. 'Heavy barnacle coverage on carapace', 'Missing left claw', 'Wound on abdomen'"
  ],
  "health_notes": "Detailed paragraph about the creature's health. Describe barnacle coverage (location, density), missing limbs, wounds, parasites, shell damage. Note whether conditions are typical or concerning. Be specific.",
  "interesting_facts": [
    "Surprising or specific fact 1",
    "Specific fact 2 about diet or hunting",
    "Specific fact 3 about reproduction or lifespan",
    "Specific fact 4 about defense or unique adaptations",
    "Specific fact 5 about conservation or human interaction"
  ]
}}"""

    try:
        res = _call_nova(prompt, image_bytes)
        res["analysis_type"] = "marine"
    except Exception as e:
        logger.error("[Species] Marine ID failed: %s", str(e))
        return _marine_fallback()

    return _finalize(res, "marine")


# ─────────────────────────────────────────────
# CORAL
# ─────────────────────────────────────────────
def _identify_coral(visual_features: Dict[str, Any], image_bytes: Optional[bytes]) -> Dict[str, Any]:
    bleaching_severity  = visual_features.get("bleaching_severity", "none")
    bleaching_pct       = visual_features.get("bleaching_percentage", 0)
    stress_signs        = visual_features.get("visual_stress_signs", [])
    possible_bleaching  = visual_features.get("possible_bleaching", False)
    features_str        = json.dumps(visual_features, indent=2)

    # Derive danger level directly — Nova cannot override
    if bleaching_severity == "severe" or bleaching_pct > 40:
        derived_danger = "critical"
        derived_health = "severe bleaching"
    elif bleaching_severity == "moderate" or bleaching_pct > 15:
        derived_danger = "high"
        derived_health = "bleaching"
    elif bleaching_severity == "mild" or bleaching_pct > 0 or possible_bleaching:
        derived_danger = "moderate"
        derived_health = "partial bleaching"
    elif len(stress_signs) > 0:
        derived_danger = "low"
        derived_health = "stressed"
    else:
        derived_danger = "healthy"
        derived_health = "healthy"

    logger.info("[Species] Coral health=%s danger=%s", derived_health, derived_danger)

    prompt = f"""You are a coral taxonomist and reef ecologist.

Visual features:
{features_str}

IMPORTANT — use these EXACT pre-assessed values, do NOT change them:
  coral_health_status = "{derived_health}"
  danger_level        = "{derived_danger}"

STEP 1: Identify coral species (genus and species).
STEP 2: Describe appearance and reef ecological role.
STEP 3: List most likely bleaching/stress causes.
STEP 4: Suggest specific conservation and recovery actions.
STEP 5: Add interesting ecological facts.

Return STRICT JSON only (no markdown):
{{
  "species_name": "Genus species",
  "confidence": 0.80,
  "common_names": ["name1", "name2"],
  "description": "2-3 vivid sentences about coral appearance and biology",
  "reef_role": "specific ecological role on the reef",
  "coral_health_status": "{derived_health}",
  "danger_level": "{derived_danger}",
  "possible_bleaching_causes": ["cause1", "cause2", "cause3"],
  "recommended_actions": ["action1", "action2", "action3"],
  "health_notes": "Describe observed health: bleaching extent, algae overgrowth, tissue damage, disease signs, physical damage.",
  "interesting_facts": [
    "Specific fact 1",
    "Specific fact 2",
    "Specific fact 3",
    "Specific fact 4",
    "Specific fact 5"
  ],
  "natural_habitat": "specific reef zone, depth, geography",
  "ecosystem_role": "role in broader marine ecosystem",
  "rarity_level": "common/uncommon/rare"
}}"""

    try:
        res = _call_nova(prompt, image_bytes)
    except Exception as e:
        logger.error("[Species] Coral ID failed: %s", str(e))
        res = {"species_name": "Unknown Coral", "confidence": 0.0, "common_names": [], "interesting_facts": []}

    # Force derived values — Nova cannot override
    res["coral_health_status"] = derived_health
    res["danger_level"]        = derived_danger

    return _finalize(res, "coral")


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _finalize(res: Dict[str, Any], analysis_type: str) -> Dict[str, Any]:
    """Ensure all required fields exist and types are correct."""

    # Confidence
    try:
        res["confidence"] = float(res.get("confidence", 0.0))
    except Exception:
        res["confidence"] = 0.0

    # List fields
    list_fields = [
        "common_names", "possible_bleaching_causes", "recommended_actions",
        "interesting_facts", "observed_conditions", "health_observations",
        "visual_stress_signs", "possible_stress_signs", "distinctive_traits",
    ]
    for f in list_fields:
        if not isinstance(res.get(f), list):
            res[f] = []

    # String fields with defaults
    string_defaults = {
        "species_name": "Unknown",
        "description": "",
        "health_status": "unknown",
        "health_notes": "",
    }
    for f, default in string_defaults.items():
        if not res.get(f):
            res[f] = default

    # Low confidence fallback
    if res["confidence"] < CONFIDENCE_THRESHOLD:
        logger.warning("[Species] Low confidence %.2f for %s", res["confidence"], res.get("species_name"))

    return res


def _fish_fallback() -> Dict[str, Any]:
    return {
        "species_name": "Unknown Fish",
        "confidence": 0.0,
        "common_names": [],
        "description": "Unable to identify species.",
        "natural_habitat": "unknown",
        "ecosystem_role": "unknown",
        "rarity_level": "unknown",
        "reef_dependency": "unknown",
        "health_status": "unknown",
        "observed_conditions": [],
        "health_notes": "",
        "interesting_facts": [],
    }


def _marine_fallback() -> Dict[str, Any]:
    return {
        "species_name": "Unknown Marine Creature",
        "confidence": 0.0,
        "common_names": [],
        "description": "Unable to identify species.",
        "natural_habitat": "unknown",
        "ecosystem_role": "unknown",
        "rarity_level": "unknown",
        "reef_dependency": "unknown",
        "health_status": "unknown",
        "observed_conditions": [],
        "health_notes": "",
        "interesting_facts": [],
        "analysis_type": "marine",
    }