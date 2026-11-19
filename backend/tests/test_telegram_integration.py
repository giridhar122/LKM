import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.ticket import Ticket
from app.models.message import Message
from app.models.notification import Notification

client = TestClient(app)


def test_telegram_status_endpoint():
    """Verify Telegram status health check endpoint."""
    res = client.get("/api/v1/telegram/status")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data


def test_telegram_webhook_creates_ticket():
    """
    Simulate a real Telegram group update payload:
    A worker messages the bot in a plant shift group.
    Expected:
    - Ticket created with source_platform='TELEGRAM'
    - AI classification routes to Maintenance (Critical)
    - Deduplication prevents duplicate tickets
    """
    msg_id = 990000 + (uuid.uuid4().int % 10000)
    update_id = 880000 + (uuid.uuid4().int % 10000)

    telegram_update = {
        "update_id": update_id,
        "message": {
            "message_id": msg_id,
            "from": {
                "id": 123456789,
                "is_bot": False,
                "first_name": "Giridhar",
                "username": "giridhar122"
            },
            "chat": {
                "id": -100192837465,
                "title": "LKM Shift A Maintenance Group",
                "type": "supergroup"
            },
            "date": 1732000000,
            "text": "Machine 04 hydraulic breakdown on production line 2"
        }
    }

    response = client.post("/api/v1/telegram/webhook", json=telegram_update)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "PROCESSED"
    assert res_data["is_duplicate"] is False
    assert res_data["priority"] == "Critical"
    ticket_number = res_data["ticket_number"]
    assert ticket_number.startswith("LKM-")

    # Verify DB persistence
    db = SessionLocal()
    try:
        t = db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first()
        assert t is not None
        assert t.source_platform == "TELEGRAM"
        assert t.department_id == 2  # Maintenance
        assert "Machine 04" in t.issue_title or "Equipment" in t.category

        # Check notification was dispatched with TELEGRAM channel
        notif = db.query(Notification).filter(Notification.ticket_id == t.id).first()
        assert notif is not None
        assert notif.channel == "TELEGRAM"

        # Test deduplication: resending the same update
        dup_response = client.post("/api/v1/telegram/webhook", json=telegram_update)
        assert dup_response.status_code == 200
        assert dup_response.json()["is_duplicate"] is True
    finally:
        db.close()
