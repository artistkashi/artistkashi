from fastapi import APIRouter, File, UploadFile

from app.schemas.responses import SuccessResponse
from app.services.storage_service import storage_service

router = APIRouter(tags=["admin-media"])


@router.post("/upload", response_model=SuccessResponse[str])
async def upload_media(file: UploadFile = File(...)):
    url = await storage_service.upload_image(file=file, folder="site")
    return SuccessResponse(message="Upload successful", data=url)
