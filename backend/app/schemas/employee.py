from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    phone_number: str
    department_id: Optional[int] = None
    designation: Optional[str] = None
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeOut(EmployeeBase):
    id: int
    created_at: datetime
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
