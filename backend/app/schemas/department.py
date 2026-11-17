from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class DepartmentBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    owner_user_id: Optional[int] = None
    classification_rules: Optional[Dict[str, Any]] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_user_id: Optional[int] = None
    classification_rules: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    owner_name: Optional[str] = None
    ticket_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
