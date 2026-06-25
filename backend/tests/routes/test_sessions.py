import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio(loop_scope="function")
class TestSessions:
    async def test_list_sessions_empty(self, authenticated_user, test_client):
        response = await test_client.get(
            f"{settings.API_V1_PREFIX}/auth/sessions",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Sessions retrieved successfully"
        assert isinstance(data.get("data"), list)

    async def test_list_sessions_after_login(
        self, authenticated_user, test_client, db_session
    ):
        response = await test_client.get(
            f"{settings.API_V1_PREFIX}/auth/sessions",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        sessions = data.get("data", [])
        session_ids = [s["id"] for s in sessions]
        assert len(session_ids) > 0

    async def test_revoke_session(
        self, authenticated_user, test_client, db_session
    ):
        list_resp = await test_client.get(
            f"{settings.API_V1_PREFIX}/auth/sessions",
            headers=authenticated_user["headers"],
        )
        sessions = list_resp.json().get("data", [])
        assert len(sessions) > 0
        session_id = sessions[0]["id"]

        delete_resp = await test_client.delete(
            f"{settings.API_V1_PREFIX}/auth/sessions/{session_id}",
            headers=authenticated_user["headers"],
        )
        assert delete_resp.status_code == 200

        list_resp2 = await test_client.get(
            f"{settings.API_V1_PREFIX}/auth/sessions",
            headers=authenticated_user["headers"],
        )
        remaining = list_resp2.json().get("data", [])
        remaining_ids = [s["id"] for s in remaining]
        assert session_id not in remaining_ids

    async def test_revoke_nonexistent_session(
        self, authenticated_user, test_client
    ):
        fake_id = 99999
        response = await test_client.delete(
            f"{settings.API_V1_PREFIX}/auth/sessions/{fake_id}",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 404

    async def test_revoke_other_user_session(
        self, authenticated_user, test_client, db_session
    ):
        from app.core.auth.security import hash_password

        from app.models.user import User

        other_user = User(
            id=uuid.uuid4(),
            email="other@example.com",
            hashed_password=hash_password("TestPassword123#"),
            is_active=True,
            is_verified=True,
            is_superuser=False,
            full_name="Other User",
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)
        from app.core.auth.security import create_access_token

        other_headers = {
            "Authorization": f"Bearer {create_access_token(user_id=other_user.id)}"
        }
        list_resp = await test_client.get(
            f"{settings.API_V1_PREFIX}/auth/sessions",
            headers=other_headers,
        )
        other_sessions = list_resp.json().get("data", [])
        if not other_sessions:
            return
        other_session_id = other_sessions[0]["id"]

        response = await test_client.delete(
            f"{settings.API_V1_PREFIX}/auth/sessions/{other_session_id}",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 404

    async def test_list_sessions_unauthenticated(self, test_client):
        response = await test_client.get(
            f"{settings.API_V1_PREFIX}/auth/sessions"
        )
        assert response.status_code == 401

    async def test_revoke_session_unauthenticated(self, test_client):
        response = await test_client.delete(
            f"{settings.API_V1_PREFIX}/auth/sessions/1"
        )
        assert response.status_code == 401
