from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)  # LKM-YYYY-00001
    issue_title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=True, default="General")
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False, index=True)  # Critical, High, Medium, Low
    asset: Mapped[str] = mapped_column(String(100), nullable=True)
    location: Mapped[str] = mapped_column(String(120), nullable=True)
    
    # Reporter details
    reported_by_employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    employee_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    source_platform: Mapped[str] = mapped_column(String(30), default="WHATSAPP", nullable=False)
    original_message_id: Mapped[int] = mapped_column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)

    # Management details
    assigned_to_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="Open", nullable=False, index=True)  # Open, Acknowledged, In Progress, On Hold, Resolved, Closed
    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    # AI extraction metadata
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    department = relationship("Department", back_populates="tickets")
    reported_by_employee = relationship("Employee", back_populates="reported_tickets")
    original_message = relationship("Message", back_populates="ticket")
    assigned_to = relationship("User", back_populates="assigned_tickets")
    history = relationship("TicketHistory", back_populates="ticket", order_by="TicketHistory.created_at.desc()")
    attachments = relationship("Attachment", back_populates="ticket")
    notifications = relationship("Notification", back_populates="ticket")
    ai_classification = relationship("AIClassification", back_populates="ticket", uselist=False)
