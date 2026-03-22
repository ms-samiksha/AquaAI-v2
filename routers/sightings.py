"""
Sightings router — AquaAI v2
Handles invasive sightings + native habitat pins for the 3D globe.
"""

from fastapi import APIRouter, HTTPException
import logging
import boto3
import uuid
import os
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
import math

logger = logging.getLogger(__name__)
router = APIRouter()

dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))
table    = dynamodb.Table("aquaai-sightings")

# ── Research teams per location ───────────────────────────────────────────────
RESEARCH_TEAMS = {
    "Miami, Florida":           {"team": "NOAA Southeast Fisheries Science Center",         "contact": "sefsc.lionfish@noaa.gov",          "action": "Active removal program — 2,000+ fish removed since 2019",          "url": "https://www.fisheries.noaa.gov"},
    "Puerto Rico":              {"team": "REEF Volunteer Fish Survey Project",              "contact": "reef@reef.org",                    "action": "Monthly diver surveys and public removal events",                  "url": "https://www.reef.org"},
    "Bahamas":                  {"team": "BREEF — Bahamas Reef Environment Foundation",    "contact": "info@breef.org",                   "action": "Lionfish derby competitions + school education programs",          "url": "https://www.breef.org"},
    "Bermuda":                  {"team": "Bermuda Lionfish Task Force",                    "contact": "lionfish@bios.edu",                "action": "Quarterly culling dives + population monitoring",                  "url": "https://www.bios.edu"},
    "Antigua":                  {"team": "WWF Caribbean Marine Program",                   "contact": "caribbean@wwf.org",                "action": "Regional invasive species rapid response network",                 "url": "https://www.worldwildlife.org"},
    "Lake Ontario, Canada":     {"team": "DFO — Fisheries and Oceans Canada",             "contact": "info@dfo-mpo.gc.ca",               "action": "Great Lakes monitoring and early detection network",               "url": "https://www.dfo-mpo.gc.ca"},
    "Lake Michigan, Chicago":   {"team": "USGS Great Lakes Science Center",                "contact": "greatlakes@usgs.gov",              "action": "Acoustic tracking and population control experiments",             "url": "https://www.usgs.gov/centers/glsc"},
    "Minnesota, USA":           {"team": "Minnesota DNR Invasive Species Program",         "contact": "invasives@state.mn.us",            "action": "Watercraft inspection + public reporting program",                 "url": "https://www.dnr.state.mn.us"},
    "St. Louis, Missouri":      {"team": "USFWS Asian Carp Regional Coordinating Committee","contact": "asiancarp@fws.gov",              "action": "Electric barrier maintenance + commercial removal",                "url": "https://www.fws.gov"},
    "Chicago River, IL":        {"team": "Illinois DNR Aquatic Nuisance Species Program",  "contact": "ans@illinois.gov",                 "action": "Electric dispersal barriers + eDNA monitoring",                   "url": "https://www.dnr.illinois.gov"},
    "Maine, USA":               {"team": "Maine DMR — Green Crab Research Program",        "contact": "dmr.invasives@maine.gov",          "action": "Trapping trials + soft-shell market development",                 "url": "https://www.maine.gov/dmr"},
    "Seattle, Washington":      {"team": "Washington Sea Grant Marine Invasives",          "contact": "wsg@uw.edu",                       "action": "Port of entry monitoring + eradication trials",                   "url": "https://wsg.washington.edu"},
    "Sydney, Australia":        {"team": "NSW DPI Marine Invasives Unit",                  "contact": "marine.invasives@dpi.nsw.gov.au",  "action": "Harbour surveillance + rapid response protocol",                  "url": "https://www.dpi.nsw.gov.au"},
    "Great Barrier Reef, QLD":  {"team": "GBRMPA — Great Barrier Reef Marine Park Authority","contact": "info@gbrmpa.gov.au",            "action": "COTS injection program — 500,000+ starfish removed",              "url": "https://www.gbrmpa.gov.au"},
    "Whitsundays, Australia":   {"team": "Reef Restoration Foundation",                   "contact": "info@reefrestorationfoundation.org","action": "Coral nursery programs + COTS manual removal dives",             "url": "https://reefrestorationfoundation.org"},
    "Washington DC waterways":  {"team": "USGS Patuxent Wildlife Research Center",         "contact": "pwrc@usgs.gov",                    "action": "Population mapping + angler bounty program",                      "url": "https://www.usgs.gov/centers/pwrc"},
    "Baltimore, Maryland":      {"team": "Maryland DNR Invasive Catfish Task Force",       "contact": "invasivefish@dnr.maryland.gov",    "action": "Commercial harvest incentives + public education",                "url": "https://dnr.maryland.gov"},
}

