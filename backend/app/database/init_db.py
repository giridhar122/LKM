import logging
from sqlalchemy.orm import Session
from app.database.session import engine, SessionLocal
from app.database.base import Base
from app.models.department import Department
from app.models.user import User
from app.models.employee import Employee
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Creates tables and seeds initial departments, users, and employees."""
    logger.info("Creating all database tables...")
    Base.metadata.create_all(bind=engine)

    # 1. Seed Departments
    initial_departments = [
        {
            "code": "PROD",
            "name": "Production",
            "description": "Manufacturing, shop-floor operations, assembly line, shifts, and output targets.",
            "classification_rules": {
                "keywords": ["production", "assembly", "shift", "line stopped", "operator", "output", "cycle time"],
                "default_priority": "High"
            }
        },
        {
            "code": "MAINT",
            "name": "Maintenance",
            "description": "Machinery repair, equipment breakdowns, spare parts, lubrication, and tooling.",
            "classification_rules": {
                "keywords": ["machine", "breakdown", "motor", "leakage", "compressor", "gearbox", "sensor", "conveyor", "stopped working", "tool", "maintenance"],
                "default_priority": "Critical"
            }
        },
        {
            "code": "QUAL",
            "name": "Quality",
            "description": "Quality control inspections, batch rejections, defect analysis, and calibration.",
            "classification_rules": {
                "keywords": ["quality", "inspection", "rejected", "batch", "tolerance", "dimension", "defect", "finish"],
                "default_priority": "High"
            }
        },
        {
            "code": "PURCH",
            "name": "Purchase",
            "description": "Procurement of raw materials, vendor coordination, purchase orders, and supplier delays.",
            "classification_rules": {
                "keywords": ["raw material", "purchase order", "po", "supplier", "vendor", "procurement", "order delayed"],
                "default_priority": "High"
            }
        },
        {
            "code": "STORES",
            "name": "Stores",
            "description": "Inventory management, tool crib, raw material dispatch, and safety gear issuance.",
            "classification_rules": {
                "keywords": ["inventory", "stock", "shortage", "stores", "warehouse", "bin", "ppe", "safety glasses", "gloves", "tools"],
                "default_priority": "Medium"
            }
        },
        {
            "code": "HR",
            "name": "HR",
            "description": "Workforce allocation, staffing, attendance, shift scheduling, and welfare.",
            "classification_rules": {
                "keywords": ["worker", "staff", "shift workers", "attendance", "manpower", "night shift", "overtime", "salary"],
                "default_priority": "Medium"
            }
        },
        {
            "code": "ACCT",
            "name": "Accounts",
            "description": "Billing, invoices, contractor payments, and expense reimbursements.",
            "classification_rules": {
                "keywords": ["bill", "invoice", "payment", "accounts", "gst", "voucher", "expense"],
                "default_priority": "Low"
            }
        },
        {
            "code": "IT",
            "name": "IT",
            "description": "Office network, ERP/MES software, computer hardware, printers, and connectivity.",
            "classification_rules": {
                "keywords": ["network", "wifi", "internet", "computer", "printer", "erp", "software", "server", "ip address"],
                "default_priority": "Medium"
            }
        },
    ]

    dept_map = {}
    for d in initial_departments:
        dept = db.query(Department).filter(Department.code == d["code"]).first()
        if not dept:
            dept = Department(
                code=d["code"],
                name=d["name"],
                description=d["description"],
                classification_rules=d["classification_rules"],
                is_active=True
            )
            db.add(dept)
            db.flush()
            logger.info(f"Seeded Department: {dept.name} ({dept.code})")
        dept_map[dept.code] = dept

    db.commit()

    # 2. Seed Default Users
    initial_users = [
        {
            "email": "admin@lkm.com",
            "full_name": "LKM System Administrator",
            "password": "AdminPassword123!",
            "role": "ADMIN",
            "department_code": None,
        },
        {
            "email": "supervisor@lkm.com",
            "full_name": "Karthik Raja (Plant Supervisor)",
            "password": "Supervisor123!",
            "role": "SUPERVISOR",
            "department_code": "PROD",
        },
        {
            "email": "maint.lead@lkm.com",
            "full_name": "Venkatesh Rao (Maintenance In-Charge)",
            "password": "MaintLead123!",
            "role": "DEPARTMENT_OWNER",
            "department_code": "MAINT",
        },
        {
            "email": "quality.lead@lkm.com",
            "full_name": "Ananya Sen (Quality Lead)",
            "password": "QualityLead123!",
            "role": "DEPARTMENT_OWNER",
            "department_code": "QUAL",
        },
    ]

    for u in initial_users:
        user = db.query(User).filter(User.email == u["email"]).first()
        dept_id = dept_map[u["department_code"]].id if u["department_code"] else None
        if not user:
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                department_id=dept_id,
                is_active=True,
            )
            db.add(user)
            db.flush()
            logger.info(f"Seeded User: {user.email} [{user.role}]")
            
            # If department owner, assign as department owner_user_id
            if u["role"] == "DEPARTMENT_OWNER" and dept_id:
                dept_obj = db.query(Department).filter(Department.id == dept_id).first()
                if dept_obj and not dept_obj.owner_user_id:
                    dept_obj.owner_user_id = user.id

    db.commit()

    # 3. Seed Sample Employees (with registered WhatsApp numbers)
    initial_employees = [
        {
            "employee_code": "EMP-1001",
            "full_name": "Rajesh Kumar",
            "phone_number": "+919876543210",
            "department_code": "PROD",
            "designation": "CNC Machine Operator",
        },
        {
            "employee_code": "EMP-1002",
            "full_name": "Suresh Patel",
            "phone_number": "+919876543211",
            "department_code": "MAINT",
            "designation": "Electro-Mechanical Technician",
        },
        {
            "employee_code": "EMP-1003",
            "full_name": "Priya Sharma",
            "phone_number": "+919876543212",
            "department_code": "QUAL",
            "designation": "Line Quality Inspector",
        },
        {
            "employee_code": "EMP-1004",
            "full_name": "Amit Verma",
            "phone_number": "+919876543213",
            "department_code": "STORES",
            "designation": "Inventory Storekeeper",
        },
        {
            "employee_code": "EMP-1005",
            "full_name": "Sneha Reddy",
            "phone_number": "+919876543214",
            "department_code": "HR",
            "designation": "Shift HR Coordinator",
        },
    ]

    for e in initial_employees:
        emp = db.query(Employee).filter(Employee.employee_code == e["employee_code"]).first()
        dept_id = dept_map[e["department_code"]].id if e["department_code"] else None
        if not emp:
            emp = Employee(
                employee_code=e["employee_code"],
                full_name=e["full_name"],
                phone_number=e["phone_number"],
                department_id=dept_id,
                designation=e["designation"],
                is_active=True,
            )
            db.add(emp)
            logger.info(f"Seeded Employee: {emp.full_name} ({emp.phone_number})")

    db.commit()
    logger.info("Database initialization and initial seeding complete!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
