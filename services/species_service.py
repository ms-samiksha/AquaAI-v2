"""
Species identification service — AquaAI v2
Includes full coral bleaching intelligence system.
"""

import json
import logging
import re
from typing import Dict, Any, Optional

import boto3

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MODEL_ID             = "arn:aws:bedrock:us-east-1:452031276818:application-inference-profile/8wimphg6jjvj"
CONFIDENCE_THRESHOLD = 0.5

client = boto3.client("bedrock-runtime", region_name="us-east-1")

# ── Monitoring organizations by region/species ────────────────────────────────
MONITORING_ORGS = {
    "great_barrier_reef": {
        "org":     "Great Barrier Reef Marine Park Authority (GBRMPA)",
        "contact": "info@gbrmpa.gov.au",
        "url":     "https://www.gbrmpa.gov.au",
    },
    "caribbean": {
        "org":     "NOAA Coral Reef Conservation Program",
        "contact": "coralreef@noaa.gov",
        "url":     "https://coralreef.noaa.gov",
    },
    "indo_pacific": {
        "org":     "Reef Check Foundation",
        "contact": "info@reefcheck.org",
        "url":     "https://www.reefcheck.org",
    },
    "default": {
        "org":     "International Coral Reef Initiative (ICRI)",
        "contact": "icri@icriforum.org",
        "url":     "https://icriforum.org",
    },
}

# ── Bleaching stage definitions ───────────────────────────────────────────────
BLEACHING_STAGES = {
    0: {
        "name":                 "Healthy",
        "color":                "#22c55e",
        "recovery_probability": 95,
        "weeks_to_irreversible": None,
        "temperature_stress":   "low",
    },
    1: {
        "name":                 "Pale / Early Stress",
        "color":                "#eab308",
        "recovery_probability": 82,
        "weeks_to_irreversible": 12,
        "temperature_stress":   "moderate",
    },
    2: {
        "name":                 "Partial Bleaching",
        "color":                "#f97316",
        "recovery_probability": 55,
        "weeks_to_irreversible": 6,
        "temperature_stress":   "high",
    },
    3: {
        "name":                 "Severe Bleaching",
        "color":                "#ef4444",
        "recovery_probability": 20,
        "weeks_to_irreversible": 3,
        "temperature_stress":   "critical",
    },
    4: {
        "name":                 "Mortality / Dead Reef",
        "color":                "#6b2737",
        "recovery_probability": 3,
        "weeks_to_irreversible": 0,
        "temperature_stress":   "critical",
    },
}

# ── Immediate action recommendations by stage ─────────────────────────────────
IMMEDIATE_ACTIONS = {
    0: [
        "Continue regular monitoring — photograph monthly",
        "Report healthy reef status to Reef Check database",
        "Avoid anchoring near coral structures",
    ],
    1: [
        "Photograph and GPS-tag the location immediately",
        "Report to local marine park authority within 24 hours",
        "Reduce nearby boat traffic and diver contact",
        "Check local sea surface temperature data",
    ],
    2: [
        "Report to NOAA Coral Reef Watch immediately",
        "Collect water temperature readings at reef site",
        "Contact nearest marine research station",
        "Restrict all recreational diving in the area",
        "Document with video for scientific record",
    ],
    3: [
        "Emergency report to GBRMPA or ICRI hotline",
        "Deploy emergency cooling shade structures if possible",
        "Collect tissue samples for laboratory analysis",
        "Alert all nearby dive operators to avoid the area",
        "Submit coordinates to CoralWatch global database",
        "Contact: reef.emergency@gbrmpa.gov.au",
    ],
    4: [
        "Document GPS coordinates for scientific mortality record",
        "Submit full photo documentation to ICRI database",
        "Focus conservation resources on adjacent healthy sections",
        "Report to national marine authority for policy action",
        "Join coral restoration programs to rebuild affected areas",
    ],
}

# ── Ocean health score calculator ─────────────────────────────────────────────
def _calculate_ocean_health_score(
    analysis_type:   str,
    danger_level:    str,
    health_status:   str,
    bleaching_stage: int,
    rarity_level:    str,
) -> int:
    score = 100

    # Coral penalties
    if analysis_type == "coral":
        stage_penalty = { 0: 0, 1: 20, 2: 40, 3: 65, 4: 85 }
        score -= stage_penalty.get(bleaching_stage, 0)

    # Danger level penalties
    danger_penalty = { "critical": 50, "high": 35, "moderate": 20, "low": 5, "healthy": 0 }
    score -= danger_penalty.get(danger_level, 0)

    # Health status penalties
    health_penalty = {
        "diseased":    30,
        "parasitized": 25,
        "injured":     15,
        "stressed":    10,
        "healthy":     0,
        "unknown":     5,
    }
    score -= health_penalty.get(health_status, 0)

    # Rarity bonus/penalty
    if rarity_level:
        rl = rarity_level.lower()
        if "critically endangered" in rl: score -= 20
        elif "endangered" in rl:          score -= 12
        elif "rare" in rl:                score -= 6

    return max(0, min(100, score))


