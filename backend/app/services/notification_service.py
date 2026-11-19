import logging
from sqlalchemy.orm import Session
from app.models.ticket import Ticket
from app.models.notification import Notification
from app.integrations.messaging.whatsapp import whatsapp_provider
from app.integrations.messaging.telegram import telegram_provider

logger = logging.getLogger(__name__)


class NotificationService:
    """Manages outbound employee notifications and stores delivery audit records across WhatsApp & Telegram."""

    def __init__(self, whatsapp=whatsapp_provider, telegram=telegram_provider):
        self.whatsapp = whatsapp
        self.telegram = telegram

    def _get_provider_and_channel(self, ticket: Ticket):
        if getattr(ticket, "source_platform", "").upper() == "TELEGRAM":
            return self.telegram, "TELEGRAM"
        return self.whatsapp, "WHATSAPP"

    def send_creation_confirmation(self, db: Session, ticket: Ticket) -> Notification:
        """Sends initial issue registration receipt via the originating channel."""
        provider, channel = self._get_provider_and_channel(ticket)
        result = provider.send_ticket_confirmation(ticket.employee_phone, ticket)
        dept_name = ticket.department.name if ticket.department else "Review"
        
        content = (
            f"Ticket ID: {ticket.ticket_number} | Issue: {ticket.issue_title} | "
            f"Department: {dept_name} | Priority: {ticket.priority} | Status: {ticket.status}"
        )

        notification = Notification(
            ticket_id=ticket.id,
            recipient_phone=ticket.employee_phone,
            channel=channel,
            template_name="ticket_confirmation",
            message_content=result.get("message_text", content),
            status=result.get("status", "SENT"),
            provider_response_id=result.get("provider_response_id"),
            error_message=result.get("error")
        )
        db.add(notification)
        db.commit()
        return notification

    def send_status_change_notification(
        self, db: Session, ticket: Ticket, old_status: str
    ) -> Notification:
        """Sends status update notification via the originating channel."""
        provider, channel = self._get_provider_and_channel(ticket)
        result = provider.send_status_update(ticket.employee_phone, ticket, old_status)
        
        content = (
            f"Ticket {ticket.ticket_number} updated: {old_status} -> {ticket.status}. "
            f"Notes: {ticket.resolution_notes or 'In review'}"
        )

        notification = Notification(
            ticket_id=ticket.id,
            recipient_phone=ticket.employee_phone,
            channel=channel,
            template_name="ticket_status_update",
            message_content=result.get("message_text", content),
            status=result.get("status", "SENT"),
            provider_response_id=result.get("provider_response_id"),
            error_message=result.get("error")
        )
        db.add(notification)
        db.commit()
        return notification


notification_service = NotificationService()
