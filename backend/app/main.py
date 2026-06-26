import logging

from app.api import router as api_router
from app.core.config import settings
from app.core.logger import configure_logging
from app.core.routing import simple_generate_unique_route_id
from app.core.setup import create_application

configure_logging()

logger = logging.getLogger(__name__)

app = create_application(
    router=api_router,
    settings=settings,
    generate_unique_id_function=simple_generate_unique_route_id,
)

logger.info(
    "🚀 %s v%s initialized",
    settings.APP_NAME,
    settings.APP_VERSION,
)
