import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.ticket import Ticket
from app.models.message import Message
from app.models.user import User

client = TestClient(app)


def get_auth_token(email: str, password: str) -> str:
    """Helper to authenticate and get JWT bearer token."""
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Failed login for {email}: {resp.text}"
    return resp.json()["access_token"]


def test_scenario_1_machine_breakdown():
    """
    Scenario 1:
    An employee sends a machine breakdown message:
    'Machine 04 stopped working on the production floor.'
    Expected:
    - AI identifies Maintenance
    - Priority classified as Critical
    - Ticket generated and stored
    - WhatsApp confirmation sent
    """
    response = client.post(
        "/api/v1/simulator/send",
        json={
            "sender_phone": "+919876543210",
            "message_text": "Machine 04 stopped working on the production floor.",
            "employee_name": "Rajesh Kumar"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    ticket = data["ticket"]
    assert ticket["ticket_number"].startswith("LKM-")
    assert ticket["department_name"] == "Maintenance"
    assert ticket["priority"] == "Critical"
    assert ticket["asset"] == "Machine 04"
    assert ticket["location"] == "Production Floor"
    assert "successfully registered" in data["simulated_whatsapp_response"]


def test_scenario_2_raw_material_shortage():
    """
    Scenario 2:
    An employee reports a raw material shortage:
    'Raw materials have not arrived for today\'s production.'
    Expected:
    - Department: Purchase or Stores
    - Priority: High
    - Correct ticket generated
    """
    response = client.post(
        "/api/v1/simulator/send",
        json={
            "sender_phone": "+919876543213",
            "message_text": "Raw materials have not arrived for today's production.",
            "employee_name": "Amit Verma"
        }
    )
    assert response.status_code == 200
    ticket = response.json()["ticket"]
    assert ticket["department_name"] in ["Purchase", "Stores"]
    assert ticket["priority"] in ["High", "Critical"]


def test_scenario_3_unclear_issue():
    """
    Scenario 3:
    An employee reports an unclear issue:
    'Something seems odd.'
    Expected:
    - AI identifies uncertainty
    - Ticket flagged for supervisor review (needs_review=True)
    - No unsupported department assignment
    """
    response = client.post(
        "/api/v1/simulator/send",
        json={
            "sender_phone": "+919876543210",
            "message_text": "Something seems odd.",
            "employee_name": "Rajesh Kumar"
        }
    )
    assert response.status_code == 200
    ticket = response.json()["ticket"]
    assert ticket["needs_review"] is True
    assert ticket["confidence_score"] < 0.75


def test_scenario_4_duplicate_webhook_prevention():
    """
    Scenario 4:
    The same webhook event is delivered twice.
    Expected:
    - Only one ticket is created.
    - Second response indicates is_duplicate = True.
    """
    import uuid
    dup_id = f"test_dup_webhook_{uuid.uuid4().hex[:10]}"
    msg_payload = {
        "sender_phone": "+919876543211",
        "message_text": "Conveyor belt 2 stopped on shop floor.",
        "employee_name": "Suresh Patel"
    }

    # First delivery
    resp1 = client.post(f"/api/v1/simulator/send?duplicate_message_id={dup_id}", json=msg_payload)
    assert resp1.status_code == 200
    ticket_1 = resp1.json()["ticket"]
    assert resp1.json()["is_duplicate"] is False

    # Second delivery with identical message ID
    resp2 = client.post(f"/api/v1/simulator/send?duplicate_message_id={dup_id}", json=msg_payload)
    assert resp2.status_code == 200
    assert resp2.json()["is_duplicate"] is True
    ticket_2 = resp2.json()["ticket"]

    # Both refer to the identical ticket number
    assert ticket_1["ticket_number"] == ticket_2["ticket_number"]


def test_scenario_5_department_owner_update():
    """
    Scenario 5:
    Department owner updates a ticket.
    Expected:
    - Database updated
    - Ticket history recorded
    - Status notification dispatched
    """
    # 1. Create a ticket in Maintenance
    create_resp = client.post(
        "/api/v1/simulator/send",
        json={
            "sender_phone": "+919876543210",
            "message_text": "Machine 07 hydraulic leak detected.",
            "employee_name": "Rajesh Kumar"
        }
    )
    ticket_id = create_resp.json()["ticket"]["id"]

    # 2. Login as Maintenance Lead (Department Owner)
    token = get_auth_token("maint.lead@lkm.com", "MaintLead123!")

    # 3. Update status to In Progress
    update_resp = client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={
            "status": "In Progress",
            "internal_comment": "Assigned technician Suresh to replace hydraulic seal."
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_resp.status_code == 200
    updated_ticket = update_resp.json()
    assert updated_ticket["status"] == "In Progress"
    assert len(updated_ticket["history"]) >= 2  # CREATED + STATUS_CHANGE


def test_scenario_6_unauthorized_access_denied():
    """
    Scenario 6:
    Unauthorized user attempts to access restricted tickets.
    Expected:
    - Access denied by backend authorization (HTTP 403 Forbidden).
    """
    # Create ticket in Quality department
    create_resp = client.post(
        "/api/v1/simulator/send",
        json={
            "sender_phone": "+919876543212",
            "message_text": "Batch #9812 quality inspection rejected due to burrs.",
            "employee_name": "Priya Sharma"
        }
    )
    quality_ticket_id = create_resp.json()["ticket"]["id"]

    # Login as Maintenance Lead (Department Owner for MAINT, NOT QUAL)
    maint_token = get_auth_token("maint.lead@lkm.com", "MaintLead123!")

    # Attempt to view Quality ticket directly
    resp = client.get(
        f"/api/v1/tickets/{quality_ticket_id}",
        headers={"Authorization": f"Bearer {maint_token}"}
    )
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()
