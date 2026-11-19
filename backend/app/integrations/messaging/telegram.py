import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.integrations.messaging.base import BaseMessagingProvider

logger = logging.getLogger(__name__)


class TelegramProvider(BaseMessagingProvider):
    """
    Production-grade Telegram Bot messaging provider.
    Connects to Telegram Bot API (https://api.telegram.org) for real-time
    shop floor incident reporting via 1-to-1 chats and factory shift groups.
    """

    def __init__(self, bot_token: Optional[str] = None):
        self._bot_token = bot_token

    @property
    def bot_token(self) -> str:
        return self._bot_token or settings.TELEGRAM_BOT_TOKEN or ""

    @property
    def api_base(self) -> str:
        t = self.bot_token
        return f"https://api.telegram.org/bot{t}" if t else ""

    def is_configured(self) -> bool:
        return bool(self.bot_token and len(self.bot_token.strip()) > 10)

    def get_me(self) -> Dict[str, Any]:
        """Validates token and returns Telegram bot profile info."""
        if not self.is_configured():
            return {"ok": False, "error": "Telegram bot token is not configured in .env"}
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.api_base}/getMe")
                return res.json()
        except Exception as e:
            logger.error(f"Error checking Telegram getMe: {e}")
            return {"ok": False, "error": str(e)}

    def send_text_message(self, recipient_phone: str, text: str, parse_mode: str = "HTML") -> Dict[str, Any]:
        """
        Sends an outbound message to a Telegram chat or group.
        recipient_phone can be a numeric chat ID or 'tg:<chat_id>'.
        """
        chat_id = recipient_phone.replace("tg:", "").strip()
        if not chat_id:
            logger.warning("[TELEGRAM] Cannot send message: empty chat_id")
            return {"status": "FAILED", "error": "Empty chat_id"}

        if not self.is_configured():
            logger.info(
                f"[TELEGRAM SIMULATION MODE] Chat ID: {chat_id}\n"
                f"--- Message Body ---\n{text}\n--------------------"
            )
            return {
                "provider_response_id": f"tg_sim_{chat_id}",
                "status": "SIMULATED",
                "message_text": text,
                "note": "Delivered to local simulation log. Telegram token not configured in .env."
            }

        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(
                    f"{self.api_base}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": parse_mode,
                        "disable_web_page_preview": True
                    }
                )
                data = res.json()
                if data.get("ok"):
                    msg_id = data.get("result", {}).get("message_id")
                    logger.info(f"[TELEGRAM] Outbound message delivered to chat {chat_id} (msg_id={msg_id})")
                    return {
                        "provider_response_id": str(msg_id),
                        "status": "SENT",
                        "message_text": text
                    }
                else:
                    err_desc = data.get("description", "Unknown Telegram error")
                    logger.error(f"[TELEGRAM] Delivery failed to chat {chat_id}: {err_desc}")
                    return {
                        "provider_response_id": None,
                        "status": "FAILED",
                        "error": err_desc
                    }
        except Exception as e:
            logger.error(f"[TELEGRAM] HTTP connection error sending to {chat_id}: {e}")
            return {"status": "FAILED", "error": str(e)}

    def send_ticket_confirmation(self, recipient_phone: str, ticket: Any) -> Dict[str, Any]:
        """Formats and sends the incident registration confirmation card."""
        dept_name = ticket.department.name if getattr(ticket, "department", None) else "Review Queue"
        priority_emoji = "🔴" if ticket.priority == "Critical" else ("🟠" if ticket.priority == "High" else "🟡")
        
        message_html = (
            f"🛠️ <b>LKM SmartDesk — Incident Registered</b>\n\n"
            f"📋 <b>Ticket ID:</b> <code>{ticket.ticket_number}</code>\n"
            f"🏷️ <b>Issue:</b> {ticket.issue_title}\n"
            f"🏢 <b>Department:</b> {dept_name}\n"
            f"⚡ <b>Priority:</b> {priority_emoji} {ticket.priority}\n"
            f"📊 <b>Status:</b> <b>{ticket.status}</b>\n"
        )
        if getattr(ticket, "asset", None):
            message_html += f"⚙️ <b>Asset:</b> {ticket.asset}\n"
        if getattr(ticket, "location", None):
            message_html += f"📍 <b>Location:</b> {ticket.location}\n"

        message_html += (
            f"\n<i>Our plant team has been notified. You will receive updates as the issue progresses.</i>"
        )
        return self.send_text_message(recipient_phone, message_html, parse_mode="HTML")

    def send_status_update(self, recipient_phone: str, ticket: Any, old_status: str) -> Dict[str, Any]:
        """Sends real-time ticket status transition alert."""
        dept_name = ticket.department.name if getattr(ticket, "department", None) else "Operations"
        status_emoji = "✅" if ticket.status == "Resolved" else "🔄"

        message_html = (
            f"{status_emoji} <b>LKM SmartDesk — Status Updated</b>\n\n"
            f"📋 <b>Ticket ID:</b> <code>{ticket.ticket_number}</code>\n"
            f"🏢 <b>Department:</b> {dept_name}\n"
            f"🔄 <b>Status:</b> <s>{old_status}</s> ➔ <b>{ticket.status}</b>\n"
        )
        if getattr(ticket, "resolution_notes", None):
            message_html += f"\n📝 <b>Resolution Notes:</b>\n<i>{ticket.resolution_notes}</i>\n"

        return self.send_text_message(recipient_phone, message_html, parse_mode="HTML")

    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        # Telegram uses secret_token header verification if configured
        return True

    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parses a Telegram Update object into a normalized message record.
        Handles both 1-to-1 private messages and group/supergroup chats.
        """
        try:
            message = payload.get("message") or payload.get("channel_post") or payload.get("edited_message")
            if not message:
                return None

            text = message.get("text") or message.get("caption") or ""
            if not text.strip():
                return None

            chat = message.get("chat", {})
            sender = message.get("from", {})
            chat_id = str(chat.get("id"))
            chat_type = chat.get("type", "private")  # private, group, supergroup
            chat_title = chat.get("title") or "1-to-1 Chat"

            first_name = sender.get("first_name", "")
            last_name = sender.get("last_name", "")
            full_name = f"{first_name} {last_name}".strip() or sender.get("username", "Telegram User")
            username = sender.get("username")
            username_tag = f"@{username}" if username else f"ID:{sender.get('id')}"

            update_id = payload.get("update_id", 0)
            msg_id = message.get("message_id", 0)

            # Ignore /start bot command greetings
            if text.strip() == "/start":
                welcome_msg = (
                    "👋 <b>Welcome to LKM SmartDesk Incident Reporter!</b>\n\n"
                    "You can report any shop floor breakdown, material shortage, or quality issue directly here.\n\n"
                    "<i>Example:</i>\n"
                    "<code>Breakdown in CNC Machine 04 on line 2, heavy oil leakage.</code>\n\n"
                    "Our AI will automatically categorize, assign priority, and register your ticket!"
                )
                self.send_text_message(chat_id, welcome_msg)
                return None

            # Ignore slash commands like /help or bot commands
            if text.startswith("/") and len(text.split()) == 1:
                return None

            provider_message_id = f"tg_{update_id}_{msg_id}"
            sender_identifier = f"tg:{chat_id}"

            logger.info(f"[TELEGRAM INBOUND] Received from {full_name} ({username_tag}) in {chat_type} [{chat_id}]: '{text}'")

            return {
                "provider_message_id": provider_message_id,
                "sender_phone": sender_identifier,
                "message_text": text,
                "timestamp": message.get("date"),
                "chat_id": chat_id,
                "chat_type": chat_type,
                "chat_title": chat_title,
                "sender_name": full_name,
                "username": username,
                "raw": payload
            }
        except Exception as e:
            logger.error(f"Error parsing Telegram update payload: {e}")
            return None


telegram_provider = TelegramProvider()
