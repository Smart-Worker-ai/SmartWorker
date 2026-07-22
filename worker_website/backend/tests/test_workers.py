import io
import pytest
from fastapi import UploadFile


class TestWorkerRegistration:
    """Tests for worker registration endpoint."""

    @pytest.mark.asyncio
    async def test_register_valid(self, client, mock_email, mock_storage, mock_config):
        """Register worker with valid data."""
        data = {
            "name": "John Doe",
            "age": 30,
            "gender": "M",
            "mobile": "9876543220",
            "email": "john@example.com",
            "address": "123 Main St",
            "district": "Kozhikode",
            "town": "Kozhikode City",
            "job_type": "Plumber",
            "current_location": "Kozhikode",
            "interested_locations": "Kozhikode City, Feroke",
            "facilities_requested": "Accommodation",
            "daily_rate": 900,
            "experience_years": 5,
            "accepted_terms": True,
        }
        files = {
            "passbook_photo": ("test.pdf", io.BytesIO(b"PDF content"), "application/pdf"),
            "aadhar_photo": ("test.pdf", io.BytesIO(b"PDF content"), "application/pdf"),
            "profile_photo": ("test.jpg", io.BytesIO(b"JPEG content"), "image/jpeg"),
        }
        response = client.post("/api/workers/register", data=data, files=files)
        assert response.status_code == 200
        data_resp = response.json()
        assert "worker" in data_resp
        assert data_resp["worker"]["name"] == "John Doe"
        assert data_resp["worker"]["status"] == "pending"
        assert data_resp["worker"]["worker_uid"].startswith("SW-")
        mock_email["send_registration_email"].assert_called_once()
        mock_email["send_registration_sms"].assert_called_once()

    @pytest.mark.asyncio
    async def test_register_invalid_age(self, client, mock_storage, mock_config):
        """Register with invalid age (< 18) fails."""
        data = {
            "name": "Young Person",
            "age": 16,
            "gender": "M",
            "mobile": "9876543221",
            "email": "young@example.com",
            "address": "123 Main St",
            "district": "Kozhikode",
            "town": "Kozhikode City",
            "job_type": "Plumber",
            "current_location": "Kozhikode",
            "interested_locations": "Kozhikode City",
            "facilities_requested": "",
            "daily_rate": 800,
            "experience_years": 0,
            "accepted_terms": True,
        }
        files = {
            "passbook_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "aadhar_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "profile_photo": ("test.jpg", io.BytesIO(b"JPEG"), "image/jpeg"),
        }
        response = client.post("/api/workers/register", data=data, files=files)
        assert response.status_code == 400
        assert "Age must be between 18 and 70" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_invalid_mobile(self, client, mock_storage, mock_config):
        """Register with invalid mobile (< 10 digits) fails."""
        data = {
            "name": "Bad Mobile",
            "age": 30,
            "gender": "M",
            "mobile": "12345",  # Too short
            "email": "bad@example.com",
            "address": "123 Main St",
            "district": "Kozhikode",
            "town": "Kozhikode City",
            "job_type": "Plumber",
            "current_location": "Kozhikode",
            "interested_locations": "Kozhikode City",
            "facilities_requested": "",
            "daily_rate": 800,
            "experience_years": 0,
            "accepted_terms": True,
        }
        files = {
            "passbook_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "aadhar_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "profile_photo": ("test.jpg", io.BytesIO(b"JPEG"), "image/jpeg"),
        }
        response = client.post("/api/workers/register", data=data, files=files)
        assert response.status_code == 400
        assert "Invalid Indian mobile number" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_duplicate_mobile(self, client, test_worker, mock_storage, mock_config):
        """Register with mobile already in use fails."""
        data = {
            "name": "Duplicate",
            "age": 30,
            "gender": "M",
            "mobile": "9876543210",  # test_worker's mobile
            "email": "dup@example.com",
            "address": "123 Main St",
            "district": "Kozhikode",
            "town": "Kozhikode City",
            "job_type": "Plumber",
            "current_location": "Kozhikode",
            "interested_locations": "Kozhikode City",
            "facilities_requested": "",
            "daily_rate": 800,
            "experience_years": 0,
            "accepted_terms": True,
        }
        files = {
            "passbook_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "aadhar_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "profile_photo": ("test.jpg", io.BytesIO(b"JPEG"), "image/jpeg"),
        }
        response = client.post("/api/workers/register", data=data, files=files)
        assert response.status_code == 409
        assert "mobile number already exists" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_no_terms_acceptance(self, client, mock_storage, mock_config):
        """Register without accepting terms fails."""
        data = {
            "name": "No Terms",
            "age": 30,
            "gender": "M",
            "mobile": "9876543223",
            "email": "noterms@example.com",
            "address": "123 Main St",
            "district": "Kozhikode",
            "town": "Kozhikode City",
            "job_type": "Plumber",
            "current_location": "Kozhikode",
            "interested_locations": "Kozhikode City",
            "facilities_requested": "",
            "daily_rate": 800,
            "experience_years": 0,
            "accepted_terms": False,
        }
        files = {
            "passbook_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "aadhar_photo": ("test.pdf", io.BytesIO(b"PDF"), "application/pdf"),
            "profile_photo": ("test.jpg", io.BytesIO(b"JPEG"), "image/jpeg"),
        }
        response = client.post("/api/workers/register", data=data, files=files)
        assert response.status_code == 400
        assert "must accept the Terms" in response.json()["detail"]


