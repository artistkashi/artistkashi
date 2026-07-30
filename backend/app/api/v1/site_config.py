from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
from app.crud.site_config import crud_site_config
from app.schemas.responses import SuccessResponse
from app.schemas.site_config import HomePageConfig

router = APIRouter(prefix="/config", tags=["site-config"])


@router.get("/home", response_model=SuccessResponse[HomePageConfig])
async def get_home_page_settings(db: DatabaseDep):
    config = await crud_site_config.get_home_page_config(db)
    return SuccessResponse(message="Operation successful", data=config)