def _detect_format(image_bytes: bytes) -> str:
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n': return "png"
    if image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP': return "webp"
    if image_bytes[:3] == b'GIF': return "gif"
    return "jpeg"


def _call_nova(prompt: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    content = []
    if image_bytes:
        fmt = _detect_format(image_bytes)
        content.append({"image": {"format": fmt, "source": {"bytes": image_bytes}}})
    content.append({"text": prompt})

    response = client.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": content}],
        inferenceConfig={"maxTokens": 1500, "temperature": 0.1},
    )

    output_text = response["output"]["message"]["content"][0]["text"]
    logger.info("[Species] Raw response: %s", output_text[:600])

    cleaned = output_text.strip().replace("```json", "").replace("```", "").strip()
    match   = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


def identify_species(
    visual_features: Dict[str, Any],
    analysis_type:   str = "fish",
    image_bytes:     Optional[bytes] = None,
) -> Dict[str, Any]:
    logger.info("[Species] Identifying species (mode=%s)", analysis_type)
    if analysis_type == "coral":
        return _identify_coral(visual_features, image_bytes)
    elif analysis_type == "marine":
        return _identify_marine(visual_features, image_bytes)
    else:
        return _identify_fish(visual_features, image_bytes)


# ─────────────────────────────────────────────────────────────────────────────
# FISH
# ─────────────────────────────────────────────────────────────────────────────
def _identify_fish(
    visual_features: Dict[str, Any],
    image_bytes:     Optional[bytes],
) -> Dict[str, Any]:
    health_obs   = visual_features.get("health_observations", [])
    features_str = json.dumps(visual_features, indent=2)

    prompt = f"""You are a world-class marine biologist and fish taxonomist.

Look at this fish image. Identify the EXACT species based on what you actually see.

Visual features already extracted:
{features_str}

Health observations: {health_obs}

IDENTIFICATION INSTRUCTIONS:
- Look at the image directly — do NOT force a species if it does not match
- If red wounds or injuries exist, factor into health assessment
- If freshwater species (cichlid, tilapia) say so
- NEVER force Blue Tang unless image actually matches

Common species guide (use ONLY if image matches):
- Vivid blue disc + black marking + yellow tail = Blue Tang (Paracanthurus hepatus)
- Orange/white vertical stripes = Clownfish (Amphiprion ocellaris)
- Fan spines + red/white stripes = Lionfish (Pterois volitans)
- Flat disc + bold black/white stripes + long snout = Butterflyfish
- Iridescent scales + beak = Parrotfish

IUCN STATUS — include one of:
Least Concern / Near Threatened / Vulnerable / Endangered / Critically Endangered / Data Deficient

Return STRICT JSON only (no markdown):
{{
  "species_name": "Genus species",
  "confidence": 0.85,
  "common_names": ["Primary name", "Alternative"],
  "description": "2-3 sentences about this species",
  "natural_habitat": "specific habitat, depth, geography",
  "ecosystem_role": "specific ecological role",
  "rarity_level": "common/uncommon/rare with context",
  "reef_dependency": "high/medium/low with explanation",
  "health_status": "healthy/stressed/injured/diseased/unknown",
  "observed_conditions": ["condition 1", "condition 2"],
  "health_notes": "Detailed health — red patches, wounds, fin damage, parasites, or No abnormalities",
  "iucn_status": "Least Concern",
  "population_trend": "stable",
  "interesting_facts": [
    "Fact 1 specific to this species",
    "Fact 2 about diet or behavior",
    "Fact 3 about reproduction",
    "Fact 4 about defense or adaptation",
    "Fact 5 about conservation"
  ]
}}"""

    try:
        res = _call_nova(prompt, image_bytes)
    except Exception as e:
        logger.error("[Species] Fish ID failed: %s", str(e))
        return _fish_fallback()

    # Ocean health score for fish
    res["ocean_health_score"] = _calculate_ocean_health_score(
        analysis_type   = "fish",
        danger_level    = res.get("danger_level", "low"),
        health_status   = res.get("health_status", "healthy"),
        bleaching_stage = 0,
        rarity_level    = res.get("rarity_level", ""),
    )

    return _finalize(res, "fish")


