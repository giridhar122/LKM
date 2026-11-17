from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    id: int
    ticket_id: int
    recipient_phone: str
    channel: str
    template_name: Optional[str] = None
    message_content: str
    status: str
    error_message: Optional[str] = None
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)
