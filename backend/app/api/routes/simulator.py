import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.notification import Notification
from app.schemas.message import SimulateMessageRequest
from app.schemas.notification import NotificationOut
from app.services.ticket_service import ticket_service
from app.api.routes.tickets import _map_ticket_to_out

router = APIRouter(prefix="/simulator", tags=["WhatsApp Simulator"])


@router.post("/send")
def simulate_incoming_whatsapp(
    payload: SimulateMessageRequest,
    duplicate_message_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Simulation Sandbox for local development & demonstration.
    Allows testing realistic employee WhatsApp messages, Gemini AI classification,
    ticket creation, and confirmation notifications without Meta API credentials.
    """
    msg_id = duplicate_message_id or f"sim_wamid_{uuid.uuid4().hex[:16]}"

    ticket, is_dup = ticket_service.process_incoming_message(
        db=db,
        provider_message_id=msg_id,
        sender_phone=payload.sender_phone,
        message_text=payload.message_text,
        platform="SIMULATED",
        raw_payload={"simulated": True, "sender_name": payload.employee_name}
    )

    # Fetch the simulated notification generated
    last_notif = (
        db.query(Notification)
        .filter(Notification.ticket_id == ticket.id)
        .order_by(Notification.id.desc())
        .first()
    )

    return {
        "success": True,
        "mode": "SIMULATION",
        "is_duplicate": is_dup,
        "provider_message_id": msg_id,
        "ticket": _map_ticket_to_out(ticket, db),
        "simulated_whatsapp_response": last_notif.message_content if last_notif else None
    }


@router.get("/notifications", response_model=List[NotificationOut])
def get_simulated_notifications(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """View simulated WhatsApp notifications dispatched to employees."""
    notifs = (
        db.query(Notification)
        .order_by(Notification.sent_at.desc())
        .limit(limit)
        .all()
    )
    return notifs
