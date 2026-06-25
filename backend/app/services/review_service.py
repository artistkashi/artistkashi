from __future__ import annotations

from uuid import UUID

from fastcrud import JoinConfig, compute_offset
from fastcrud.types import GetMultiResponseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.review import crud_review
from app.models.review import Review, ReviewStatus, ReviewType
from app.models.user import User
from app.schemas.review import (
    ReviewCreateDB,
    ReviewRead,
    ReviewReadPublic,
    ReviewUserInfo,
)


class ReviewService:
    async def get_rating(
        self,
        *,
        session: AsyncSession,
        review_type: ReviewType,
        entity_id: UUID,
    ) -> tuple[float, int]:
        stmt = select(
            func.coalesce(func.avg(Review.rating), 0),
            func.count(Review.id),
        ).where(
            Review.type == review_type,
            Review.entity_id == entity_id,
            Review.status == ReviewStatus.ACTIVE,
        )

        result = await session.execute(stmt)
        avg_rating, review_count = result.one()

        return (
            round(float(avg_rating), 1),
            review_count,
        )

    async def get_bulk_ratings(
        self,
        *,
        session: AsyncSession,
        review_type: ReviewType,
        entity_ids: list[UUID],
    ) -> dict[UUID, tuple[float, int]]:
        if not entity_ids:
            return {}

        stmt = (
            select(
                Review.entity_id,
                func.coalesce(func.avg(Review.rating), 0).label("avg_rating"),
                func.count(Review.id).label("review_count"),
            )
            .where(
                Review.type == review_type,
                Review.entity_id.in_(entity_ids),
                Review.status == ReviewStatus.ACTIVE,
            )
            .group_by(Review.entity_id)
        )

        result = await session.execute(stmt)

        return {
            row.entity_id: (
                round(float(row.avg_rating), 1),
                row.review_count,
            )
            for row in result
        }

    async def get_review(
        self,
        *,
        session: AsyncSession,
        user_id: UUID,
        review_type: ReviewType,
        entity_id: UUID,
    ) -> ReviewRead | None:
        return await crud_review.get(
            db=session,
            user_id=user_id,
            type=review_type,
            entity_id=entity_id,
            schema_to_select=ReviewRead,
            return_as_model=True,
        )

    async def create_review(
        self,
        *,
        session: AsyncSession,
        user_id: UUID,
        review_type: ReviewType,
        entity_id: UUID,
        rating: int,
        text: str | None,
    ) -> ReviewRead | None:
        return await crud_review.create(
            db=session,
            object=ReviewCreateDB(
                type=review_type,
                entity_id=entity_id,
                user_id=user_id,
                rating=rating,
                text=text,
                status=ReviewStatus.ACTIVE,
            ),
            schema_to_select=ReviewRead,
            return_as_model=True,
        )

    async def update_review(
        self,
        *,
        session: AsyncSession,
        review_id: UUID,
        update_data: dict,
    ) -> ReviewRead | None:
        return await crud_review.update(
            db=session,
            id=review_id,
            object=update_data,
            schema_to_select=ReviewRead,
            return_as_model=True,
        )

    async def get_reviews(
        self,
        *,
        session: AsyncSession,
        review_type: ReviewType,
        entity_id: UUID,
        page: int = 1,
        page_size: int = 20,
        rating: int | None = None,
        sort_by: str | None = None,
        sort_order: str | None = None,
    ) -> GetMultiResponseModel[ReviewReadPublic]:

        # Determine sort column and order
        sort_column = "created_at"
        sort_order_value = "desc"

        if sort_by in ("created_at", "rating"):
            sort_column = sort_by
        if sort_order in ("asc", "desc"):
            sort_order_value = sort_order

        # Build filters
        filters = {
            "type": review_type,
            "entity_id": entity_id,
            "status": ReviewStatus.ACTIVE,
        }
        if rating is not None:
            filters["rating"] = rating

        return await crud_review.get_multi_joined(
            db=session,
            offset=compute_offset(page, page_size),
            limit=page_size,
            sort_columns=[sort_column],
            sort_orders=[sort_order_value],
            return_total_count=True,
            schema_to_select=ReviewReadPublic,
            nest_joins=True,
            joins_config=[
                JoinConfig(
                    model=User,
                    join_on=Review.user_id == User.id,
                    join_prefix="user",
                    schema_to_select=ReviewUserInfo,
                )
            ],
            **filters,
        )

    async def delete_review(
        self,
        *,
        session: AsyncSession,
        review_id: UUID,
    ):
        await crud_review.delete(
            db=session,
            id=review_id,
        )


review_service = ReviewService()
