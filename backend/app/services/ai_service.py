import json
import logging
import os
import re
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings
from app.schemas.ai import AIExtractionOutput

logger = logging.getLogger(__name__)

# Fallback department keyword maps for robust offline classification or fallback
DEPARTMENT_RULES = {
    "Maintenance": {
        "keywords": ["machine breakdown", "hydraulic breakdown", "motor breakdown", "stopped working", "equipment failure", "power failure", "hydraulic leak", "machine", "breakdown", "motor", "leak", "oil", "bearing", "conveyor", "pump", "not working", "maintenance", "repair", "tool wear", "cylinder", "pneumatic", "hydraulic"],
        "default_priority": "Critical"
    },
    "Purchase": {
        "keywords": ["raw material", "raw materials", "material shortage", "materials not arrived", "purchase order", "po", "supplier", "vendor", "procurement", "consignment", "delivery delayed", "order delayed", "not arrived"],
        "default_priority": "High"
    },
    "Stores": {
        "keywords": ["stores", "store", "tool shortage", "inventory shortage", "stock", "warehouse", "bin", "ppe", "safety goggles", "gloves", "cutting tool", "spare part"],
        "default_priority": "Medium"
    },
    "Quality": {
        "keywords": ["quality inspection", "quality rejected", "batch rejected", "rejection", "tolerance defect", "dimension", "defect", "scratch", "burr", "crack", "qc", "qa", "rejected"],
        "default_priority": "High"
    },
    "Production": {
        "keywords": ["production line", "assembly line", "shift target", "line stopped", "production delayed", "operator absent", "halted", "bottleneck", "output target", "production"],
        "default_priority": "High"
    },
    "HR": {
        "keywords": ["worker", "workers", "staff", "manpower", "night shift", "attendance", "absenteeism", "overtime", "salary", "hiring", "canteen"],
        "default_priority": "Medium"
    },
    "Accounts": {
        "keywords": ["bill", "invoice", "payment", "accounts", "gst", "voucher", "expense", "vendor payment", "reimbursement"],
        "default_priority": "Low"
    },
    "IT": {
        "keywords": ["network", "wifi", "internet", "computer", "printer", "erp", "software", "server", "ip address", "lan", "system down", "portal"],
        "default_priority": "Medium"
    }
}


class AIService:
    """Industrial AI intelligence service using Google Gemini API with robust fallbacks."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = settings.GEMINI_MODEL
        self.client = None
        self._init_gemini_client()

    def _init_gemini_client(self):
        """Initializes the official Google Gemini client if API key is configured."""
        if not self.api_key:
            logger.info("GEMINI_API_KEY not configured. Rule-based industrial fallback parser will be active.")
            return

        try:
            # Use google.genai or google.generativeai
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel(self.model_name)
            logger.info(f"Initialized Google Gemini model: {self.model_name}")
        except Exception as e:
            logger.warning(f"Failed to initialize Google Gemini client: {e}. Falling back to rule-based engine.")

    def analyze_issue_message(
        self, message_text: str, custom_dept_rules: Optional[Dict[str, Any]] = None
    ) -> Tuple[AIExtractionOutput, str, str]:
        """
        Parses an incoming employee message and extracts structured issue data.
        Returns: (AIExtractionOutput, raw_prompt, raw_response)
        """
        if self.client and self.api_key:
            try:
                return self._call_gemini_api(message_text, custom_dept_rules)
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}. Falling back to deterministic rule engine.")

        # Fallback to deterministic industrial classification engine
        extraction, prompt, resp = self._rule_based_extraction(message_text)
        return extraction, prompt, resp

    def _call_gemini_api(
        self, message_text: str, custom_dept_rules: Optional[Dict[str, Any]] = None
    ) -> Tuple[AIExtractionOutput, str, str]:
        """Sends a zero-shot structured extraction prompt to Gemini API."""
        prompt = f"""
You are the AI Operations Intelligence Engine for LKM SmartDesk, an industrial manufacturing plant.
Your mission is to extract structured operational ticket data from the following employee message reported from the shop floor or office.

Employee Message:
\"\"\"{message_text}\"\"\"

Strict Guidelines:
1. Return ONLY a single valid JSON object adhering strictly to the schema below. No markdown fences, no explanatory text.
2. Valid departments: Production, Maintenance, Quality, Purchase, Stores, HR, Accounts, IT.
   - If the message lacks sufficient evidence for a department, set department to null and flag_for_review to true.
3. Valid priorities: Critical, High, Medium, Low.
   - Critical: Production stoppage, safety hazards, major machine breakdown (e.g. "stopped working", "halted").
   - High: Quality batch rejection, pending raw material shortage impacting schedule, imminent line stop.
   - Medium: Routine maintenance, tooling shortage in stores, office network down, shift staffing request.
   - Low: Informational, paperwork, minor expense, non-urgent inquiry.
