from app.crud.base import BaseCRUD
from app.models.user_auth_provider import UserAuthProvider

crud_auth_provider = BaseCRUD(UserAuthProvider)