# ── Hardcoded invasive sightings ──────────────────────────────────────────────
HARDCODED_SIGHTINGS = [
    {"species_name": "Pterois volitans",               "common_name": "Lionfish",                   "lat":  25.7617, "lng":  -80.1918, "location": "Miami, Florida",          "type": "hardcoded", "severity": "critical"},
    {"species_name": "Pterois volitans",               "common_name": "Lionfish",                   "lat":  18.4655, "lng":  -66.1057, "location": "Puerto Rico",             "type": "hardcoded", "severity": "critical"},
    {"species_name": "Pterois volitans",               "common_name": "Lionfish",                   "lat":  17.1274, "lng":  -61.8468, "location": "Antigua",                 "type": "hardcoded", "severity": "high"},
    {"species_name": "Pterois volitans",               "common_name": "Lionfish",                   "lat":  32.3078, "lng":  -64.7505, "location": "Bermuda",                 "type": "hardcoded", "severity": "high"},
    {"species_name": "Pterois volitans",               "common_name": "Lionfish",                   "lat":  23.4241, "lng":  -75.1221, "location": "Bahamas",                 "type": "hardcoded", "severity": "critical"},
    {"species_name": "Dreissena polymorpha",           "common_name": "Zebra Mussel",               "lat":  43.6532, "lng":  -79.3832, "location": "Lake Ontario, Canada",    "type": "hardcoded", "severity": "high"},
    {"species_name": "Dreissena polymorpha",           "common_name": "Zebra Mussel",               "lat":  41.8827, "lng":  -87.6233, "location": "Lake Michigan, Chicago",  "type": "hardcoded", "severity": "high"},
    {"species_name": "Dreissena polymorpha",           "common_name": "Zebra Mussel",               "lat":  44.9778, "lng":  -93.2650, "location": "Minnesota, USA",          "type": "hardcoded", "severity": "moderate"},
    {"species_name": "Hypophthalmichthys molitrix",    "common_name": "Silver Carp",                "lat":  38.6270, "lng":  -90.1994, "location": "St. Louis, Missouri",     "type": "hardcoded", "severity": "high"},
    {"species_name": "Hypophthalmichthys molitrix",    "common_name": "Silver Carp",                "lat":  41.8827, "lng":  -87.6233, "location": "Chicago River, IL",       "type": "hardcoded", "severity": "critical"},
    {"species_name": "Carcinus maenas",                "common_name": "European Green Crab",        "lat":  43.6532, "lng":  -70.2553, "location": "Maine, USA",              "type": "hardcoded", "severity": "high"},
    {"species_name": "Carcinus maenas",                "common_name": "European Green Crab",        "lat":  47.6062, "lng": -122.3321, "location": "Seattle, Washington",     "type": "hardcoded", "severity": "moderate"},
    {"species_name": "Carcinus maenas",                "common_name": "European Green Crab",        "lat": -33.8688, "lng":  151.2093, "location": "Sydney, Australia",       "type": "hardcoded", "severity": "high"},
    {"species_name": "Acanthaster planci",             "common_name": "Crown-of-Thorns Starfish",   "lat": -16.2900, "lng":  145.7210, "location": "Great Barrier Reef, QLD", "type": "hardcoded", "severity": "critical"},
    {"species_name": "Acanthaster planci",             "common_name": "Crown-of-Thorns Starfish",   "lat": -18.1490, "lng":  147.0690, "location": "Whitsundays, Australia",  "type": "hardcoded", "severity": "high"},
    {"species_name": "Channa argus",                   "common_name": "Northern Snakehead",         "lat":  38.9072, "lng":  -77.0369, "location": "Washington DC waterways", "type": "hardcoded", "severity": "high"},
    {"species_name": "Channa argus",                   "common_name": "Northern Snakehead",         "lat":  39.2904, "lng":  -76.6122, "location": "Baltimore, Maryland",     "type": "hardcoded", "severity": "moderate"},
]