4. Extract specific asset (e.g., "Machine 04", "CNC-01", "Compressor B") and location (e.g., "Production Floor", "Bay 2", "Tool Room"). If not stated, set to null. NEVER invent.
5. confidence_score: A float between 0.0 and 1.0. If message is vague (e.g. "Something is wrong", "Problem here"), confidence must be < 0.60 and flag_for_review must be true.

JSON Schema:
{{
  "issue_title": "Concise 3-7 word title",
  "description": "Clear professional summary of the issue and operational impact",
  "category": "Equipment Failure | Material Shortage | Quality Defect | Tooling Shortage | Network Issue | HR/Staffing | General",
  "department": "Production | Maintenance | Quality | Purchase | Stores | HR | Accounts | IT | null",
  "priority": "Critical | High | Medium | Low",
  "asset": "string or null",
  "location": "string or null",
  "confidence_score": 0.95,
  "flag_for_review": false,
  "reasoning": "Brief explanation of classification rationale"
}}
"""
        response = self.client.generate_content(
            prompt,
            generation_config={"temperature": 0.1, "response_mime_type": "application/json"}
        )

        raw_response = response.text.strip()
        # Clean any accidental code block backticks
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        data = json.loads(cleaned)

        extraction = AIExtractionOutput(**data)
        
        # Enforce confidence threshold
        if extraction.confidence_score < settings.AI_CONFIDENCE_THRESHOLD:
            extraction.flag_for_review = True

        return extraction, prompt, raw_response

    def _rule_based_extraction(self, message_text: str) -> Tuple[AIExtractionOutput, str, str]:
        """
        Industrial deterministic classification engine used for offline testing,
        simulation mode, or when Gemini API is offline.
        """
        text_lower = message_text.lower().strip()
        matched_dept = None
        highest_score = 0
        detected_priority = "Medium"

        # Department matching
        for dept_name, rules in DEPARTMENT_RULES.items():
            score = 0
            for kw in rules["keywords"]:
                if kw in text_lower:
                    weight = 3 if " " in kw else 1
                    score += weight
            if score > highest_score:
                highest_score = score
                matched_dept = dept_name
                detected_priority = rules["default_priority"]

        # Asset extraction (regex for Machine XX, CNC XX, Line XX, etc.)
        asset_match = re.search(r"(machine\s*\d+|cnc[-\s]*\d+|press[-\s]*\d+|conveyor[-\s]*\d+|boiler[-\s]*\d+|motor[-\s]*\d+)", text_lower)
        asset = asset_match.group(0).title() if asset_match else None

        # Location extraction
        location_match = re.search(r"(production floor|shop floor|tool room|bay\s*\d+|line\s*\d+|warehouse|stores|office|canteen)", text_lower)
        location = location_match.group(0).title() if location_match else ("Production Floor" if "production" in text_lower or asset else None)

        # Priority adjustments based on urgency words
        if any(w in text_lower for w in ["completely halted", "stopped working", "breakdown", "emergency", "danger", "fire", "smoke", "halted"]):
            detected_priority = "Critical"
        elif any(w in text_lower for w in ["rejected", "shortage", "delayed", "not arrived", "urgent"]):
            if detected_priority != "Critical":
                detected_priority = "High"

        # Category mapping
        if matched_dept == "Maintenance" or asset:
            category = "Equipment Failure"
        elif matched_dept == "Quality":
            category = "Quality Defect"
        elif matched_dept in ["Purchase", "Stores"]:
            category = "Material Shortage"
        elif matched_dept == "IT":
            category = "Network Issue"
        elif matched_dept == "HR":
            category = "HR/Staffing"
        else:
            category = "General Operational Issue"

        # Check for ambiguity / short message
        is_ambiguous = highest_score == 0 or len(text_lower.split()) < 3
        confidence = 0.95 if highest_score >= 2 else (0.80 if highest_score == 1 else 0.40)
        
        if is_ambiguous:
            matched_dept = None
            detected_priority = "Medium"
            flag_for_review = True
            confidence = 0.35
            title = "Unclassified Operational Issue"
        else:
            flag_for_review = confidence < settings.AI_CONFIDENCE_THRESHOLD
            if asset:
                title = f"{asset} Issue Reported"
            elif matched_dept:
                title = f"{matched_dept} Problem Reported"
            else:
                title = "Shop Floor Issue Reported"

        extraction = AIExtractionOutput(
            issue_title=title,
            description=message_text,
            category=category,
            department=matched_dept,
            priority=detected_priority,
            asset=asset,
            location=location,
            confidence_score=confidence,
            flag_for_review=flag_for_review,
            reasoning=f"Matched {highest_score} keywords for {matched_dept}" if matched_dept else "Insufficient operational evidence in message"
        )

        prompt = f"[LOCAL_RULE_ENGINE] Evaluated: {message_text}"
        raw_response = extraction.model_dump_json()

        return extraction, prompt, raw_response


ai_service = AIService()
