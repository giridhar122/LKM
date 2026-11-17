from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    provider_message_id: str
    platform: str = "WHATSAPP"
    sender_phone: str
    recipient_phone: Optional[str] = None
    message_text: str
    raw_payload: Optional[Dict[str, Any]] = None
    direction: str = "INBOUND"
    status: str = "RECEIVED"


class MessageOut(BaseModel):
    id: int
    provider_message_id: str
    platform: str
    sender_phone: str
    message_text: str
    direction: str
    status: str
    received_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SimulateMessageRequest(BaseModel):
    sender_phone: str
    message_text: str
    employee_name: Optional[str] = None
