import uuid
from datetime import datetime

from pydantic import BaseModel


class UserSessionCreate(BaseModel):
    user_id: uuid.UUID
    refresh_token_jti: str
    expires_at: datetime
    user_agent: str | None = None
    ip_address: str | None = None
    device_info: str | None = None
    device_id: str | None = None


class UserSessionRead(BaseModel):
    id: int
    refresh_token_jti: str
    user_agent: str | None = None
    ip_address: str | None = None
    device_info: str | None = None
    revoked: bool
    expires_at: datetime
    last_activity: datetime
    user_id: uuid.UUID

    model_config = {
        "from_attributes": True,
    }
