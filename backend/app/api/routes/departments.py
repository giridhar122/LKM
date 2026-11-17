from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.department import Department
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.department import DepartmentOut, DepartmentCreate, DepartmentUpdate
from app.api.deps import get_current_user, require_admin, require_dept_owner

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """List all departments with associated owner and ticket statistics."""
    depts = db.query(Department).all()
    results = []
    for d in depts:
        count = db.query(func.count(Ticket.id)).filter(Ticket.department_id == d.id).scalar() or 0
        owner = db.query(User).filter(User.id == d.owner_user_id).first() if d.owner_user_id else None
        results.append(
            DepartmentOut(
                id=d.id,
                code=d.code,
                name=d.name,
                description=d.description,
                owner_user_id=d.owner_user_id,
                owner_name=owner.full_name if owner else None,
                classification_rules=d.classification_rules,
                is_active=d.is_active,
                created_at=d.created_at,
                updated_at=d.updated_at,
                ticket_count=count
            )
        )
    return results


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new department (Admin only)."""
    existing = db.query(Department).filter(
        (Department.code == dept_in.code.upper()) | (Department.name == dept_in.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this code or name already exists"
        )
    dept = Department(
        code=dept_in.code.upper(),
        name=dept_in.name,
        description=dept_in.description,
        owner_user_id=dept_in.owner_user_id,
        classification_rules=dept_in.classification_rules,
        is_active=dept_in.is_active,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update department information and AI classification rules (Admin only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if dept_in.name is not None:
        dept.name = dept_in.name
    if dept_in.description is not None:
        dept.description = dept_in.description
    if dept_in.owner_user_id is not None:
        dept.owner_user_id = dept_in.owner_user_id
    if dept_in.classification_rules is not None:
        dept.classification_rules = dept_in.classification_rules
    if dept_in.is_active is not None:
        dept.is_active = dept_in.is_active

    db.commit()
    db.refresh(dept)
    return dept
