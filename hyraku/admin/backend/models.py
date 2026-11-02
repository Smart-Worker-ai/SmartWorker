from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CompanySettings(Base):
    __tablename__ = "company_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(200), default="Hyraku")
    tagline: Mapped[str] = mapped_column(String(200), default="Your Reliable Labour Partner")
    address: Mapped[str] = mapped_column(Text, default="2nd Floor, Trade Center, Mavoor Road, Kozhikode, Kerala 673004")
    phone: Mapped[str] = mapped_column(String(40), default="+91 62384 76615")
    email: Mapped[str] = mapped_column(String(120), default="dispatch@hyraku.com")
    gstin: Mapped[str] = mapped_column(String(40), default="")
    pan: Mapped[str] = mapped_column(String(20), default="")
    bank_details: Mapped[str] = mapped_column(Text, default="")
    terms: Mapped[str] = mapped_column(
        Text,
        default="Hyraku coordinates verified labour booking. Daily wages are payable to deployed workers as agreed. This document is computer-generated.",
    )


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    town: Mapped[str] = mapped_column(String(120), default="")
    locality: Mapped[str] = mapped_column(String(160), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_enquiry_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    enquiries = relationship("Enquiry", back_populates="customer")


class CrewMember(Base):
    __tablename__ = "crew_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(20), default="")
    trade: Mapped[str] = mapped_column(String(80), default="")
    role: Mapped[str] = mapped_column(String(80), default="")
    town: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Enquiry(Base):
    __tablename__ = "enquiries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ref_code: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(40), default="booking")  # booking | contact
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(20))
    town: Mapped[str] = mapped_column(String(120), default="")
    locality: Mapped[str] = mapped_column(String(160), default="")
    work_dates: Mapped[str] = mapped_column(Text, default="")
    crew_summary: Mapped[str] = mapped_column(Text, default="")
    crew_json: Mapped[str] = mapped_column(Text, default="[]")
    daily_wage: Mapped[float] = mapped_column(Float, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="requested", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer", back_populates="enquiries")
    booking = relationship("Booking", back_populates="enquiry", uselist=False)


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enquiry_id: Mapped[int] = mapped_column(ForeignKey("enquiries.id"), unique=True)
    invoice_no: Mapped[str] = mapped_column(String(40), unique=True)
    payment_amount: Mapped[float] = mapped_column(Float, default=0)
    payment_mode: Mapped[str] = mapped_column(String(40), default="upi")
    payment_ref: Mapped[str] = mapped_column(String(80), default="")
    days: Mapped[int] = mapped_column(Integer, default=1)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    enquiry = relationship("Enquiry", back_populates="booking")
