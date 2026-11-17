from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseMessagingProvider(ABC):
    """
    Abstract Base Class for messaging channels (WhatsApp, Telegram, etc.).
    Decouples core ticket workflows from specific messaging vendor APIs.
    """

    @abstractmethod
    def send_text_message(self, recipient_phone: str, text: str) -> Dict[str, Any]:
        """Sends a plain text message to the recipient."""
        pass

    @abstractmethod
    def send_ticket_confirmation(self, recipient_phone: str, ticket: Any) -> Dict[str, Any]:
        """Sends the initial ticket creation confirmation."""
        pass

    @abstractmethod
    def send_status_update(self, recipient_phone: str, ticket: Any, old_status: str) -> Dict[str, Any]:
        """Sends a ticket status transition update notification."""
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """Validates webhook authenticity (e.g. HMAC SHA256)."""
        pass

    @abstractmethod
    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extracts sender phone, message text, and message ID from incoming webhook payload."""
        pass
