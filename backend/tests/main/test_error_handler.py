from datetime import datetime

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, EmailStr, Field

from app.core.error_handler import setup_exception_handlers
from app.middleware.response import ResponseWrapperMiddleware


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(ResponseWrapperMiddleware)
    setup_exception_handlers(app)
    return app


@pytest.mark.asyncio
async def test_http_exception_response_serializes_timestamp():
    app = create_test_app()

    @app.get("/unauthorized")
    async def unauthorized():
        raise HTTPException(status_code=401, detail="Unauthorized")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/unauthorized")

    assert response.status_code == 401
    body = response.json()
    assert body["message"] == "Unauthorized"
    assert body["error_code"] == "HTTP_ERROR"
    assert body["errors"] is None
    assert "data" not in body
    assert "error_code" not in body["meta"]
    datetime.fromisoformat(body["meta"]["timestamp"])
    assert body["meta"]["request_id"]


@pytest.mark.asyncio
async def test_symbolic_http_exception_uses_code_and_readable_message():
    app = create_test_app()

    @app.get("/existing-user")
    async def existing_user():
        raise HTTPException(status_code=400, detail="USER_ALREADY_EXISTS")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/existing-user")

    assert response.status_code == 400
    assert response.json() == {
        "success": False,
        "status": 400,
        "message": "User already exists",
        "error_code": "USER_ALREADY_EXISTS",
        "errors": None,
        "meta": response.json()["meta"],
    }
    datetime.fromisoformat(response.json()["meta"]["timestamp"])
    assert response.json()["meta"]["request_id"]


class RegistrationPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


@pytest.mark.asyncio
async def test_validation_exception_groups_readable_errors_by_field():
    app = create_test_app()

    @app.post("/register")
    async def register(payload: RegistrationPayload):
        return payload

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/register",
            json={"email": "invalid", "password": "short"},
        )

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["status"] == 422
    assert body["message"] == "Validation failed"
    assert body["error_code"] == "VALIDATION_ERROR"
    assert body["errors"] == {
        "email": ["Invalid email address"],
        "password": ["Password must be at least 8 characters"],
    }
    assert "error_code" not in body["meta"]
    assert body["meta"]["request_id"]
