import io
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from app.database.session import get_db
from app.models.ticket import Ticket
from app.models.department import Department
from app.models.user import User
from app.models.employee import Employee
from app.api.deps import get_current_user, require_supervisor

router = APIRouter(prefix="/reports", tags=["Reports & MIS"])


@router.get("/kpis")
def get_kpis(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve primary operational KPI statistics."""
    query = db.query(Ticket)
    if current_user.role == "DEPARTMENT_OWNER" and current_user.department_id:
        query = query.filter(Ticket.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Ticket.department_id == department_id)

    total_tickets = query.count()
    open_tickets = query.filter(Ticket.status == "Open").count()
    in_progress = query.filter(Ticket.status == "In Progress").count()
    acknowledged = query.filter(Ticket.status == "Acknowledged").count()
    on_hold = query.filter(Ticket.status == "On Hold").count()
    resolved_tickets = query.filter(Ticket.status.in_(["Resolved", "Closed"])).count()
    critical_tickets = query.filter(Ticket.priority == "Critical").count()
    needs_review = query.filter(Ticket.needs_review == True).count()

    # Calculate average resolution time for resolved tickets
    resolved_with_times = (
        query.filter(Ticket.resolved_at.isnot(None), Ticket.created_at.isnot(None))
        .all()
    )
    if resolved_with_times:
        total_seconds = sum(
            (t.resolved_at - t.created_at).total_seconds()
            for t in resolved_with_times
            if t.resolved_at and t.created_at
        )
        avg_hours = round(total_seconds / (len(resolved_with_times) * 3600), 1)
    else:
        avg_hours = 0.0

    resolution_rate = round((resolved_tickets / total_tickets * 100), 1) if total_tickets > 0 else 0.0

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress,
        "acknowledged_tickets": acknowledged,
        "on_hold_tickets": on_hold,
        "resolved_tickets": resolved_tickets,
        "critical_tickets": critical_tickets,
        "needs_review_tickets": needs_review,
        "avg_resolution_hours": avg_hours,
        "resolution_rate_percent": resolution_rate
    }


@router.get("/department-stats")
def get_department_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Distribution of tickets by department."""
    depts = db.query(Department).all()
    data = []
    for d in depts:
        total = db.query(Ticket).filter(Ticket.department_id == d.id).count()
        open_c = db.query(Ticket).filter(Ticket.department_id == d.id, Ticket.status == "Open").count()
        in_prog = db.query(Ticket).filter(Ticket.department_id == d.id, Ticket.status == "In Progress").count()
        resolved = db.query(Ticket).filter(Ticket.department_id == d.id, Ticket.status.in_(["Resolved", "Closed"])).count()
        data.append({
            "department_id": d.id,
            "department_code": d.code,
            "department_name": d.name,
            "total_tickets": total,
            "open_tickets": open_c,
            "in_progress_tickets": in_prog,
            "resolved_tickets": resolved
        })
    return data


@router.get("/priority-stats")
def get_priority_stats(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Distribution of tickets by priority."""
    priorities = ["Critical", "High", "Medium", "Low"]
    results = []
    for p in priorities:
        q = db.query(Ticket).filter(Ticket.priority == p)
        if current_user.role == "DEPARTMENT_OWNER" and current_user.department_id:
            q = q.filter(Ticket.department_id == current_user.department_id)
        elif department_id:
            q = q.filter(Ticket.department_id == department_id)
        results.append({"priority": p, "count": q.count()})
    return results


@router.get("/status-distribution")
def get_status_distribution(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Distribution of tickets by current status."""
    statuses = ["Open", "Acknowledged", "In Progress", "On Hold", "Resolved", "Closed"]
    results = []
    for s in statuses:
        q = db.query(Ticket).filter(Ticket.status == s)
        if current_user.role == "DEPARTMENT_OWNER" and current_user.department_id:
            q = q.filter(Ticket.department_id == current_user.department_id)
        elif department_id:
            q = q.filter(Ticket.department_id == department_id)
        results.append({"status": s, "count": q.count()})
    return results


@router.get("/trends")
def get_ticket_trends(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daily ticket creation trends over past N days."""
    today = datetime.datetime.now(datetime.timezone.utc).date()
    dates = [today - datetime.timedelta(days=i) for i in reversed(range(days))]

    trends = []
    for d in dates:
        start_dt = datetime.datetime.combine(d, datetime.time.min)
        end_dt = datetime.datetime.combine(d, datetime.time.max)

        q = db.query(Ticket).filter(Ticket.created_at >= start_dt, Ticket.created_at <= end_dt)
        if current_user.role == "DEPARTMENT_OWNER" and current_user.department_id:
            q = q.filter(Ticket.department_id == current_user.department_id)
        
        count = q.count()
        trends.append({"date": d.strftime("%b %d"), "tickets": count})

    return trends


@router.get("/export/csv")
def export_tickets_csv(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all tickets to CSV format."""
    query = db.query(Ticket)
    if current_user.role == "DEPARTMENT_OWNER" and current_user.department_id:
        query = query.filter(Ticket.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Ticket.department_id == department_id)
    tickets = query.order_by(Ticket.id.desc()).all()

    rows = []
    for t in tickets:
        dept = db.query(Department).filter(Department.id == t.department_id).first() if t.department_id else None
        emp = db.query(Employee).filter(Employee.id == t.reported_by_employee_id).first() if t.reported_by_employee_id else None
        assignee = db.query(User).filter(User.id == t.assigned_to_user_id).first() if t.assigned_to_user_id else None
        rows.append({
            "Ticket ID": t.ticket_number,
            "Issue Title": t.issue_title,
            "Description": t.description,
            "Department": dept.name if dept else "Unassigned",
            "Priority": t.priority,
            "Category": t.category,
            "Asset": t.asset or "",
            "Location": t.location or "",
            "Status": t.status,
            "Reported By": emp.full_name if emp else t.employee_phone,
            "Phone": t.employee_phone,
            "Assigned To": assignee.full_name if assignee else "Unassigned",
            "Confidence Score": t.confidence_score,
            "Created At": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            "Resolved At": t.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if t.resolved_at else "",
            "Resolution Notes": t.resolution_notes or ""
        })

    df = pd.DataFrame(rows)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=lkm_smartdesk_tickets_{datetime.date.today()}.csv"}
    )


@router.get("/export/excel")
def export_tickets_excel(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all tickets to Excel (.xlsx) format."""
    query = db.query(Ticket)
    if current_user.role == "DEPARTMENT_OWNER" and current_user.department_id:
        query = query.filter(Ticket.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Ticket.department_id == department_id)
    tickets = query.order_by(Ticket.id.desc()).all()

    rows = []
    for t in tickets:
        dept = db.query(Department).filter(Department.id == t.department_id).first() if t.department_id else None
        emp = db.query(Employee).filter(Employee.id == t.reported_by_employee_id).first() if t.reported_by_employee_id else None
        assignee = db.query(User).filter(User.id == t.assigned_to_user_id).first() if t.assigned_to_user_id else None
        rows.append({
            "Ticket ID": t.ticket_number,
            "Issue Title": t.issue_title,
            "Description": t.description,
            "Department": dept.name if dept else "Unassigned",
            "Priority": t.priority,
            "Category": t.category,
            "Asset": t.asset or "",
            "Location": t.location or "",
            "Status": t.status,
            "Reported By": emp.full_name if emp else t.employee_phone,
            "Phone": t.employee_phone,
            "Assigned To": assignee.full_name if assignee else "Unassigned",
            "Confidence Score": t.confidence_score,
            "Created At": t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            "Resolved At": t.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if t.resolved_at else "",
            "Resolution Notes": t.resolution_notes or ""
        })

    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Tickets")
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=lkm_smartdesk_tickets_{datetime.date.today()}.xlsx"}
    )
