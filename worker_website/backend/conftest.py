import asyncio
import json
import os
import sys
import time
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import structlog
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test config before importing modules that depend on it
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ADMIN_SECRET"] = "test-admin-secret"
os.environ["SMS_GATEWAY_URL"] = "http://localhost:8001"
os.environ["CORS_ORIGINS"] = "http://localhost:5173,http://localhost:5174"
os.environ["SELF_BASE_URL"] = "http://localhost:8000"
os.environ["CUSTOMER_BACKEND_URL"] = "http://localhost:3000"
os.environ["CUSTOMER_APK_URL"] = "http://localhost:3000/app.apk"

import config
import sms_gateway_client
from db import get_session
from models import Base, Worker, WorkerSession


@pytest.fixture(scope="function")
def test_db():
    """In-memory SQLite database for tests."""
    async def _setup():
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            echo=False,
            poolclass=StaticPool,
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        return engine

    engine = asyncio.run(_setup())
    yield engine
    asyncio.run(engine.dispose())


@pytest.fixture
def app_with_test_db(test_db):
    """FastAPI app configured with test database."""
    from main import app

    async def override_get_session():
        async_session = sessionmaker(test_db, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    yield app
    app.dependency_overrides.clear()


@pytest.fixture
def client(app_with_test_db):
    """HTTP test client."""
    return TestClient(app_with_test_db)


@pytest.fixture
def test_worker(test_db):
    """Create a test worker in the database."""
    async def _create():
        async_session = sessionmaker(test_db, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            worker = Worker(
                id=str(uuid.uuid4()),
                name="Test Worker",
                age=30,
                gender="M",
                mobile="+919876543210",
                email="test@example.com",
                address="123 Main St",
                district="Kozhikode",
                town="Kozhikode City",
                job_type="Plumber",
                current_location="Kozhikode",
                interested_locations="Kozhikode City, Feroke",
                facilities_requested="Accommodation",
                passbook_photo="s3://test/passbook.pdf",
                aadhar_photo="s3://test/aadhar.pdf",
                profile_photo="s3://test/photo.jpg",
                accepted_terms=True,
                status="pending",
                is_blocked=False,
                is_verified=False,
                daily_rate=800.0,
                experience_years=5,
                worker_uid="SW-000001",
            )
            session.add(worker)
            await session.commit()
            await session.refresh(worker)
            return worker

    return asyncio.run(_create())


@pytest.fixture
def test_worker_approved(test_db):
    """Create an approved test worker."""
    async def _create():
        async_session = sessionmaker(test_db, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            worker = Worker(
                id=str(uuid.uuid4()),
                name="Approved Worker",
                age=28,
                gender="F",
                mobile="+919876543211",
                email="approved@example.com",
                address="456 Oak Ave",
                district="Kozhikode",
                town="Feroke",
                job_type="Electrician",
                current_location="Feroke",
                interested_locations="Feroke, Kozhikode City",
                facilities_requested="",
                passbook_photo="s3://test/passbook2.pdf",
                aadhar_photo="s3://test/aadhar2.pdf",
                profile_photo="s3://test/photo2.jpg",
                accepted_terms=True,
                status="approved",
                is_blocked=False,
                is_verified=True,
                daily_rate=1000.0,
                experience_years=8,
                worker_uid="SW-000002",
                rating=4.5,
                total_reviews=10,
            )
            session.add(worker)
            await session.commit()
            await session.refresh(worker)
            return worker

    return asyncio.run(_create())


@pytest.fixture
def test_worker_blocked(test_db):
    """Create a blocked test worker."""
    async def _create():
        async_session = sessionmaker(test_db, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            worker = Worker(
                id=str(uuid.uuid4()),
                name="Blocked Worker",
                age=30,
                gender="M",
                mobile="+919999999998",
                email="blocked@example.com",
                address="123 St",
                district="Kozhikode",
                town="Kozhikode City",
                job_type="Plumber",
                current_location="Kozhikode",
                interested_locations="Kozhikode City",
                accepted_terms=True,
                is_blocked=True,
                worker_uid="SW-000099",
            )
            session.add(worker)
            await session.commit()
            await session.refresh(worker)
            return worker

    return asyncio.run(_create())


@pytest.fixture
def test_session(test_db, test_worker):
    """Create a valid worker session."""
    async def _create():
        async_session = sessionmaker(test_db, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            token = str(uuid.uuid4())
            expires_at = int(time.time() * 1000) + 24 * 3600 * 1000

            worker_session = WorkerSession(
                token=token,
                worker_id=test_worker.id,
                expires_at=expires_at,
            )
            session.add(worker_session)
            await session.commit()
            await session.refresh(worker_session)
            return worker_session

    return asyncio.run(_create())


@pytest.fixture
def mock_sms_gateway(monkeypatch):
    """Mock SMS gateway client for OTP testing."""
    send_otp_mock = MagicMock(return_value=True)
    verify_otp_mock = MagicMock(return_value=True)

    monkeypatch.setattr(sms_gateway_client, "send_otp", send_otp_mock)
    monkeypatch.setattr(sms_gateway_client, "verify_otp", verify_otp_mock)

    return {"send_otp": send_otp_mock, "verify_otp": verify_otp_mock}


@pytest.fixture
def mock_email(monkeypatch):
    """Mock email service."""
    send_registration_email = MagicMock()
    send_approval_email = MagicMock()
    send_registration_sms = MagicMock()
    send_approval_sms = MagicMock()

    monkeypatch.setattr(
        "routers.workers.send_registration_email",
        send_registration_email,
    )
    monkeypatch.setattr(
        "routers.workers.send_approval_email",
        send_approval_email,
    )
    monkeypatch.setattr(
        "routers.workers.send_registration_sms",
        send_registration_sms,
    )
    monkeypatch.setattr(
        "routers.workers.send_approval_sms",
        send_approval_sms,
    )

    return {
        "send_registration_email": send_registration_email,
        "send_approval_email": send_approval_email,
        "send_registration_sms": send_registration_sms,
        "send_approval_sms": send_approval_sms,
    }


@pytest.fixture
def mock_storage(monkeypatch):
    """Mock S3 storage."""
    def mock_save(data, folder, ext):
        return f"s3://test-bucket/{folder}/test-file.{ext}"

    def mock_delete(url):
        pass

    def mock_resolve_url(url):
        return url

    import storage
    monkeypatch.setattr(storage, "save", mock_save)
    monkeypatch.setattr(storage, "delete", mock_delete)
    monkeypatch.setattr(storage, "resolve_url", mock_resolve_url)


@pytest.fixture
def mock_config(monkeypatch):
    """Mock configuration values."""
    monkeypatch.setattr(config, "ADMIN_SECRET", "test-admin-secret")
    monkeypatch.setattr(config, "SESSION_TTL_HOURS", 24)
    monkeypatch.setattr(config, "IS_PROD", False)
    monkeypatch.setattr(config, "RATELIMIT_OTP_REQUEST", "10/minute")
    monkeypatch.setattr(config, "RATELIMIT_OTP_VERIFY", "10/minute")
    monkeypatch.setattr(config, "RATELIMIT_REGISTRATION", "5/minute")
    monkeypatch.setattr(config, "MAX_DOC_SIZE_MB", 5)
    monkeypatch.setattr(config, "MAX_PHOTO_SIZE_MB", 2)
    monkeypatch.setattr(config, "SELF_BASE_URL", "http://localhost:8000")
    monkeypatch.setattr(config, "CUSTOMER_APK_URL", "https://example.com/app.apk")
    monkeypatch.setattr(config, "CUSTOMER_BACKEND_URL", "https://customer-backend.example.com")
    monkeypatch.setattr(config, "CORS_ORIGINS", ["http://localhost:5173", "http://localhost:5174"])