# ── Native habitat pins (green) for non-invasive species ─────────────────────
NATIVE_HABITATS = {
    # Fish
    "paracanthurus hepatus": [
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Core natural habitat — abundant population"},
        {"location": "Coral Sea, Pacific",             "lat": -16.5000, "lng":  150.0000, "note": "Primary breeding grounds"},
        {"location": "Maldives, Indian Ocean",         "lat":   4.1755, "lng":   73.5093, "note": "High density reef population"},
        {"location": "Red Sea, Egypt",                 "lat":  27.2579, "lng":   33.8116, "note": "Well studied population — stable"},
        {"location": "Philippines, South China Sea",   "lat":  11.8031, "lng":  122.0000, "note": "Rich biodiversity zone"},
    ],
    "blue tang": [
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Core natural habitat"},
        {"location": "Maldives, Indian Ocean",         "lat":   4.1755, "lng":   73.5093, "note": "High density population"},
        {"location": "Red Sea, Egypt",                 "lat":  27.2579, "lng":   33.8116, "note": "Stable reef population"},
        {"location": "Philippines, South China Sea",   "lat":  11.8031, "lng":  122.0000, "note": "Rich biodiversity zone"},
    ],
    "amphiprion ocellaris": [
        {"location": "Andaman Sea, Thailand",          "lat":   9.5547, "lng":   98.5167, "note": "Native anemonefish habitat"},
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Core natural habitat"},
        {"location": "Philippines, South China Sea",   "lat":  11.8031, "lng":  122.0000, "note": "High density population"},
        {"location": "Indonesia, Banda Sea",           "lat":  -4.5228, "lng":  129.8942, "note": "Diverse reef ecosystem"},
    ],
    "clownfish": [
        {"location": "Andaman Sea, Thailand",          "lat":   9.5547, "lng":   98.5167, "note": "Native habitat"},
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Core habitat"},
        {"location": "Philippines, South China Sea",   "lat":  11.8031, "lng":  122.0000, "note": "Dense population"},
    ],
    "chelonia mydas": [
        {"location": "Hawaii, Pacific Ocean",          "lat":  21.3069, "lng": -157.8583, "note": "Nesting beach — protected"},
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Feeding grounds"},
        {"location": "Maldives, Indian Ocean",         "lat":   4.1755, "lng":   73.5093, "note": "Migration route"},
        {"location": "Costa Rica, Caribbean",          "lat":   9.7489, "lng":  -83.7534, "note": "Major nesting site — Tortuguero"},
        {"location": "Oman, Arabian Sea",              "lat":  21.4735, "lng":   55.9754, "note": "Ras Al Jinz nesting beach"},
    ],
    "green sea turtle": [
        {"location": "Hawaii, Pacific Ocean",          "lat":  21.3069, "lng": -157.8583, "note": "Nesting beach — protected"},
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Feeding grounds"},
        {"location": "Costa Rica, Caribbean",          "lat":   9.7489, "lng":  -83.7534, "note": "Major nesting site"},
    ],
    "hippocampus": [
        {"location": "Coral Triangle, Indonesia",      "lat":  -2.5000, "lng":  118.0000, "note": "Highest seahorse diversity globally"},
        {"location": "Mediterranean Sea, Greece",      "lat":  38.2749, "lng":   23.8243, "note": "Long-snout seahorse habitat"},
        {"location": "Sydney Harbour, Australia",      "lat": -33.8688, "lng":  151.2093, "note": "White's seahorse — critically endangered"},
    ],
    "seahorse": [
        {"location": "Coral Triangle, Indonesia",      "lat":  -2.5000, "lng":  118.0000, "note": "Highest seahorse diversity globally"},
        {"location": "Mediterranean Sea, Greece",      "lat":  38.2749, "lng":   23.8243, "note": "Native seahorse habitat"},
    ],
    # Coral species
    "acropora": [
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Largest Acropora reef system"},
        {"location": "Coral Triangle, Indonesia",      "lat":  -2.5000, "lng":  118.0000, "note": "Highest coral diversity"},
        {"location": "Red Sea, Egypt",                 "lat":  27.2579, "lng":   33.8116, "note": "Warm-adapted Acropora colonies"},
        {"location": "Maldives, Indian Ocean",         "lat":   4.1755, "lng":   73.5093, "note": "Protected atoll reef system"},
        {"location": "Hawaii, Pacific Ocean",          "lat":  21.3069, "lng": -157.8583, "note": "Shallow reef Acropora colonies"},
    ],
    "porites": [
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Massive Porites colonies — 500+ years old"},
        {"location": "Maldives, Indian Ocean",         "lat":   4.1755, "lng":   73.5093, "note": "Thriving Porites bommies"},
        {"location": "Red Sea, Egypt",                 "lat":  27.2579, "lng":   33.8116, "note": "Heat-tolerant Porites population"},
    ],
    "coral": [
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "World's largest reef system"},
        {"location": "Coral Triangle, Indonesia",      "lat":  -2.5000, "lng":  118.0000, "note": "Highest marine biodiversity on Earth"},
        {"location": "Red Sea, Egypt",                 "lat":  27.2579, "lng":   33.8116, "note": "Heat-resistant coral populations"},
        {"location": "Maldives, Indian Ocean",         "lat":   4.1755, "lng":   73.5093, "note": "Protected atoll ecosystems"},
        {"location": "Mesoamerican Reef, Caribbean",   "lat":  16.0000, "lng":  -88.0000, "note": "Second largest barrier reef"},
    ],
    # Marine life
    "panulirus": [
        {"location": "Florida Keys, USA",              "lat":  24.5551, "lng":  -81.7800, "note": "Spiny lobster — sustainable fishery"},
        {"location": "Caribbean Sea, Belize",          "lat":  17.2510, "lng":  -88.7590, "note": "Marine reserve population"},
        {"location": "Great Barrier Reef, Australia",  "lat": -18.2871, "lng":  147.6992, "note": "Tropical lobster habitat"},
    ],
    "spiny lobster": [
        {"location": "Florida Keys, USA",              "lat":  24.5551, "lng":  -81.7800, "note": "Native habitat — sustainable fishery"},
        {"location": "Caribbean Sea, Belize",          "lat":  17.2510, "lng":  -88.7590, "note": "Marine reserve population"},
    ],
    "homarus": [
        {"location": "Maine, USA",                     "lat":  44.3106, "lng":  -69.7795, "note": "American lobster — sustainable fishery"},
        {"location": "Nova Scotia, Canada",            "lat":  44.6819, "lng":  -63.7443, "note": "Largest lobster fishery in world"},
        {"location": "Cornwall, UK",                   "lat":  50.1109, "lng":   -5.5301, "note": "European lobster native range"},
    ],
    "octopus": [
        {"location": "Coral Triangle, Indonesia",      "lat":  -2.5000, "lng":  118.0000, "note": "Blue-ringed octopus habitat"},
        {"location": "Mediterranean Sea, Greece",      "lat":  38.2749, "lng":   23.8243, "note": "Common octopus — abundant"},
        {"location": "Pacific Northwest, USA",         "lat":  47.6062, "lng": -122.3321, "note": "Giant Pacific octopus habitat"},
    ],
}

