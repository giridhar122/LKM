from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from app.database.session import get_db
from app.models.ticket import Ticket
from app.models.ticket_history import TicketHistory
from app.models.department import Department
from app.models.employee import Employee
from app.models.user import User
from app.models.message import Message
from app.schemas.ticket import TicketOut, TicketCreate, TicketUpdate, TicketListResponse, TicketHistoryOut
from app.services.ticket_service import ticket_service
from app.api.deps import get_current_user, require_dept_owner

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def _map_ticket_to_out(ticket: Ticket, db: Session) -> TicketOut:
    """Helper to populate joined fields on TicketOut."""
    dept = db.query(Department).filter(Department.id == ticket.department_id).first() if ticket.department_id else None
    emp = db.query(Employee).filter(Employee.id == ticket.reported_by_employee_id).first() if ticket.reported_by_employee_id else None
    assignee = db.query(User).filter(User.id == ticket.assigned_to_user_id).first() if ticket.assigned_to_user_id else None
    msg = db.query(Message).filter(Message.id == ticket.original_message_id).first() if ticket.original_message_id else None

    # Load history
    history_records = (
        db.query(TicketHistory)
        .filter(TicketHistory.ticket_id == ticket.id)
        .order_by(TicketHistory.created_at.desc())
        .all()
    )
    history_outs = []
    for h in history_records:
        changer = db.query(User).filter(User.id == h.changed_by_user_id).first() if h.changed_by_user_id else None
        history_outs.append(
            TicketHistoryOut(
                id=h.id,
                ticket_id=h.ticket_id,
                changed_by_user_id=h.changed_by_user_id,
                changed_by_name=changer.full_name if changer else "System/WhatsApp",
                action=h.action,
                old_status=h.old_status,
                new_status=h.new_status,
                comment=h.comment,
                created_at=h.created_at
            )
        )

    return TicketOut(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        issue_title=ticket.issue_title,
        description=ticket.description,
        category=ticket.category,
        department_id=ticket.department_id,
        department_name=dept.name if dept else None,
        department_code=dept.code if dept else None,
        priority=ticket.priority,
        asset=ticket.asset,
        location=ticket.location,
        employee_phone=ticket.employee_phone,
        source_platform=ticket.source_platform,
        reported_by_employee_id=ticket.reported_by_employee_id,
        reported_by_name=emp.full_name if emp else None,
        reported_by_code=emp.employee_code if emp else None,
        assigned_to_user_id=ticket.assigned_to_user_id,
        assigned_to_name=assignee.full_name if assignee else None,
        status=ticket.status,
        resolution_notes=ticket.resolution_notes,
        confidence_score=ticket.confidence_score,
        needs_review=ticket.needs_review,
        original_message_id=ticket.original_message_id,
        original_message_text=msg.message_text if msg else None,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        history=history_outs
    )


@router.get("", response_model=TicketListResponse)
def list_tickets(
    search: Optional[str] = Query(None, description="Search by ticket ID, title, or asset"),
    department_id: Optional[int] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    needs_review: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_desc: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search and filter tickets with pagination and role-based access control.
    DEPARTMENT_OWNER users are restricted to tickets in their assigned department.
    """
    query = db.query(Ticket)

    # Role-based restriction: DEPARTMENT_OWNER can only view tickets for their own department
    if current_user.role == "DEPARTMENT_OWNER":
        if not current_user.department_id:
            # If owner is not assigned a department, return empty
            return TicketListResponse(items=[], total=0, page=page, size=size, total_pages=0)
        query = query.filter(Ticket.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Ticket.department_id == department_id)

    # Filters
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Ticket.ticket_number.ilike(s)) |
            (Ticket.issue_title.ilike(s)) |
            (Ticket.asset.ilike(s)) |
            (Ticket.location.ilike(s))
        )
    if priority:
        query = query.filter(Ticket.priority == priority)
    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if needs_review is not None:
        query = query.filter(Ticket.needs_review == needs_review)

    # Sorting
    sort_col = getattr(Ticket, sort_by, Ticket.created_at)
    query = query.order_by(desc(sort_col) if sort_desc else asc(sort_col))

    total = query.count()
    total_pages = (total + size - 1) // size if total > 0 else 0
    tickets = query.offset((page - 1) * size).limit(size).all()

    items = [_map_ticket_to_out(t, db) for t in tickets]
    return TicketListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages
    )


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full ticket details with timeline history and original message."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Enforce role restriction: DEPARTMENT_OWNER can only see own department
    if current_user.role == "DEPARTMENT_OWNER" and ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view tickets from other departments"
        )

    return _map_ticket_to_out(ticket, db)


@router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int,
    ticket_in: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """
    Update ticket details, assignees, department, priority, or status.
    Automatically audits history and sends WhatsApp notification on status change.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # DEPARTMENT_OWNER can only update their own department's tickets
    if current_user.role == "DEPARTMENT_OWNER" and ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update tickets from other departments"
        )

    updated = ticket_service.update_ticket(
        db=db,
        ticket=ticket,
        update_data=ticket_in,
        changed_by_user_id=current_user.id
    )

    return _map_ticket_to_out(updated, db)


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_manual_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually create a ticket from supervisor portal."""
    ticket_number = ticket_service.generate_ticket_number(db)
    ticket = Ticket(
        ticket_number=ticket_number,
        issue_title=ticket_in.issue_title,
        description=ticket_in.description,
        category=ticket_in.category or "General",
        department_id=ticket_in.department_id,
        priority=ticket_in.priority,
        asset=ticket_in.asset,
        location=ticket_in.location,
        employee_phone=ticket_in.employee_phone,
        source_platform="WEB",
        reported_by_employee_id=ticket_in.reported_by_employee_id,
        status="Open",
        confidence_score=1.0,
        needs_review=False,
    )
    db.add(ticket)
    db.flush()

    history = TicketHistory(
        ticket_id=ticket.id,
        changed_by_user_id=current_user.id,
        action="CREATED",
        new_status="Open",
        comment=f"Created manually in portal by {current_user.full_name}"
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    return _map_ticket_to_out(ticket, db)
