import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.integrations.messaging.telegram import telegram_provider
from app.services.ticket_service import ticket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["Telegram Bot"])


class TelegramTestMessageRequest(BaseModel):
    chat_id: str
    message: str


@router.get("/status")
def get_telegram_status():
    """
    Checks connection health to Telegram Bot API.
    Returns bot identity (username, bot ID) and configuration state.
    """
    if not telegram_provider.is_configured():
        return {
            "configured": False,
            "connected": False,
            "message": "TELEGRAM_BOT_TOKEN is not configured in backend/.env"
        }

    info = telegram_provider.get_me()
    if info.get("ok"):
        res = info.get("result", {})
        return {
            "configured": True,
            "connected": True,
            "bot_id": res.get("id"),
            "bot_name": res.get("first_name"),
            "bot_username": res.get("username"),
            "can_join_groups": res.get("can_join_groups", True),
            "supports_inline_queries": res.get("supports_inline_queries", False)
        }
    else:
        return {
            "configured": True,
            "connected": False,
            "error": info.get("error", "Unable to connect to Telegram API")
        }


@router.post("/webhook")
async def receive_telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receives incoming Telegram updates via Webhook (for cloud deployment).
    Parses payload, runs Gemini AI classification, stores ticket, and confirms in Telegram.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    parsed = telegram_provider.parse_webhook_payload(payload)
    if not parsed:
        return {"status": "ACK", "message": "No actionable message in Telegram update"}

    ticket, is_dup = ticket_service.process_incoming_message(
        db=db,
        provider_message_id=parsed["provider_message_id"],
        sender_phone=parsed["sender_phone"],
        message_text=parsed["message_text"],
        platform="TELEGRAM",
        raw_payload=parsed["raw"]
    )

    return {
        "status": "PROCESSED",
        "is_duplicate": is_dup,
        "ticket_number": ticket.ticket_number,
        "department_id": ticket.department_id,
        "priority": ticket.priority
    }


@router.post("/test-message")
def send_test_telegram_message(payload: TelegramTestMessageRequest):
    """Sends a test diagnostic message to a Telegram chat or group."""
    res = telegram_provider.send_text_message(payload.chat_id, payload.message)
    return res
