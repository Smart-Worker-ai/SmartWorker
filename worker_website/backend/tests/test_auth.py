import asyncio
import pytest
from sqlalchemy.ext.asyncio import AsyncSession


class TestOtpRequest:
    """Tests for OTP request endpoint."""

    @pytest.mark.asyncio
    async def test_request_otp_valid_mobile(self, client, test_worker, mock_sms_gateway, mock_config):
        """Request OTP with valid registered mobile."""
        response = client.post(
            "/api/auth/request-otp",
            json={"mobile": "9876543210"},
        )
        assert response.status_code == 200
        assert "message" in response.json()
        mock_sms_gateway["send_otp"].assert_called_once()

    @pytest.mark.asyncio
    async def test_request_otp_unregistered_mobile(self, client, mock_sms_gateway, mock_config):
        """Request OTP with unregistered mobile — returns generic message."""
        response = client.post(
            "/api/auth/request-otp",
            json={"mobile": "9999999999"},
        )
        assert response.status_code == 200
        assert "If this number is registered" in response.json()["message"]
        mock_sms_gateway["send_otp"].assert_not_called()

    @pytest.mark.asyncio
    async def test_request_otp_mobile_normalization(self, client, test_worker, mock_sms_gateway, mock_config):
        """Mobile numbers are normalized to +91XXXXXXXXXX format."""
        response = client.post(
            "/api/auth/request-otp",
            json={"mobile": "919876543210"},  # with country code
        )
        assert response.status_code == 200
        mock_sms_gateway["send_otp"].assert_called_once()

    @pytest.mark.asyncio
    async def test_request_otp_blocked_worker(self, client, test_worker_blocked, mock_sms_gateway, mock_config):
        """Request OTP for blocked worker — returns generic message."""
        response = client.post(
            "/api/auth/request-otp",
            json={"mobile": "9999999998"},
        )
        assert response.status_code == 200
        assert "If this number is registered" in response.json()["message"]
        mock_sms_gateway["send_otp"].assert_not_called()


class TestOtpVerify:
    """Tests for OTP verify endpoint."""

    @pytest.mark.asyncio
    async def test_verify_otp_valid(self, client, test_worker, mock_sms_gateway, mock_config):
        """Verify valid OTP creates session and returns token."""
        mobile = "9876543210"
        response = client.post(
            "/api/auth/verify-otp",
            json={"mobile": mobile, "otp": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "worker" in data
        assert data["worker"]["id"] == test_worker.id
        assert data["worker"]["name"] == test_worker.name

    @pytest.mark.asyncio
    async def test_verify_otp_invalid(self, client, test_worker, mock_sms_gateway, mock_config):
        """Verify invalid OTP returns 401."""
        mock_sms_gateway["verify_otp"].return_value = False
        response = client.post(
            "/api/auth/verify-otp",
            json={"mobile": "9876543210", "otp": "000000"},
        )
        assert response.status_code == 401
        assert "Invalid or expired OTP" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_verify_otp_unregistered_mobile(self, client, mock_sms_gateway, mock_config):
        """Verify OTP for unregistered mobile returns 401 (even if OTP is valid)."""
        mock_sms_gateway["verify_otp"].return_value = True
        response = client.post(
            "/api/auth/verify-otp",
            json={"mobile": "9999999999", "otp": "123456"},
        )
        assert response.status_code == 401
        assert "Invalid or expired OTP" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_verify_otp_blocked_worker(self, client, test_worker_blocked, mock_sms_gateway, mock_config):
        """Verify OTP for blocked worker returns 401."""
        mock_sms_gateway["verify_otp"].return_value = True
        response = client.post(
            "/api/auth/verify-otp",
            json={"mobile": "9999999998", "otp": "123456"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_verify_otp_sets_cookie(self, client, test_worker, mock_sms_gateway, mock_config):
        """Verify OTP sets session cookie."""
        response = client.post(
            "/api/auth/verify-otp",
            json={"mobile": "9876543210", "otp": "123456"},
        )
        assert response.status_code == 200
        assert "worker_session" in response.cookies


class TestLogout:
    """Tests for logout endpoint."""

    @pytest.mark.asyncio
    async def test_logout_with_session(self, client, test_session, mock_config):
        """Logout revokes session and clears cookie."""
        response = client.post(
            "/api/auth/logout",
            cookies={"worker_session": test_session.token},
        )
        assert response.status_code == 200
        assert "Logged out" in response.json()["message"]

    @pytest.mark.asyncio
    async def test_logout_without_session(self, client, mock_config):
        """Logout without session is idempotent."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 200
        assert "Logged out" in response.json()["message"]
