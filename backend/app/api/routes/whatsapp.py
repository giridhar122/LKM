import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.integrations.messaging.whatsapp import whatsapp_provider
from app.services.ticket_service import ticket_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Webhook"])


@router.get("/webhook")
def verify_meta_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token")
):
    """
    Official Meta Webhook Verification Endpoint.
    Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge
    when configuring the Webhook URL in Meta Developer Portal.
    """
    logger.info(f"Webhook verification challenge received. Token: {hub_verify_token}")
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("Webhook verification SUCCESSFUL.")
        return Response(content=hub_challenge, media_type="text/plain", status_code=200)

    logger.warning("Webhook verification FAILED. Verify token mismatch.")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@router.post("/webhook")
async def receive_meta_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receives incoming WhatsApp messages from Meta Cloud API.
    Verifies payload HMAC signature, parses payload, deduplicates, and triggers AI ticket engine.
    """
    payload_bytes = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")

    # Verify signature
    if not whatsapp_provider.verify_webhook_signature(payload_bytes, signature_header):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    parsed = whatsapp_provider.parse_webhook_payload(payload)
    if not parsed:
        # Might be a read receipt or status update
        return {"status": "ACK", "message": "No actionable message in payload"}

    ticket, is_dup = ticket_service.process_incoming_message(
        db=db,
        provider_message_id=parsed["provider_message_id"],
        sender_phone=parsed["sender_phone"],
        message_text=parsed["message_text"],
        platform="WHATSAPP",
        raw_payload=parsed["raw"]
    )

    return {
        "status": "PROCESSED",
        "is_duplicate": is_dup,
        "ticket_number": ticket.ticket_number,
        "department_id": ticket.department_id,
        "priority": ticket.priority
    }