# ── Conservation tips for non-invasive species ────────────────────────────────
CONSERVATION_TIPS = {
    "default": [
        "Avoid releasing aquarium fish or marine pets into the wild",
        "Report unusual species sightings to your local wildlife authority",
        "Support marine protected areas in your region",
        "Use reef-safe sunscreen when snorkeling or diving",
        "Join local beach cleanup events to protect marine habitats",
        "Reduce single-use plastics that end up in ocean habitats",
    ],
    "coral": [
        "Use reef-safe sunscreen — chemical sunscreens bleach coral",
        "Never touch or stand on coral reefs — even dead-looking coral may recover",
        "Support the Coral Restoration Foundation: coralrestoration.org",
        "Reduce your carbon footprint — ocean temperature rise is the #1 bleaching cause",
        "Report bleaching events to CoralWatch: coralwatch.org",
    ],
    "turtle": [
        "Keep beaches dark at night — lights disorient nesting sea turtles",
        "Never disturb nesting turtles or hatchlings on beaches",
        "Remove fishing hooks carefully — sea turtles often ingest them",
        "Support Sea Turtle Conservancy: conserveturtles.org",
        "Report injured turtles to local marine rescue immediately",
    ],
    "shark": [
        "Never purchase shark fin products — shark finning is driving mass extinction",
        "Support Shark Guardian: sharkguardian.org",
        "Report shark sightings with species ID to local marine authority",
        "Advocate for shark sanctuary legislation in your country",
    ],
}


