from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.employee import Employee
from app.models.department import Department
from app.models.user import User
from app.schemas.employee import EmployeeOut, EmployeeCreate, EmployeeUpdate
from app.api.deps import get_current_user, require_supervisor

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=List[EmployeeOut])
def list_employees(
    search: Optional[str] = Query(None, description="Search by name, code, or phone"),
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all employees with WhatsApp mapping and department details."""
    query = db.query(Employee)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Employee.full_name.ilike(search_filter)) |
            (Employee.employee_code.ilike(search_filter)) |
            (Employee.phone_number.ilike(search_filter))
        )
    if department_id:
        query = query.filter(Employee.department_id == department_id)

    employees = query.all()
    results = []
    for emp in employees:
        dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
        results.append(
            EmployeeOut(
                id=emp.id,
                employee_code=emp.employee_code,
                full_name=emp.full_name,
                phone_number=emp.phone_number,
                department_id=emp.department_id,
                department_name=dept.name if dept else None,
                designation=emp.designation,
                is_active=emp.is_active,
                created_at=emp.created_at
            )
        )
    return results


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    supervisor: User = Depends(require_supervisor)
):
    """Register an employee with a WhatsApp phone number for issue reporting."""
    existing_code = db.query(Employee).filter(Employee.employee_code == emp_in.employee_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Employee code already registered")

    existing_phone = db.query(Employee).filter(Employee.phone_number == emp_in.phone_number).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered to another employee")

    emp = Employee(
        employee_code=emp_in.employee_code,
        full_name=emp_in.full_name,
        phone_number=emp_in.phone_number,
        department_id=emp_in.department_id,
        designation=emp_in.designation,
        is_active=emp_in.is_active
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        phone_number=emp.phone_number,
        department_id=emp.department_id,
        department_name=dept.name if dept else None,
        designation=emp.designation,
        is_active=emp.is_active,
        created_at=emp.created_at
    )


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    emp_in: EmployeeUpdate,
    db: Session = Depends(get_db),
    supervisor: User = Depends(require_supervisor)
):
    """Update employee directory information."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if emp_in.full_name is not None:
        emp.full_name = emp_in.full_name
    if emp_in.phone_number is not None:
        emp.phone_number = emp_in.phone_number
    if emp_in.department_id is not None:
        emp.department_id = emp_in.department_id
    if emp_in.designation is not None:
        emp.designation = emp_in.designation
    if emp_in.is_active is not None:
        emp.is_active = emp_in.is_active

    db.commit()
    db.refresh(emp)

    dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp.department_id else None
    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        phone_number=emp.phone_number,
        department_id=emp.department_id,
        department_name=dept.name if dept else None,
        designation=emp.designation,
        is_active=emp.is_active,
        created_at=emp.created_at
    )
