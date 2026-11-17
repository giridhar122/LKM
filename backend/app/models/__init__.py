from app.database.base import Base
from app.models.department import Department
from app.models.user import User
from app.models.employee import Employee
from app.models.message import Message
from app.models.ticket import Ticket
from app.models.ticket_history import TicketHistory
from app.models.attachment import Attachment
from app.models.notification import Notification
from app.models.ai_classification import AIClassification

__all__ = [
    "Base",
    "Department",
    "User",
    "Employee",
    "Message",
    "Ticket",
    "TicketHistory",
    "Attachment",
    "Notification",
    "AIClassification",
]
