from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TicketHistoryOut(BaseModel):
    id: int
    ticket_id: int
    changed_by_user_id: Optional[int] = None
    changed_by_name: Optional[str] = None
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketBase(BaseModel):
    issue_title: str
    description: str
    category: Optional[str] = "General"
    department_id: Optional[int] = None
    priority: str = "Medium"  # Critical, High, Medium, Low
    asset: Optional[str] = None
    location: Optional[str] = None
    employee_phone: str
    source_platform: str = "WHATSAPP"


class TicketCreate(TicketBase):
    reported_by_employee_id: Optional[int] = None
    original_message_id: Optional[int] = None
    confidence_score: float = 1.0
    needs_review: bool = False


class TicketUpdate(BaseModel):
    issue_title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    department_id: Optional[int] = None
    priority: Optional[str] = None
    asset: Optional[str] = None
    location: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    status: Optional[str] = None  # Open, Acknowledged, In Progress, On Hold, Resolved, Closed
    resolution_notes: Optional[str] = None
    internal_comment: Optional[str] = None  # Added to history


class TicketOut(TicketBase):
    id: int
    ticket_number: str
    status: str
    reported_by_employee_id: Optional[int] = None
    reported_by_name: Optional[str] = None
    reported_by_code: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    original_message_id: Optional[int] = None
    original_message_text: Optional[str] = None
    resolution_notes: Optional[str] = None
    confidence_score: float
    needs_review: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    history: Optional[List[TicketHistoryOut]] = []

    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    items: List[TicketOut]
    total: int
    page: int
    size: int
    total_pages: int
