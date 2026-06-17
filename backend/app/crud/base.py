from typing import Any

from fastcrud import FastCRUD
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect as sa_inspect
from sqlalchemy.orm import Load, selectinload


def _resolve_loaders(model, relationships: list | None) -> list:
    """
    Resolve relationship loaders.

    Supports:

    relationships=None
        -> auto-load all relationships

    relationships=["addresses"]

    relationships=[User.addresses]

    relationships=[
        selectinload(Product.variants)
        .selectinload(ProductVariant.variant_type)
    ]
    """

    if relationships is None:
        mapper = sa_inspect(model)

        return [selectinload(getattr(model, rel.key)) for rel in mapper.relationships]

    loaders = []

    for rel in relationships:
        if isinstance(rel, Load):
            loaders.append(rel)
            continue

        if isinstance(rel, str):
            attr = getattr(model, rel, None)

            if attr is None:
                raise AttributeError(f"{model.__name__} has no relationship '{rel}'")

            loaders.append(selectinload(attr))

        else:
            loaders.append(selectinload(rel))

    return loaders


def _build_conditions(model, filters: dict[str, Any]) -> list:
    """
    Supports:

    id=1

    title__icontains="sunset"

    price__gt=100

    price__gte=100

    price__lt=100

    price__lte=100
    """

    conditions = []

    for key, value in filters.items():
        if not hasattr(model, key.split("__")[0]):
            continue

        if "__" not in key:
            conditions.append(getattr(model, key) == value)
            continue

        field, operator = key.split("__", 1)

        column = getattr(model, field)

        match operator:
            case "ilike":
                conditions.append(column.ilike(f"%{value}%"))
            case "icontains":
                conditions.append(column.ilike(f"%{value}%"))

            case "contains":
                conditions.append(column.contains(value))

            case "gt":
                conditions.append(column > value)

            case "gte":
                conditions.append(column >= value)

            case "lt":
                conditions.append(column < value)

            case "lte":
                conditions.append(column <= value)

            case _:
                raise ValueError(f"Unsupported filter operator: {operator}")

    return conditions


class BaseCRUD(FastCRUD):
    async def get_with_relations(
        self,
        db: AsyncSession,
        *,
        relationships: list | None = None,
        schema_to_select: type[BaseModel] | None = None,
        return_as_model: bool = False,
        **filters: Any,
    ):
        stmt = select(self.model)

        for loader in _resolve_loaders(
            self.model,
            relationships,
        ):
            stmt = stmt.options(loader)

        conditions = _build_conditions(
            self.model,
            filters,
        )

        if conditions:
            stmt = stmt.where(and_(*conditions))

        result = await db.execute(stmt)

        obj = result.scalar_one_or_none()

        if obj is None:
            return None

        if return_as_model and schema_to_select:
            return schema_to_select.model_validate(obj)

        return obj

    async def get_multi_with_relations(
        self,
        db: AsyncSession,
        *,
        relationships: list | None = None,
        schema_to_select: type[BaseModel] | None = None,
        return_as_model: bool = False,
        offset: int = 0,
        limit: int = 20,
        sort_column: str | None = None,
        sort_order: str = "asc",
        return_total_count: bool = True,
        **filters: Any,
    ) -> dict[str, Any]:

        conditions = _build_conditions(
            self.model,
            filters,
        )

        total = 0

        if return_total_count:
            count_stmt = select(func.count()).select_from(self.model)

            if conditions:
                count_stmt = count_stmt.where(and_(*conditions))

            total = await db.scalar(count_stmt) or 0

        stmt = select(self.model)

        for loader in _resolve_loaders(
            self.model,
            relationships,
        ):
            stmt = stmt.options(loader)

        if conditions:
            stmt = stmt.where(and_(*conditions))

        if sort_column and hasattr(self.model, sort_column):
            column = getattr(
                self.model,
                sort_column,
            )

            stmt = stmt.order_by(column.asc() if sort_order == "asc" else column.desc())

        stmt = stmt.offset(offset).limit(limit)

        result = await db.execute(stmt)

        objects = result.scalars().all()

        if return_as_model and schema_to_select:
            data = [schema_to_select.model_validate(obj) for obj in objects]

        else:
            data = list(objects)

        response = {
            "data": data,
        }

        if return_total_count:
            response["total_count"] = total

        return response

    async def get_multi_card(
        self,
        db,
        *,
        schema_to_select,
        joins_config,
        offset=0,
        limit=20,
        sort_columns=None,
        sort_orders=None,
        **filters,
    ):
        return await self.get_multi_joined(
            db=db,
            schema_to_select=schema_to_select,
            return_as_model=True,
            nest_joins=True,
            joins_config=joins_config,
            offset=offset,
            limit=limit,
            sort_columns=sort_columns or ["created_at"],
            sort_orders=sort_orders or ["desc"],
            return_total_count=True,
            **filters,
        )
