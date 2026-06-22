from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import app.models  # noqa: F401
from app.core.config import settings
from app.models.base import Base

# Parse database URL
parsed_db_url = urlparse(settings.DATABASE_URL)

async_db_connection_url = (
    f"postgresql+asyncpg://{parsed_db_url.username}:{parsed_db_url.password}@"
    f"{parsed_db_url.hostname}"
    f"{':' + str(parsed_db_url.port) if parsed_db_url.port else ''}"
    f"{parsed_db_url.path}"
)

engine = create_async_engine(
    async_db_connection_url,
    echo=False,
    future=True,
    poolclass=NullPool,
)

async_engine = engine

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=settings.EXPIRE_ON_COMMIT,
)

async_session = async_session_maker


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_maker() as session:
        yield session


# Alias used across project
get_async_session = get_db


@asynccontextmanager
async def get_async_session_context() -> AsyncIterator[AsyncSession]:
    """Async context manager for standalone use (workers, scripts)."""
    async with async_session_maker() as session:
        yield session


async def create_db_and_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db_and_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