def _get_conservation_tips(species_name: str, common_name: str) -> list:
    name = (species_name + " " + common_name).lower()
    if any(w in name for w in ["coral", "acropora", "porites", "montipora"]):
        return CONSERVATION_TIPS["coral"]
    if any(w in name for w in ["turtle", "chelonia", "caretta", "dermochelys"]):
        return CONSERVATION_TIPS["turtle"]
    if any(w in name for w in ["shark", "carcharhinus", "sphyrna"]):
        return CONSERVATION_TIPS["shark"]
    return CONSERVATION_TIPS["default"]


def _get_native_habitats(species_name: str, common_name: str) -> list:
    """Return native habitat green pins for a species."""
    name = (species_name + " " + common_name).lower()

    # Direct match first
    for key, habitats in NATIVE_HABITATS.items():
        if key in name:
            return [
                {**h, "type": "native_habitat", "severity": "native",
                 "species_name": species_name, "common_name": common_name}
                for h in habitats
            ]

    # Partial genus match
    genus = species_name.split()[0].lower() if " " in species_name else species_name.lower()
    for key, habitats in NATIVE_HABITATS.items():
        if genus in key or key in genus:
            return [
                {**h, "type": "native_habitat", "severity": "native",
                 "species_name": species_name, "common_name": common_name}
                for h in habitats
            ]

    # Generic coral fallback
    if any(w in name for w in ["coral", "reef", "acropora", "porites"]):
        return [
            {**h, "type": "native_habitat", "severity": "native",
             "species_name": species_name, "common_name": common_name}
            for h in NATIVE_HABITATS["coral"]
        ]

    return []


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R    = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a    = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


class SightingReport(BaseModel):
    species_name:  str
    common_name:   Optional[str] = ""
    lat:           float
    lng:           float
    location:      Optional[str] = "Unknown Location"
    notes:         Optional[str] = ""
    reported_by:   Optional[str] = "Anonymous"


@router.get("/sightings/{species_name}")
async def get_sightings(species_name: str):
    try:
        name_lower = species_name.lower()
        common_name_guess = ""

        # Match hardcoded invasive sightings
        hardcoded = [
            s for s in HARDCODED_SIGHTINGS
            if name_lower in s["species_name"].lower()
            or name_lower in s["common_name"].lower()
        ]

        # Add research team info
        for s in hardcoded:
            team = RESEARCH_TEAMS.get(s["location"], {})
            s["research_team"] = team.get("team",    "Local Marine Authority")
            s["team_contact"]  = team.get("contact", "Contact local wildlife authority")
            s["team_action"]   = team.get("action",  "Active monitoring in progress")
            s["team_url"]      = team.get("url",     "")
            if s.get("common_name"):
                common_name_guess = s["common_name"]

        # DynamoDB user sightings
        response       = table.scan()
        all_items      = response.get("Items", [])
        user_sightings = [
            item for item in all_items
            if name_lower in item.get("species_name", "").lower()
            or name_lower in item.get("common_name",  "").lower()
        ]

        formatted_user = []
        for item in user_sightings:
            formatted_user.append({
                "species_name":  item.get("species_name", ""),
                "common_name":   item.get("common_name",  ""),
                "lat":           float(item.get("lat", 0)),
                "lng":           float(item.get("lng", 0)),
                "location":      item.get("location",     "Unknown"),
                "type":          "user_reported",
                "severity":      "reported",
                "notes":         item.get("notes",        ""),
                "reported_by":   item.get("reported_by",  "Anonymous"),
                "timestamp":     item.get("timestamp",    ""),
                "research_team": "Community Report",
                "team_contact":  "",
                "team_action":   item.get("notes", "User submitted sighting"),
                "team_url":      "",
            })

        is_invasive = len(hardcoded) > 0

        # Native habitat pins for non-invasive species
        native_habitats = []
        if not is_invasive:
            native_habitats = _get_native_habitats(species_name, common_name_guess)

        # Conservation tips
        tips = []
        if not is_invasive:
            tips = _get_conservation_tips(species_name, common_name_guess)

        return {
            "species_name":       species_name,
            "hardcoded":          hardcoded,
            "user_reported":      formatted_user,
            "native_habitats":    native_habitats,
            "total":              len(hardcoded) + len(formatted_user),
            "is_invasive":        is_invasive,
            "conservation_tips":  tips,
        }

    except Exception as e:
        logger.error("Error fetching sightings: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch sightings")


