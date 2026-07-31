from fastapi import APIRouter

from app.api.dependencies import DatabaseDep
from app.crud.site_config import crud_site_config
from app.schemas.responses import SuccessResponse
from app.schemas.site_config import HomePageConfig, SiteConfigCreate, SiteConfigUpdate

router = APIRouter(tags=["admin-site-config"])


@router.get("/home", response_model=SuccessResponse[HomePageConfig])
async def get_home_page_settings(db: DatabaseDep):
    # Using the inherited custom method
    config = await crud_site_config.get_home_page_config(db)
    return SuccessResponse(message="Operation successful", data=config)


@router.put("/home", response_model=SuccessResponse[HomePageConfig])
async def update_home_page_settings(
    config_in: HomePageConfig,
    db: DatabaseDep,
):
    # Check if exists first
    config = await crud_site_config.get(db=db, key="home_page")
    if config:
        await crud_site_config.update(
            db=db, key="home_page", object=SiteConfigUpdate(value=config_in)
        )
    else:
        await crud_site_config.create(
            db=db,
            object=SiteConfigCreate(
                key="home_page",
                value=config_in.model_dump(),
                description="Main landing page configuration",
            ),
        )
    return SuccessResponse(message="Operation successful", data=config_in)
