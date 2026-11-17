import datetime
import logging
from typing import Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.department import Department
from app.models.employee import Employee
from app.models.message import Message
from app.models.ticket import Ticket
from app.models.ticket_history import TicketHistory
from app.models.ai_classification import AIClassification
from app.schemas.ai import AIExtractionOutput
from app.schemas.ticket import TicketUpdate
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)


class TicketService:
    """Core ticket engine managing generation, updates, history tracking, and deduplication."""

    @staticmethod
    def generate_ticket_number(db: Session) -> str:
        """
        Generates a concurrency-safe unique ticket number formatted as LKM-YYYY-00001.
        """
        current_year = datetime.datetime.now(datetime.timezone.utc).year
        prefix = f"LKM-{current_year}-"

        # Query max ticket number for current year
        last_ticket = (
            db.query(Ticket.ticket_number)
            .filter(Ticket.ticket_number.like(f"{prefix}%"))
            .order_by(Ticket.id.desc())
            .first()
        )

        if last_ticket and last_ticket[0]:
            try:
                last_seq = int(last_ticket[0].split("-")[-1])
                new_seq = last_seq + 1
            except ValueError:
                new_seq = 1
        else:
            new_seq = 1

        return f"{prefix}{new_seq:05d}"

    @classmethod
    def process_incoming_message(
        cls,
        db: Session,
        provider_message_id: str,
        sender_phone: str,
        message_text: str,
        platform: str = "WHATSAPP",
        raw_payload: Optional[dict] = None
    ) -> Tuple[Ticket, bool]:
        """
        Processes an incoming messaging issue report:
        1. Deduplicates using provider_message_id.
        2. Identifies reporting employee by phone.
        3. Performs AI extraction via Gemini/industrial engine.
        4. Generates unique Ticket with audit history.
        5. Dispatches WhatsApp confirmation to employee.
        Returns: (Ticket, is_duplicate)
        """
        # 1. Deduplication check
        existing_msg = db.query(Message).filter(Message.provider_message_id == provider_message_id).first()
        if existing_msg:
            logger.info(f"Deduplication: Message ID {provider_message_id} already received.")
            existing_ticket = db.query(Ticket).filter(Ticket.original_message_id == existing_msg.id).first()
            if existing_ticket:
                return existing_ticket, True

        # Save incoming message record
        message_record = Message(
            provider_message_id=provider_message_id,
            platform=platform,
            sender_phone=sender_phone,
            message_text=message_text,
            raw_payload=raw_payload or {},
            direction="INBOUND",
            status="RECEIVED"
        )
        db.add(message_record)
        db.flush()

        # 2. Employee Identification
        clean_phone = sender_phone.replace(" ", "").replace("-", "")
        # Try both with and without leading +
        alt_phone = clean_phone.replace("+", "") if clean_phone.startswith("+") else f"+{clean_phone}"
        employee = (
            db.query(Employee)
            .filter(
                (Employee.phone_number == clean_phone) |
                (Employee.phone_number == alt_phone)
            )
            .first()
        )

        # 3. AI Issue Understanding (Gemini API)
        ai_result, raw_prompt, raw_resp = ai_service.analyze_issue_message(message_text)

        # Resolve Department ID
        department = None
        if ai_result.department:
            department = (
                db.query(Department)
                .filter(
                    (Department.name.ilike(f"%{ai_result.department}%")) |
                    (Department.code.ilike(f"%{ai_result.department}%"))
                )
                .first()
            )

        # 4. Generate unique ticket number
        ticket_number = cls.generate_ticket_number(db)

        # Create Ticket
        ticket = Ticket(
            ticket_number=ticket_number,
            issue_title=ai_result.issue_title,
            description=ai_result.description,
            category=ai_result.category,
            department_id=department.id if department else None,
            priority=ai_result.priority,
            asset=ai_result.asset,
            location=ai_result.location,
            reported_by_employee_id=employee.id if employee else None,
            employee_phone=sender_phone,
            source_platform=platform,
            original_message_id=message_record.id,
            status="Open",
            confidence_score=ai_result.confidence_score,
            needs_review=ai_result.flag_for_review,
        )
        db.add(ticket)
        db.flush()

        # Save AI Classification Audit Record
        ai_audit = AIClassification(
            ticket_id=ticket.id,
            message_id=message_record.id,
            model_name=settings.GEMINI_MODEL,
            raw_prompt=raw_prompt,
            raw_response=raw_resp,
            extracted_json=ai_result.model_dump(),
            confidence_score=ai_result.confidence_score,
            suggested_department=ai_result.department,
            suggested_priority=ai_result.priority
        )
        db.add(ai_audit)

        # Record Initial History Log
        history = TicketHistory(
            ticket_id=ticket.id,
            action="CREATED",
            new_status="Open",
            comment=f"Created automatically via {platform} message from {sender_phone}"
        )
        db.add(history)
        message_record.status = "PROCESSED"
        db.commit()
        db.refresh(ticket)

        # 5. Send confirmation to employee via WhatsApp
        try:
            notification_service.send_creation_confirmation(db, ticket)
        except Exception as e:
            logger.error(f"Failed to dispatch WhatsApp confirmation: {e}")

        return ticket, False

    @staticmethod
    def update_ticket(
        db: Session,
        ticket: Ticket,
        update_data: TicketUpdate,
        changed_by_user_id: Optional[int] = None
    ) -> Ticket:
        """
        Updates ticket fields, records audit history, and dispatches status update notifications.
        """
        old_status = ticket.status
        old_priority = ticket.priority
        old_dept_id = ticket.department_id

        # Update attributes if provided
        if update_data.issue_title is not None:
            ticket.issue_title = update_data.issue_title
        if update_data.description is not None:
            ticket.description = update_data.description
        if update_data.category is not None:
            ticket.category = update_data.category
        if update_data.department_id is not None:
            ticket.department_id = update_data.department_id
        if update_data.priority is not None:
            ticket.priority = update_data.priority
        if update_data.asset is not None:
            ticket.asset = update_data.asset
        if update_data.location is not None:
            ticket.location = update_data.location
        if update_data.assigned_to_user_id is not None:
            ticket.assigned_to_user_id = update_data.assigned_to_user_id
        if update_data.resolution_notes is not None:
            ticket.resolution_notes = update_data.resolution_notes

        status_changed = False
        if update_data.status is not None and update_data.status != old_status:
            ticket.status = update_data.status
            status_changed = True
            if update_data.status in ["Resolved", "Closed"]:
                ticket.resolved_at = datetime.datetime.now(datetime.timezone.utc)

        # Record History Entry
        actions = []
        if status_changed:
            actions.append(f"STATUS: {old_status} -> {ticket.status}")
        if update_data.priority and update_data.priority != old_priority:
            actions.append(f"PRIORITY: {old_priority} -> {ticket.priority}")
        if update_data.department_id and update_data.department_id != old_dept_id:
            actions.append("DEPARTMENT reassigned")
        if update_data.assigned_to_user_id:
            actions.append("ASSIGNEE updated")

        action_label = ", ".join(actions) if actions else "UPDATED"
        history_comment = update_data.internal_comment or f"Ticket updated: {action_label}"

        history = TicketHistory(
            ticket_id=ticket.id,
            changed_by_user_id=changed_by_user_id,
            action=action_label,
            old_status=old_status,
            new_status=ticket.status,
            comment=history_comment
        )
        db.add(history)
        db.commit()
        db.refresh(ticket)

        # If status progressed, send WhatsApp notification to employee
        if status_changed:
            try:
                notification_service.send_status_change_notification(db, ticket, old_status)
            except Exception as e:
                logger.error(f"Failed to dispatch status update notification: {e}")

        return ticket


ticket_service = TicketService()