class TestWorkerPublicListing:
    """Tests for public worker listing."""

    @pytest.mark.asyncio
    async def test_list_public_workers(self, client, test_worker_approved, mock_config):
        """List public workers shows only approved, verified workers."""
        response = client.get("/api/workers/public")
        assert response.status_code == 200
        data = response.json()
        assert "workers" in data
        assert len(data["workers"]) == 1
        assert data["workers"][0]["id"] == test_worker_approved.id
        assert data["workers"][0]["worker_uid"] == "SW-000002"

    @pytest.mark.asyncio
    async def test_list_public_workers_excludes_pending(self, client, test_worker, mock_config):
        """List public workers excludes pending workers."""
        response = client.get("/api/workers/public")
        assert response.status_code == 200
        data = response.json()
        assert len(data["workers"]) == 0  # test_worker is pending

    @pytest.mark.asyncio
    async def test_list_public_workers_filter_by_district(self, client, test_worker_approved, mock_config):
        """Filter public workers by district."""
        response = client.get("/api/workers/public?district=kozhikode")
        assert response.status_code == 200
        data = response.json()
        assert len(data["workers"]) == 1

        response = client.get("/api/workers/public?district=delhi")
        assert response.status_code == 200
        data = response.json()
        assert len(data["workers"]) == 0

    @pytest.mark.asyncio
    async def test_list_public_workers_filter_by_job_type(self, client, test_worker_approved, mock_config):
        """Filter public workers by job type."""
        response = client.get("/api/workers/public?job_type=electrician")
        assert response.status_code == 200
        data = response.json()
        assert len(data["workers"]) == 1

        response = client.get("/api/workers/public?job_type=plumber")
        assert response.status_code == 200
        data = response.json()
        assert len(data["workers"]) == 0


class TestWorkerAuthenticatedEndpoints:
    """Tests for authenticated worker endpoints."""

    @pytest.mark.asyncio
    async def test_get_me_authenticated(self, client, test_session, test_worker, mock_config):
        """Get current worker profile when authenticated."""
        response = client.get(
            "/api/workers/me",
            headers={"Authorization": f"Bearer {test_session.token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "worker" in data
        assert data["worker"]["id"] == test_worker.id

    @pytest.mark.asyncio
    async def test_get_me_unauthenticated(self, client, mock_config):
        """Get current worker profile without auth returns 401."""
        response = client.get("/api/workers/me")
        assert response.status_code == 401
        assert "Unauthorized" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_referral_link(self, client, test_session, test_worker, mock_config):
        """Get referral link and QR code."""
        response = client.get(
            "/api/workers/me/referral",
            headers={"Authorization": f"Bearer {test_session.token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "referral_link" in data
        assert "qr_code" in data
        assert test_worker.worker_uid in data["referral_link"]


class TestAdminEndpoints:
    """Tests for admin endpoints."""

    @pytest.mark.asyncio
    async def test_admin_list_all_workers(self, client, test_worker, test_worker_approved, mock_config):
        """Admin can list all workers."""
        response = client.get(
            "/api/workers/admin/all",
            headers={"x-admin-secret": "test-admin-secret"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["workers"]) == 2

    @pytest.mark.asyncio
    async def test_admin_list_all_workers_unauthorized(self, client, mock_config):
        """Admin endpoint without secret returns 403."""
        response = client.get("/api/workers/admin/all")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_list_all_workers_invalid_secret(self, client, mock_config):
        """Admin endpoint with wrong secret returns 403."""
        response = client.get(
            "/api/workers/admin/all",
            headers={"x-admin-secret": "wrong-secret"},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_approve_worker(self, client, test_worker, mock_email, mock_config):
        """Admin can approve pending worker."""
        response = client.post(
            f"/api/workers/admin/{test_worker.id}/approve",
            headers={"x-admin-secret": "test-admin-secret"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["worker"]["status"] == "approved"
        assert data["worker"]["is_verified"] is True
        mock_email["send_approval_email"].assert_called_once()
        mock_email["send_approval_sms"].assert_called_once()

    @pytest.mark.asyncio
    async def test_admin_reject_worker(self, client, test_worker, mock_config):
        """Admin can reject worker."""
        response = client.post(
            f"/api/workers/admin/{test_worker.id}/reject",
            headers={"x-admin-secret": "test-admin-secret"},
        )
        assert response.status_code == 200
        assert "rejected" in response.json()["message"]

    @pytest.mark.asyncio
    async def test_admin_block_worker(self, client, test_worker, mock_config):
        """Admin can block worker."""
        response = client.post(
            f"/api/workers/admin/{test_worker.id}/block",
            headers={"x-admin-secret": "test-admin-secret"},
        )
        assert response.status_code == 200
        assert "blocked" in response.json()["message"]

    @pytest.mark.asyncio
    async def test_admin_unblock_worker(self, client, test_worker, mock_config):
        """Admin can unblock worker."""
        response = client.post(
            f"/api/workers/admin/{test_worker.id}/unblock",
            headers={"x-admin-secret": "test-admin-secret"},
        )
        assert response.status_code == 200
        assert "unblocked" in response.json()["message"]
