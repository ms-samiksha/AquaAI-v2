from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class VisualFeatures(BaseModel):
    organism_type: str
    # fish fields
    body_shape: Optional[str] = None
    dominant_color: Optional[str] = None
    pattern: Optional[str] = None
    distinctive_traits: Optional[List[str]] = []
    possible_stress_signs: Optional[List[str]] = []
    # coral fields
    coral_structure: Optional[str] = None
    branching_pattern: Optional[str] = None
    possible_bleaching: Optional[bool] = False
    bleaching_severity: Optional[str] = "none"
    bleaching_percentage: Optional[int] = 0
    visual_stress_signs: Optional[List[str]] = []
    # marine creature fields
    creature_class: Optional[str] = None
    appendages: Optional[str] = None
    size_estimate: Optional[str] = None
    notable_features: Optional[str] = None
    health_observations: Optional[List[str]] = []


class SpeciesResult(BaseModel):
    species_name: str
    confidence: float
    common_names: List[str] = []
    description: Optional[str] = ""
    # fish + marine shared
    natural_habitat: Optional[str] = None
    ecosystem_role: Optional[str] = None
    rarity_level: Optional[str] = None
    reef_dependency: Optional[str] = None
    # coral
    reef_role: Optional[str] = None
    coral_health_status: Optional[str] = None
    danger_level: Optional[str] = None
    sensitivity_level: Optional[str] = None
    possible_bleaching_causes: Optional[List[str]] = []
    recommended_actions: Optional[List[str]] = []
    # shared
    interesting_facts: Optional[List[str]] = []
    # health/disease — all types
    health_status: Optional[str] = None
    observed_conditions: Optional[List[str]] = []
    health_notes: Optional[str] = None


class AnalyzeResponse(BaseModel):
    image_url: str
    s3_key: str
    analysis_type: Optional[str] = "fish"
    visual_features: VisualFeatures
    species: SpeciesResult


class ChatRequest(BaseModel):
    species_name: str
    message: str
    session_id: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    reply: str
    species_context: str