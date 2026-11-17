import logging
from typing import Dict, Any, Optional
from app.integrations.messaging.base import BaseMessagingProvider

logger = logging.getLogger(__name__)


class TelegramProvider(BaseMessagingProvider):
    """
    Extensible Telegram Bot messaging provider.
    Demonstrates architectural readiness for Telegram without altering core ticket engine.
    """

    def __init__(self, bot_token: Optional[str] = None):
        self.bot_token = bot_token

    def send_text_message(self, recipient_phone: str, text: str) -> Dict[str, Any]:
        logger.info(f"[TELEGRAM PROVIDER] Prepared text message for {recipient_phone}")
        return {"provider_response_id": "tg_mock_id", "status": "QUEUED"}

    def send_ticket_confirmation(self, recipient_phone: str, ticket: Any) -> Dict[str, Any]:
        return self.send_text_message(recipient_phone, f"LKM SmartDesk: Ticket {ticket.ticket_number} created.")

    def send_status_update(self, recipient_phone: str, ticket: Any, old_status: str) -> Dict[str, Any]:
        return self.send_text_message(recipient_phone, f"LKM SmartDesk: Ticket {ticket.ticket_number} status is now {ticket.status}.")

    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        return True

    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return None