@router.post("/sightings/report")
async def report_sighting(report: SightingReport):
    try:
        name_lower = report.species_name.lower()

        # Duplicate check within 50km
        hardcoded_nearby = [
            s for s in HARDCODED_SIGHTINGS
            if (name_lower in s["species_name"].lower() or name_lower in s["common_name"].lower())
            and haversine(report.lat, report.lng, s["lat"], s["lng"]) <= 50
        ]

        response  = table.scan()
        all_items = response.get("Items", [])
        db_nearby = [
            item for item in all_items
            if (name_lower in item.get("species_name", "").lower()
                or name_lower in item.get("common_name", "").lower())
            and haversine(report.lat, report.lng,
                          float(item.get("lat", 0)),
                          float(item.get("lng", 0))) <= 50
        ]

        nearby_all = hardcoded_nearby + db_nearby
        if nearby_all:
            closest = nearby_all[0]
            dist    = haversine(report.lat, report.lng,
                                float(closest["lat"]), float(closest["lng"]))
            return {
                "success":   False,
                "duplicate": True,
                "message":   f"A sighting already exists {dist:.0f}km from this location",
                "existing":  {
                    "location":    closest.get("location", "Unknown"),
                    "type":        closest.get("type",     "hardcoded"),
                    "severity":    closest.get("severity", ""),
                    "distance_km": round(dist, 1),
                },
            }

        # Save
        sighting_id = str(uuid.uuid4())
        timestamp   = datetime.now(timezone.utc).isoformat()

        table.put_item(Item={
            "sighting_id":  sighting_id,
            "species_name": report.species_name,
            "common_name":  report.common_name  or "",
            "lat":          str(report.lat),
            "lng":          str(report.lng),
            "location":     report.location     or "Unknown",
            "notes":        report.notes        or "",
            "reported_by":  report.reported_by  or "Anonymous",
            "timestamp":    timestamp,
            "severity":     "user_reported",
        })

        logger.info("Sighting saved: %s at (%s, %s)", report.species_name, report.lat, report.lng)

        return {
            "success":     True,
            "duplicate":   False,
            "sighting_id": sighting_id,
            "message":     f"Sighting of {report.species_name} reported successfully",
            "timestamp":   timestamp,
        }

    except Exception as e:
        logger.error("Error saving sighting: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to save sighting")


@router.get("/sightings/all/map")
async def get_all_sightings():
    try:
        response   = table.scan()
        user_items = response.get("Items", [])
        formatted  = [
            {
                "species_name": item.get("species_name", ""),
                "common_name":  item.get("common_name",  ""),
                "lat":          float(item.get("lat", 0)),
                "lng":          float(item.get("lng", 0)),
                "location":     item.get("location",     "Unknown"),
                "type":         "user_reported",
                "severity":     "reported",
                "notes":        item.get("notes",        ""),
                "reported_by":  item.get("reported_by",  "Anonymous"),
                "timestamp":    item.get("timestamp",    ""),
            }
            for item in user_items
        ]
        return {
            "hardcoded":     HARDCODED_SIGHTINGS,
            "user_reported": formatted,
            "total":         len(HARDCODED_SIGHTINGS) + len(formatted),
        }
    except Exception as e:
        logger.error("Error fetching all sightings: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch sightings")