# ─────────────────────────────────────────────────────────────────────────────
# MARINE
# ─────────────────────────────────────────────────────────────────────────────
def _identify_marine(
    visual_features: Dict[str, Any],
    image_bytes:     Optional[bytes],
) -> Dict[str, Any]:
    features_str   = json.dumps(visual_features, indent=2)
    creature_class = visual_features.get("creature_class", "unknown")
    appendages     = visual_features.get("appendages", "")
    notable        = visual_features.get("notable_features", "")
    health_obs     = visual_features.get("health_observations", [])

    prompt = f"""You are a marine biologist expert in ALL ocean creatures.

Look at this image carefully. Identify the exact species.

Extracted visual features:
{features_str}

Creature class: {creature_class}
Notable features: {notable}
Appendages: {appendages}
Health observations: {health_obs}

IUCN STATUS — include one of:
Least Concern / Near Threatened / Vulnerable / Endangered / Critically Endangered / Data Deficient

Return STRICT JSON only (no markdown):
{{
  "species_name": "Genus species",
  "confidence": 0.85,
  "common_names": ["Primary", "Alternative"],
  "description": "2-3 vivid sentences",
  "natural_habitat": "specific depth, geography, substrate",
  "ecosystem_role": "diet, predators, function",
  "rarity_level": "common/uncommon/rare with context",
  "reef_dependency": "high/medium/low with explanation",
  "health_status": "healthy/stressed/injured/parasitized/unknown",
  "observed_conditions": ["condition 1"],
  "health_notes": "Detailed health paragraph",
  "iucn_status": "Least Concern",
  "population_trend": "stable",
  "interesting_facts": ["fact1", "fact2", "fact3", "fact4", "fact5"]
}}"""

    try:
        res = _call_nova(prompt, image_bytes)
        res["analysis_type"] = "marine"
    except Exception as e:
        logger.error("[Species] Marine ID failed: %s", str(e))
        return _marine_fallback()

    res["ocean_health_score"] = _calculate_ocean_health_score(
        analysis_type   = "marine",
        danger_level    = res.get("danger_level", "low"),
        health_status   = res.get("health_status", "healthy"),
        bleaching_stage = 0,
        rarity_level    = res.get("rarity_level", ""),
    )

    return _finalize(res, "marine")


