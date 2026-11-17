from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    provider_message_id: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(30), default="WHATSAPP", nullable=False)  # WHATSAPP, TELEGRAM, SIMULATED
    sender_phone: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    recipient_phone: Mapped[str] = mapped_column(String(30), nullable=True)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    direction: Mapped[str] = mapped_column(String(20), default="INBOUND", nullable=False)  # INBOUND, OUTBOUND
    status: Mapped[str] = mapped_column(String(30), default="RECEIVED", nullable=False)  # RECEIVED, PROCESSED, FAILED
    received_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    ticket = relationship("Ticket", back_populates="original_message", uselist=False)
    ai_classification = relationship("AIClassification", back_populates="message", uselist=False)
