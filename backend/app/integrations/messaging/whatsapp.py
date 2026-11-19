import hashlib
import hmac
import logging
import uuid
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.integrations.messaging.base import BaseMessagingProvider

logger = logging.getLogger(__name__)


class WhatsAppCloudProvider(BaseMessagingProvider):
    """
    Official Meta WhatsApp Business Cloud API Integration.
    Handles incoming webhook verification, payload parsing, and outbound Cloud API messaging.
    Includes an explicitly labelled Simulation Mode for offline or credential-free development.
    """

    def __init__(self):
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.verify_token = settings.WHATSAPP_VERIFY_TOKEN
        self.app_secret = settings.WHATSAPP_APP_SECRET
        self.api_version = settings.WHATSAPP_API_VERSION
        self.simulation_mode = settings.WHATSAPP_SIMULATION_MODE or not bool(self.access_token and self.phone_number_id)

    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """Verifies X-Hub-Signature-256 HMAC-SHA256 from Meta."""
        if self.simulation_mode or not self.app_secret:
            return True  # Bypass in dev/simulation mode if secret is not set

        if not signature_header or not signature_header.startswith("sha256="):
            logger.warning("Missing or malformed X-Hub-Signature-256 header")
            return False

        expected_sig = "sha256=" + hmac.new(
            self.app_secret.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature_header)

    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extracts sender phone, message text, and WhatsApp message ID from Meta or Green-API webhook format.
        """
        try:
            # 1. Green-API Format (Group & 1-to-1 messages)
            if "typeWebhook" in payload or "senderData" in payload:
                webhook_type = payload.get("typeWebhook")
                if webhook_type and webhook_type != "incomingMessageReceived":
                    return None  # Ignore delivery receipts, outgoing statuses, etc.

                sender_data = payload.get("senderData", {})
                message_data = payload.get("messageData", {})

                # Extract text
                msg_type = message_data.get("typeMessage", "")
                text = ""
                if msg_type == "textMessage":
                    text = message_data.get("textMessageData", {}).get("textMessage", "")
                elif msg_type == "extendedTextMessage":
                    text = message_data.get("extendedTextMessageData", {}).get("text", "")
                else:
                    text = f"[{msg_type.upper()} ATTACHMENT REPORTED]"

                if not text.strip():
                    return None

                # Extract sender phone
                raw_sender = sender_data.get("sender", "")  # e.g. "919876543210@c.us"
                sender_num = raw_sender.split("@")[0] if raw_sender else "9876543210"
                phone = f"+{sender_num}" if not sender_num.startswith("+") else sender_num

                msg_id = payload.get("idMessage") or f"green_{uuid.uuid4().hex[:14]}"
                chat_id = sender_data.get("chatId", "")
                sender_name = sender_data.get("senderName") or "Shop Floor Operator"

                logger.info(f"Green-API Webhook received from {phone} (Group/Chat: {chat_id}): '{text}'")

                return {
                    "provider_message_id": msg_id,
                    "sender_phone": phone,
                    "message_text": text,
                    "timestamp": payload.get("timestamp"),
                    "chat_id": chat_id,
                    "sender_name": sender_name,
                    "raw": payload
                }

            # 2. Meta Cloud API Format
            entries = payload.get("entry", [])
            if not entries:
                return None

            changes = entries[0].get("changes", [])
            if not changes:
                return None

            value = changes[0].get("value", {})
            messages = value.get("messages", [])
            if not messages:
                # May be a delivery status update
                return None

            msg = messages[0]
            msg_id = msg.get("id")
            sender = msg.get("from")
            msg_type = msg.get("type")

            if msg_type == "text":
                text = msg.get("text", {}).get("body", "")
            else:
                text = f"[{msg_type.upper()} ATTACHMENT REPORTED]"

            # Normalize sender phone (ensure E.164 + prefix)
            phone = f"+{sender}" if not sender.startswith("+") else sender

            return {
                "provider_message_id": msg_id,
                "sender_phone": phone,
                "message_text": text,
                "timestamp": msg.get("timestamp"),
                "raw": payload
            }
        except Exception as e:
            logger.error(f"Error parsing WhatsApp webhook payload: {e}")
            return None

    def send_text_message(self, recipient_phone: str, text: str) -> Dict[str, Any]:
        """Sends an outbound WhatsApp message via Meta Cloud API or Simulation Mode."""
        if self.simulation_mode:
            sim_id = f"sim_wamid_{uuid.uuid4().hex[:16]}"
            logger.info(
                f"[WHATSAPP SIMULATION MODE] To: {recipient_phone} | Msg ID: {sim_id}\n"
                f"--- Message Body ---\n{text}\n--------------------"
            )
            return {
                "provider_response_id": sim_id,
                "status": "SIMULATED",
                "simulated": True,
                "message_text": text,
                "note": "Delivered to local simulation log. WhatsApp credentials not configured."
            }

        url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        # Strip '+' for Meta recipient format
        to_number = recipient_phone.replace("+", "").replace(" ", "").replace("-", "")
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "text",
            "text": {"preview_url": False, "body": text}
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                msg_id = data.get("messages", [{}])[0].get("id", "unknown")
                return {
                    "provider_response_id": msg_id,
                    "status": "SENT",
                    "simulated": False,
                    "message_text": text
                }
        except Exception as e:
            logger.error(f"Failed to deliver WhatsApp message via Meta Cloud API: {e}")
            return {
                "provider_response_id": None,
                "status": "FAILED",
                "simulated": False,
                "message_text": text,
                "error": str(e)
            }

    def send_ticket_confirmation(self, recipient_phone: str, ticket: Any) -> Dict[str, Any]:
        """Sends structured confirmation back to the employee after ticket generation."""
        dept_name = ticket.department.name if ticket.department else "General Review"
        text = (
            f"Hello! Your issue has been successfully registered.\n\n"
            f"Ticket ID: {ticket.ticket_number}\n"
            f"Issue: {ticket.issue_title}\n"
            f"Department: {dept_name}\n"
            f"Priority: {ticket.priority}\n"
            f"Status: {ticket.status}\n\n"
            f"Our {dept_name.lower()} team has been notified.\n\n"
            f"Thank you for reporting this issue."
        )
        return self.send_text_message(recipient_phone, text)

    def send_status_update(self, recipient_phone: str, ticket: Any, old_status: str) -> Dict[str, Any]:
        """Dispatches status progression alert to the reporting employee."""
        dept_name = ticket.department.name if ticket.department else "Department"
        res_text = f"\nResolution: {ticket.resolution_notes}" if ticket.resolution_notes and ticket.status in ["Resolved", "Closed"] else ""
        text = (
            f"LKM SmartDesk Status Update\n\n"
            f"Ticket ID: {ticket.ticket_number}\n"
            f"Issue: {ticket.issue_title}\n"
            f"Status Changed: {old_status} -> {ticket.status}\n"
            f"Department: {dept_name}{res_text}\n\n"
            f"Thank you for your cooperation."
        )
        return self.send_text_message(recipient_phone, text)


whatsapp_provider = WhatsAppCloudProvider()
