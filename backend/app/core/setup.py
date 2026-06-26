import logging
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.cache import close_redis, init_redis
from app.core.config import Settings
from app.core.db import create_db_and_tables
from app.core.error_handler import setup_exception_handlers
from app.core.queue import close_queue, init_queue
from app.middleware.response import ResponseWrapperMiddleware
from app.middleware.trailing_slash import TrailingSlashMiddleware
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


async def initialize_database() -> None:
    logger.info("📦 Creating database tables...")
    await create_db_and_tables()
    logger.info("✅ Database tables created successfully")


async def initialize_redis() -> None:
    logger.info("🔴 Connecting to Redis...")
    await init_redis()
    logger.info("✅ Redis connected successfully")


async def initialize_queue() -> None:
    logger.info("📋 Initializing job queue...")
    await init_queue()
    logger.info("✅ Job queue initialized successfully")


def lifespan_factory(settings: Settings) -> Callable[[FastAPI], AsyncGenerator[None]]:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        logger.info(
            "🚀 Starting %s v%s (%s)",
            settings.APP_NAME,
            settings.APP_VERSION,
            settings.ENVIRONMENT,
        )

        # Development only
        if settings.ENVIRONMENT.lower() == "development":
            await initialize_database()
        else:
            logger.info(
                "📦 Database schema management disabled "
                "(use Alembic migrations in production)"
            )

        if settings.ENABLE_REDIS:
            try:
                await initialize_redis()
            except Exception:
                logger.exception("Redis initialization failed")

        if settings.ENABLE_QUEUE:
            try:
                await initialize_queue()
            except Exception:
                logger.exception("Queue initialization failed")

        # Configure MinIO/S3 CORS for browser-based direct uploads
        try:
            storage_service.configure_cors(
                allowed_origin=settings.FRONTEND_URL,
            )
            logger.info("✅ S3 CORS configured")
        except Exception:
            logger.exception("S3 CORS configuration failed")

        logger.info("✨ Application started successfully")

        yield

        logger.info("🛑 Shutting down application...")

        if settings.ENABLE_QUEUE:
            try:
                await close_queue()
                logger.info("📋 Job queue closed")
            except Exception:
                logger.exception("Queue shutdown failed")

        if settings.ENABLE_REDIS:
            try:
                await close_redis()
                logger.info("🔴 Redis connection closed")
            except Exception:
                logger.exception("Redis shutdown failed")

        logger.info("✅ Application shutdown complete")

    return lifespan


def create_application(
    router: APIRouter,
    settings: Settings,
    lifespan: Callable[[FastAPI], AsyncGenerator[None]] | None = None,
    **kwargs: object,
) -> FastAPI:
    if lifespan is None:
        lifespan = lifespan_factory(settings=settings)

    kwargs.setdefault("title", settings.APP_NAME)
    kwargs.setdefault("description", settings.APP_DESCRIPTION)
    kwargs.setdefault("version", settings.APP_VERSION)
    kwargs.setdefault(
        "openapi_url", settings.OPENAPI_URL if settings.ENABLE_DOCS else None
    )

    app = FastAPI(lifespan=lifespan, **kwargs)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.CORS_ORIGINS),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(TrailingSlashMiddleware)
    app.add_middleware(ResponseWrapperMiddleware)

    setup_exception_handlers(app)

    app.include_router(router)

    return app
