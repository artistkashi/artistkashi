from app.crud.base import BaseCRUD
from app.models.order import Order, OrderItem

crud_order = BaseCRUD(Order)
crud_order_item = BaseCRUD(OrderItem)