# ─────────────────────────────────────────────────────────────────────────────
# CORAL — full bleaching intelligence
# ─────────────────────────────────────────────────────────────────────────────
def _identify_coral(
    visual_features: Dict[str, Any],
    image_bytes:     Optional[bytes],
) -> Dict[str, Any]:
    bleaching_severity = visual_features.get("bleaching_severity", "none")
    bleaching_pct      = visual_features.get("bleaching_percentage", 0) or 0
    stress_signs       = visual_features.get("visual_stress_signs", [])
    possible_bleaching = visual_features.get("possible_bleaching", False)
    features_str       = json.dumps(visual_features, indent=2)

    # ── Derive bleaching stage ────────────────────────────────────────────────
    if bleaching_pct > 75 or bleaching_severity == "severe":
        stage = 4
    elif bleaching_pct > 50 or (bleaching_severity == "severe" and bleaching_pct > 30):
        stage = 3
    elif bleaching_pct > 25 or bleaching_severity == "moderate":
        stage = 2
    elif bleaching_pct > 0 or bleaching_severity == "mild" or possible_bleaching:
        stage = 1
    elif len(stress_signs) > 0:
        stage = 1
    else:
        stage = 0

    stage_info = BLEACHING_STAGES[stage]

    # ── Map stage → existing fields ───────────────────────────────────────────
    stage_to_health = {
        0: "healthy",
        1: "partial bleaching",
        2: "bleaching",
        3: "severe bleaching",
        4: "severe bleaching",
    }
    stage_to_danger = {
        0: "healthy",
        1: "moderate",
        2: "high",
        3: "critical",
        4: "critical",
    }

    derived_health = stage_to_health[stage]
    derived_danger = stage_to_danger[stage]

    # ── Pick monitoring org ───────────────────────────────────────────────────
    habitat_str = str(visual_features.get("coral_structure", "")).lower()
    if "great barrier" in habitat_str or "australia" in habitat_str:
        org_key = "great_barrier_reef"
    elif any(w in habitat_str for w in ["caribbean", "atlantic", "florida"]):
        org_key = "caribbean"
    elif any(w in habitat_str for w in ["pacific", "indo", "red sea"]):
        org_key = "indo_pacific"
    else:
        org_key = "default"

    org = MONITORING_ORGS[org_key]

    logger.info(
        "[Species] Coral stage=%d health=%s danger=%s pct=%s",
        stage, derived_health, derived_danger, bleaching_pct,
    )

    prompt = f"""You are a coral reef taxonomist and bleaching expert.

Identify this coral species from the image.

Visual features:
{features_str}

PRE-ASSESSED values — use EXACTLY as given:
  coral_health_status = "{derived_health}"
  danger_level        = "{derived_danger}"

Identify the coral species. Provide causes, actions, and facts.

Return STRICT JSON only (no markdown):
{{
  "species_name": "Genus species",
  "confidence": 0.80,
  "common_names": ["name1"],
  "description": "2-3 vivid sentences about this coral",
  "reef_role": "specific ecological role in the reef",
  "coral_health_status": "{derived_health}",
  "danger_level": "{derived_danger}",
  "possible_bleaching_causes": [
    "Specific cause 1 — e.g. Sea surface temperature elevated 2C above baseline",
    "Specific cause 2",
    "Specific cause 3"
  ],
  "recommended_actions": [
    "Specific scientific action 1",
    "Specific scientific action 2",
    "Specific scientific action 3"
  ],
  "health_notes": "Detailed description of bleaching extent, algae coverage, tissue damage visible in image.",
  "natural_habitat": "reef zone, depth, geography",
  "ecosystem_role": "role in marine ecosystem",
  "rarity_level": "common/uncommon/rare",
  "iucn_status": "Least Concern or relevant IUCN status",
  "population_trend": "decreasing",
  "interesting_facts": ["fact1", "fact2", "fact3", "fact4", "fact5"]
}}"""

    try:
        res = _call_nova(prompt, image_bytes)
    except Exception as e:
        logger.error("[Species] Coral ID failed: %s", str(e))
        res = {
            "species_name": "Unknown Coral", "confidence": 0.0,
            "common_names": [], "interesting_facts": [],
            "possible_bleaching_causes": [], "recommended_actions": [],
        }

    # ── Force all derived fields — Nova cannot override ───────────────────────
    res["coral_health_status"]   = derived_health
    res["danger_level"]          = derived_danger
    res["bleaching_stage"]       = stage
    res["bleaching_percentage"]  = bleaching_pct if bleaching_pct else (stage * 20)
    res["recovery_probability"]  = stage_info["recovery_probability"]
    res["weeks_to_irreversible"] = stage_info["weeks_to_irreversible"]
    res["temperature_stress"]    = stage_info["temperature_stress"]
    res["monitoring_org"]        = org["org"]
    res["monitoring_contact"]    = org["contact"]
    res["monitoring_url"]        = org["url"]
    res["immediate_actions"]     = IMMEDIATE_ACTIONS[stage]
    res["ocean_health_score"]    = _calculate_ocean_health_score(
        analysis_type   = "coral",
        danger_level    = derived_danger,
        health_status   = derived_health,
        bleaching_stage = stage,
        rarity_level    = res.get("rarity_level", ""),
    )

    return _finalize(res, "coral")


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _finalize(res: Dict[str, Any], analysis_type: str) -> Dict[str, Any]:
    try:
        res["confidence"] = float(res.get("confidence", 0.0))
    except Exception:
        res["confidence"] = 0.0

    list_fields = [
        "common_names", "possible_bleaching_causes", "recommended_actions",
        "interesting_facts", "observed_conditions", "health_observations",
        "visual_stress_signs", "possible_stress_signs", "distinctive_traits",
        "immediate_actions",
    ]
    for f in list_fields:
        if not isinstance(res.get(f), list):
            res[f] = []

    string_defaults = {
        "species_name":  "Unknown",
        "description":   "",
        "health_status": "unknown",
        "health_notes":  "",
    }
    for f, default in string_defaults.items():
        if not res.get(f):
            res[f] = default

    if res["confidence"] < CONFIDENCE_THRESHOLD:
        logger.warning("[Species] Low confidence %.2f for %s",
                       res["confidence"], res.get("species_name"))
    return res


def _fish_fallback() -> Dict[str, Any]:
    return {
        "species_name": "Unknown Fish", "confidence": 0.0,
        "common_names": [], "description": "Unable to identify species.",
        "natural_habitat": "unknown", "ecosystem_role": "unknown",
        "rarity_level": "unknown", "reef_dependency": "unknown",
        "health_status": "unknown", "observed_conditions": [],
        "health_notes": "", "interesting_facts": [],
        "iucn_status": "Data Deficient", "population_trend": "unknown",
    }


def _marine_fallback() -> Dict[str, Any]:
    return {
        "species_name": "Unknown Marine Creature", "confidence": 0.0,
        "common_names": [], "description": "Unable to identify species.",
        "natural_habitat": "unknown", "ecosystem_role": "unknown",
        "rarity_level": "unknown", "reef_dependency": "unknown",
        "health_status": "unknown", "observed_conditions": [],
        "health_notes": "", "interesting_facts": [],
        "analysis_type": "marine", "iucn_status": "Data Deficient",
        "population_trend": "unknown",
    }