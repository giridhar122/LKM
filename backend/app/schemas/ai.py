from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AIExtractionOutput(BaseModel):
    """Structured output expected from Google Gemini API."""
    issue_title: str = Field(description="Concise 3-7 word title of the reported operational issue")
    description: str = Field(description="Clear, professional summary of the problem and its impact")
    category: str = Field(description="Classification category e.g. Equipment Failure, Material Shortage, Quality Defect, Tooling Shortage, Network Issue, HR/Staffing, General")
    department: Optional[str] = Field(
        default=None,
        description="Assigned department: Production, Maintenance, Quality, Purchase, Stores, HR, Accounts, IT. Must be null if uncertain.",
    )
    priority: str = Field(
        default="Medium",
        description="Assessed priority: Critical, High, Medium, Low",
    )
    asset: Optional[str] = Field(default=None, description="Specific machine, tool, or equipment mentioned, or null")
    location: Optional[str] = Field(default=None, description="Shop floor area, line, department location, or null")
    confidence_score: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0 representing classification certainty",
    )
    flag_for_review: bool = Field(
        default=False,
        description="True if the message is ambiguous, lacks evidence, or confidence is below 0.75",
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="Brief explanation of why this department and priority were chosen",
    )


class AIClassificationOut(BaseModel):
    id: int
    ticket_id: Optional[int] = None
    message_id: int
    model_name: str
    extracted_json: dict
    confidence_score: float
    suggested_department: Optional[str] = None
    suggested_priority: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
