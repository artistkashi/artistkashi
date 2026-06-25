import uuid

from fastapi import UploadFile
from fastcrud import compute_offset
from fastcrud.types import GetMultiResponseModel, SelectSchemaType
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictException,
    DatabaseException,
    ErrorCode,
    NotFoundException,
    ValidationException,
)
from app.crud.product import (
    PRODUCT_DETAIL_JOINS,
    PRODUCT_LIST_JOINS,
    crud_product,
    crud_product_category,
    crud_product_image,
    crud_product_medium,
    crud_product_variant,
    crud_variant_type,
)
from app.crud.wishlist import crud_wishlist
from app.crud.cart import crud_cart
from app.models.order import Order, OrderItem, PaymentStatus
from app.models.product import (
    ImageSourceType,
    ProductStatus,
)
from app.models.review import ReviewType
from app.schemas.product import (
    ProductBase,
    ProductCardJoinRead,
    ProductCardRead,
    ProductCategoryCreate,
    ProductCategoryRead,
    ProductCategoryUpdate,
    ProductCreate,
    ProductCreateRequest,
    ProductDetailRead,
    ProductImageCreate,
    ProductImageInput,
    ProductImageRead,
    ProductImageUpdate,
    ProductMediumCreate,
    ProductMediumRead,
    ProductMediumUpdate,
    ProductUpdate,
    ProductUpdateRequest,
    ProductVariantCheckDB,
    ProductVariantCreate,
    ProductVariantCreateDB,
    ProductVariantRead,
    ProductVariantUpdate,
    VariantTypeCreate,
    VariantTypeRead,
    VariantTypeUpdate,
)
from app.schemas.wishlist import WishlistProductId
from app.services.review_service import review_service
from app.services.storage_service import storage_service


class ProductService:
    async def get_product(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID | None = None,
        slug: str | None = None,
        medium_id: int | None = None,
        status: ProductStatus | None = None,
        check: bool = False,
        product_schema: type[ProductBase] = ProductBase,
    ) -> ProductBase | None:
        filters = {}
        if product_id is not None:
            filters["id"] = product_id
        if slug is not None:
            filters["slug"] = slug
        if medium_id is not None:
            filters["medium_id"] = medium_id
        if product_id is None and slug is None and medium_id is None:
            raise ValueError("Either product_id, slug, or medium_id must be provided")

        if status is not None:
            filters["status"] = status
        product = await crud_product.get(
            db=session, schema_to_select=product_schema, return_as_model=True, **filters
        )

        if check and not product:
            raise NotFoundException(
                resource="Product",
                identifier=product_id or slug or medium_id,
                error_code=ErrorCode.PRODUCT_NOT_FOUND,
            )
        return product

    async def get_product_detail(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID | None = None,
        slug: str | None = None,
        status: ProductStatus | None = None,
        check: bool = False,
        user_id: uuid.UUID | None = None,
    ) -> ProductDetailRead | None:
        filters = {}

        if product_id is not None:
            filters["id"] = product_id

        if slug is not None:
            filters["slug"] = slug

        if status is not None:
            filters["status"] = status

        product = await crud_product.get_joined(
            db=session,
            schema_to_select=ProductDetailRead,
            return_as_model=True,
            nest_joins=True,
            joins_config=PRODUCT_DETAIL_JOINS,
            **filters,
        )

        if check and not product:
            raise NotFoundException(
                resource="Product",
                identifier=product_id or slug,
                error_code=ErrorCode.PRODUCT_NOT_FOUND,
            )

        if product:
            avg_rating, review_count = await review_service.get_rating(
                session=session,
                review_type=ReviewType.PRODUCT,
                entity_id=product.id,
            )
            product.average_rating = avg_rating
            product.review_count = review_count

            buyer_counts = await self._get_sold_counts(
                session=session, product_ids=[product.id]
            )
            product.sold_count = buyer_counts.get(product.id, 0)

            if user_id:
                is_wishlisted = await crud_wishlist.exists(
                    db=session,
                    user_id=user_id,
                    product_id=product.id,
                )
                product.is_wishlisted = is_wishlisted

                is_in_cart = await crud_cart.exists(
                    db=session,
                    user_id=user_id,
                    product_id=product.id,
                )
                product.is_in_cart = is_in_cart

        return product

    async def _get_sold_counts(
        self,
        *,
        session: AsyncSession,
        product_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, int]:
        if not product_ids:
            return {}

        stmt = (
            select(
                OrderItem.product_id,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_count"),
            )
            .join(
                Order,
                OrderItem.order_id == Order.id,
            )
            .where(
                OrderItem.product_id.in_(product_ids),
                Order.payment_status == PaymentStatus.PAID,
            )
            .group_by(OrderItem.product_id)
        )

        result = await session.execute(stmt)

        return {product_id: sold_count for product_id, sold_count in result.all()}

    async def _get_buyer_counts(
        self,
        *,
        session: AsyncSession,
        product_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, int]:
        if not product_ids:
            return {}

        stmt = (
            select(
                OrderItem.product_id,
                func.count(func.distinct(Order.user_id)).label("buyer_count"),
            )
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                OrderItem.product_id.in_(product_ids),
                Order.payment_status == PaymentStatus.PAID,
            )
            .group_by(OrderItem.product_id)
        )
        result = await session.execute(stmt)
        return {row.product_id: row.buyer_count for row in result}

    async def create_product(
        self, *, session: AsyncSession, payload: ProductCreate
    ) -> ProductBase:
        if payload.medium_id:
            await product_medium_service.get_medium(
                session=session, medium_id=payload.medium_id, check=True
            )

        if payload.category_id:
            await product_category_service.get_category(
                session=session, category_id=payload.category_id, check=True
            )
        existing = await self.get_product(session=session, slug=payload.slug)

        if existing:
            raise ConflictException(
                message="Product already exists",
                error_code=ErrorCode.PRODUCT_ALREADY_EXISTS,
            )

        product = await crud_product.create(
            db=session,
            object=payload,
            schema_to_select=ProductBase,
            return_as_model=True,
        )

        if product is None:
            raise RuntimeError("Failed to create product")

        return product

    async def update_product(
        self, *, session: AsyncSession, product_id: uuid.UUID, payload: ProductUpdate
    ) -> ProductBase:
        if payload.medium_id is not None:
            await product_medium_service.get_medium(
                session=session, medium_id=payload.medium_id, check=True
            )

        if payload.category_id is not None:
            await product_category_service.get_category(
                session=session, category_id=payload.category_id, check=True
            )

        if payload.slug:
            existing = await self.get_product(session=session, slug=payload.slug)

            if existing and existing.id != product_id:
                raise ConflictException(
                    message="Product slug already exists",
                    error_code=ErrorCode.PRODUCT_ALREADY_EXISTS,
                )
        await self.get_product(session=session, product_id=product_id, check=True)
        updated = await crud_product.update(
            db=session,
            id=product_id,
            object=payload.model_dump(exclude_unset=True),
            schema_to_select=ProductBase,
            return_as_model=True,
        )

        if updated is None:
            raise RuntimeError("Failed to update product")

        return updated

    async def list_products(
        self,
        *,
        session: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        category_id: int | None = None,
        status: ProductStatus | None = None,
        is_featured: bool | None = None,
        search: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        user_id: uuid.UUID | None = None,
    ) -> GetMultiResponseModel[ProductCardRead]:

        filters = {}

        if category_id is not None:
            filters["category_id"] = category_id

        if status is not None:
            filters["status"] = status

        if is_featured is not None:
            filters["is_featured"] = is_featured

        if search:
            filters["title__ilike"] = f"%{search}%"

        if min_price is not None:
            filters["variant__price__gte"] = min_price

        if max_price is not None:
            filters["variant__price__lte"] = max_price

        result = await crud_product.get_multi_card(
            db=session,
            schema_to_select=ProductCardJoinRead,
            joins_config=PRODUCT_LIST_JOINS,
            offset=compute_offset(page, page_size),
            limit=page_size,
            **filters,
        )

        products = [ProductCardRead.model_validate(item) for item in result["data"]]

        if products:
            product_ids = [p.id for p in products]

            # Enrich with ratings
            ratings = await review_service.get_bulk_ratings(
                session=session,
                review_type=ReviewType.PRODUCT,
                entity_ids=product_ids,
            )

            # Enrich with sold counts
            sold_counts = await self._get_sold_counts(
                session=session, product_ids=product_ids
            )

            # Enrich with wishlist status
            wishlisted_ids: set[uuid.UUID] = set()
            print(user_id, "User ID")
            if user_id:
                wishlist_result = await crud_wishlist.get_multi(
                    db=session,
                    user_id=user_id,
                    product_id__in=product_ids,
                    schema_to_select=WishlistProductId,  # lightweight schema, just product_id
                    limit=len(product_ids),
                )
                print(wishlist_result, "WISHTLIST Result")
                wishlisted_ids = {
                    item["product_id"]
                    for item in wishlist_result["data"]
                    if item["product_id"]
                }

            # Enrich with cart status
            cart_product_ids: set[uuid.UUID] = set()
            if user_id:
                cart_result = await crud_cart.get_multi(
                    db=session,
                    user_id=user_id,
                    product_id__in=product_ids,
                    limit=len(product_ids),
                )
                cart_product_ids = {
                    item["product_id"]
                    for item in cart_result["data"]
                    if item["product_id"]
                }

            for p in products:
                pid = p.id
                avg_rating, review_count = ratings.get(pid, (0.0, 0))
                p.average_rating = avg_rating
                p.review_count = review_count
                p.sold_count = sold_counts.get(pid, 0)
                p.is_wishlisted = pid in wishlisted_ids
                p.is_in_cart = pid in cart_product_ids

        result["data"] = products

        return result

    async def list_published_products(
        self,
        *,
        session: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        user_id: uuid.UUID | None = None,
    ):
        return await self.list_products(
            session=session,
            page=page,
            page_size=page_size,
            status=ProductStatus.PUBLISHED,
            user_id=user_id,
        )

    async def list_featured_published_products(
        self,
        *,
        session: AsyncSession,
        limit: 8,
        user_id: uuid.UUID | None = None,
    ):
        return await self.list_products(
            session=session,
            page_size=limit,
            status=ProductStatus.PUBLISHED,
            is_featured=True,
            user_id=user_id,
        )

    async def list_products_by_category(
        self,
        *,
        session: AsyncSession,
        category_id: int,
        page: int = 1,
        page_size: int = 20,
    ):
        await product_category_service.get_category(
            session=session, category_id=category_id, check=True
        )
        return await self.list_products(
            session=session,
            category_id=category_id,
            page=page,
            page_size=page_size,
            status=ProductStatus.PUBLISHED,
        )

    async def create_product_complete(
        self,
        *,
        session: AsyncSession,
        payload: ProductCreateRequest,
        files: list[UploadFile] | None = None,
    ) -> ProductDetailRead:
        errors: dict[str, list[str]] = {}

        # ── Validations ──────────────────────────────────────────────────────

        # 1. Variants
        if not payload.variants:
            errors["variants"] = ["At least one variant is required"]
        else:
            default_count = sum(1 for v in payload.variants if v.is_default)
            if default_count != 1:
                errors["variants"] = ["Exactly one variant must be marked as default"]

        # 2. Images
        if not payload.images and not files:
            errors["images"] = ["At least one image is required"]
        else:
            primary_count = sum(1 for img in payload.images if img.is_primary)
            if primary_count != 1:
                errors["images"] = ["Exactly one image must be marked as primary"]

        if errors:
            raise ValidationException(message="Validation failed", details=errors)

        # ── 1. Create Product ────────────────────────────────────────────────

        product = await self.create_product(session=session, payload=payload.product)

        # ── 2. Create Variants ───────────────────────────────────────────────

        for v_state in payload.variants:
            await product_variant_service.create_variant(
                session=session,
                product_id=product.id,
                payload=ProductVariantCreate(
                    variant_type_id=v_state.variant_type_id,
                    price=v_state.price,
                    width=v_state.width,
                    height=v_state.height,
                    dimension_unit=v_state.dimension_unit,
                    stock_quantity=v_state.stock_quantity,
                    is_default=v_state.is_default,
                    is_available=v_state.is_available,
                    sku=v_state.sku,
                ),
            )

        # ── 3. Handle Images ─────────────────────────────────────────────────

        # Upload files first if any
        uploaded_urls = []
        if files:
            uploaded_urls = await storage_service.upload_images(files)

        for img_state in payload.images:
            image_url = img_state.image_url
            source_type = ImageSourceType.EXTERNAL_URL

            # If it's a file upload reference
            if img_state.file_index is not None:
                if img_state.file_index < len(uploaded_urls):
                    image_url = uploaded_urls[img_state.file_index]
                    source_type = ImageSourceType.UPLOAD
                else:
                    continue  # Should not happen with proper frontend logic

            if not image_url:
                continue

            await product_image_service.add_image(
                session=session,
                product_id=product.id,
                payload=ProductImageInput(
                    image_url=image_url,
                    alt_text=img_state.alt_text,
                    is_primary=img_state.is_primary,
                    sort_order=img_state.sort_order,
                ),
                source_type=source_type,
            )

        return await self.get_product_detail(
            session=session, product_id=product.id, check=True
        )

    async def update_product_complete(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID,
        payload: ProductUpdateRequest,
        files: list[UploadFile] | None = None,
    ) -> ProductDetailRead:
        errors: dict[str, list[str]] = {}

        # ── 1. Validations ───────────────────────────────────────────────────

        if not payload.variants:
            errors["variants"] = ["At least one variant is required"]
        else:
            default_count = sum(1 for v in payload.variants if v.is_default)
            if default_count != 1:
                errors["variants"] = ["Exactly one variant must be marked as default"]

        if not payload.images and not files:
            errors["images"] = ["At least one image is required"]
        else:
            primary_count = sum(1 for img in payload.images if img.is_primary)
            if primary_count != 1:
                errors["images"] = ["Exactly one image must be marked as primary"]

        if errors:
            raise ValidationException(message="Validation failed", details=errors)

        # Fetch existing state for diffing
        existing = await self.get_product_detail(
            session=session, product_id=product_id, check=True
        )

        # ── 2. Update Core Product ───────────────────────────────────────────

        await self.update_product(
            session=session, product_id=product_id, payload=payload.product
        )

        # ── 3. Sync Variants ─────────────────────────────────────────────────

        payload_variant_ids = {v.id for v in payload.variants if v.id}
        existing_variant_ids = {v.id for v in existing.variants}

        # Deletions
        for v_id in existing_variant_ids - payload_variant_ids:
            await product_variant_service.delete_variant(
                session=session, variant_id=v_id
            )

        # Updates & Creations
        for v_state in payload.variants:
            if v_state.id:
                # Update
                await product_variant_service.update_variant(
                    session=session,
                    variant_id=v_state.id,
                    payload=ProductVariantUpdate(**v_state.model_dump(exclude={"id"})),
                )
            else:
                # Create
                await product_variant_service.create_variant(
                    session=session,
                    product_id=product_id,
                    payload=ProductVariantCreate(**v_state.model_dump(exclude={"id"})),
                )

        # ── 4. Sync Images ───────────────────────────────────────────────────

        payload_image_ids = {img.id for img in payload.images if img.id}
        existing_images_map = {img.id: img for img in existing.images}

        # Collect images to remove (defer deletion after new images are created)
        removed_image_ids = existing_images_map.keys() - payload_image_ids
        deleted_keys = []
        for img_id in removed_image_ids:
            img = existing_images_map[img_id]
            if img.source_type == ImageSourceType.UPLOAD:
                try:
                    key = img.image_url.split(f"/{settings.S3_BUCKET_NAME}/", 1)[1]
                    deleted_keys.append(key)
                except (IndexError, AttributeError):
                    pass

        # Upload new files
        uploaded_urls = []
        if files:
            uploaded_urls = await storage_service.upload_images(files)

        # Updates & Creations (process new/updated images first)
        for img_state in payload.images:
            if img_state.id:
                if img_state.id not in existing_images_map:
                    raise ValidationException(
                        message="Validation failed",
                        details={
                            "images": [
                                f"Image {img_state.id} does not belong to this product "
                                f"or no longer exists"
                            ]
                        },
                    )
                await product_image_service.update_image(
                    session=session,
                    image_id=img_state.id,
                    payload=ProductImageUpdate(
                        alt_text=img_state.alt_text,
                        is_primary=img_state.is_primary,
                        sort_order=img_state.sort_order,
                    ),
                )
            else:
                image_url = img_state.image_url
                source_type = ImageSourceType.EXTERNAL_URL

                if img_state.file_index is not None:
                    if img_state.file_index < len(uploaded_urls):
                        image_url = uploaded_urls[img_state.file_index]
                        source_type = ImageSourceType.UPLOAD
                    else:
                        continue

                if image_url:
                    await product_image_service.add_image(
                        session=session,
                        product_id=product_id,
                        payload=ProductImageInput(
                            image_url=image_url,
                            alt_text=img_state.alt_text,
                            is_primary=img_state.is_primary,
                            sort_order=img_state.sort_order,
                        ),
                        source_type=source_type,
                    )

        # Delete removed images (after new images are created so product has ≥1 image)
        for img_id in removed_image_ids:
            await product_image_service.delete_image(session=session, image_id=img_id)

        if deleted_keys:
            await storage_service.delete_files(deleted_keys)

        return await self.get_product_detail(
            session=session, product_id=product_id, check=True
        )

    async def delete_product(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID,
    ) -> bool:
        product = await self.get_product_detail(
            session=session,
            product_id=product_id,
            check=True,
        )

        # Collect S3 keys for all uploaded images
        keys: list[str] = []
        for image in product.images:
            if image.source_type == ImageSourceType.UPLOAD and image.image_url:
                try:
                    key = image.image_url.split(f"/{settings.S3_BUCKET_NAME}/", 1)[1]
                    keys.append(key)
                except (IndexError, AttributeError):
                    pass

        # Delete from S3
        if keys:
            await storage_service.delete_files(keys)

        # Delete from DB (variants and images deleted via cascade)
        try:
            await crud_product.delete(
                db=session,
                id=product_id,
            )

            return True

        except NoResultFound as exc:
            raise NotFoundException(
                resource="Product",
                identifier=product_id,
                error_code=ErrorCode.PRODUCT_NOT_FOUND,
            ) from exc

        except Exception as exc:
            raise DatabaseException(
                message="Failed to delete product",
                details=str(exc),
            ) from exc


class ProductMediumService:
    async def get_medium(
        self,
        *,
        session: AsyncSession,
        medium_id: int | None = None,
        slug: str | None = None,
        medium_schema: type[ProductMediumRead] = ProductMediumRead,
        check: bool = False,
    ):
        filters = {}
        if medium_id is not None:
            filters["id"] = medium_id
        elif slug is not None:
            filters["slug"] = slug
        else:
            raise ValueError("Either medium_id or slug must be provided")

        medium = await crud_product_medium.get(
            db=session, schema_to_select=medium_schema, return_as_model=True, **filters
        )

        if check and not medium:
            raise NotFoundException(
                resource="Medium",
                identifier=medium_id or slug,
                error_code=ErrorCode.PRODUCT_MEDIUM_NOT_FOUND,
            )

        return medium

    async def create_medium(
        self, *, session: AsyncSession, payload: ProductMediumCreate
    ):
        existing = await self.get_medium(session=session, slug=payload.slug)

        if existing:
            raise ConflictException(
                message="Medium already exists",
                error_code=ErrorCode.PRODUCT_MEDIUM_ALREADY_EXISTS,
            )

        medium = await crud_product_medium.create(
            db=session,
            object=payload,
            schema_to_select=ProductMediumRead,
            return_as_model=True,
        )

        if medium is None:
            raise RuntimeError("Failed to create medium")

        return medium

    async def update_medium(
        self, *, session: AsyncSession, medium_id: int, payload: ProductMediumUpdate
    ):
        await self.get_medium(session=session, medium_id=medium_id, check=True)

        updated = await crud_product_medium.update(
            db=session,
            id=medium_id,
            object=payload.model_dump(exclude_unset=True),
            schema_to_select=ProductMediumRead,
            return_as_model=True,
        )

        if updated is None:
            raise RuntimeError("Failed to update medium")

        return updated

    async def delete_medium(self, *, session: AsyncSession, medium_id: int):
        await self.get_medium(session=session, medium_id=medium_id, check=True)
        product_exist = await product_service.get_product(
            session=session, medium_id=medium_id
        )
        if product_exist:
            raise ConflictException(
                message="Medium is used by products",
                error_code=ErrorCode.PRODUCT_MEDIUM_IN_USE,
            )

        await crud_product_medium.delete(db=session, id=medium_id)

    async def list_mediums(
        self, *, session: AsyncSession, page: int = 1, page_size: int = 20
    ):
        return await crud_product_medium.get_multi(
            db=session,
            offset=compute_offset(page, page_size),
            limit=page_size,
            return_total_count=True,
            return_as_model=True,
            schema_to_select=ProductMediumRead,
        )


class VariantTypeService:
    async def get_variant_type(
        self,
        *,
        session: AsyncSession,
        variant_type_id: int | None = None,
        slug: str | None = None,
        variant_schema: type[VariantTypeRead] = VariantTypeRead,
        check: bool = False,
    ):
        filters = {}
        if variant_type_id is not None:
            filters["id"] = variant_type_id
        elif slug is not None:
            filters["slug"] = slug
        else:
            raise ValueError("Either variant_type_id or slug must be provided")

        variant_type = await crud_variant_type.get(
            db=session, schema_to_select=variant_schema, return_as_model=True, **filters
        )

        if check and not variant_type:
            raise NotFoundException(
                resource="Variant Type",
                identifier=variant_type_id or slug,
                error_code=ErrorCode.VARIANT_TYPE_NOT_FOUND,
            )

        return variant_type

    async def create_variant_type(
        self, *, session: AsyncSession, payload: VariantTypeCreate
    ):
        existing = await self.get_variant_type(session=session, slug=payload.slug)

        if existing:
            raise ConflictException(
                message="Variant type already exists",
                error_code=ErrorCode.VARIANT_TYPE_ALREADY_EXISTS,
            )

        variant_type = await crud_variant_type.create(
            db=session,
            object=payload,
            schema_to_select=VariantTypeRead,
            return_as_model=True,
        )

        if variant_type is None:
            raise RuntimeError("Failed to create variant type")

        return variant_type

    async def update_variant_type(
        self, *, session: AsyncSession, variant_type_id: int, payload: VariantTypeUpdate
    ):
        await self.get_variant_type(
            session=session, variant_type_id=variant_type_id, check=True
        )
        if payload.slug:
            existing = await self.get_variant_type(session=session, slug=payload.slug)

            if existing and existing.id != variant_type_id:
                raise ConflictException(
                    message="Variant type already exists",
                    error_code=ErrorCode.VARIANT_TYPE_ALREADY_EXISTS,
                )
        updated = await crud_variant_type.update(
            db=session,
            id=variant_type_id,
            object=payload.model_dump(exclude_unset=True),
            schema_to_select=VariantTypeRead,
            return_as_model=True,
        )

        if updated is None:
            raise RuntimeError("Failed to update variant type")

        return updated

    async def delete_variant_type(self, *, session: AsyncSession, variant_type_id: int):
        await self.get_variant_type(
            session=session, variant_type_id=variant_type_id, check=True
        )
        variant_exists = await product_variant_service.get_product_variant(
            session=session, variant_type_id=variant_type_id
        )
        if variant_exists:
            raise ConflictException(
                message="Variant type is used by products",
                error_code=ErrorCode.VARIANT_TYPE_IN_USE,
            )
        await crud_variant_type.delete(db=session, id=variant_type_id)

    async def list_variant_types(
        self, *, session: AsyncSession, page: int = 1, page_size: int = 20
    ):
        return await crud_variant_type.get_multi(
            db=session,
            offset=compute_offset(page, page_size),
            limit=page_size,
            return_total_count=True,
            return_as_model=True,
            schema_to_select=VariantTypeRead,
        )


class ProductVariantService:
    async def get_product_variant(
        self,
        *,
        session: AsyncSession,
        filter: ProductVariantCheckDB,
        check: bool = False,
        variant_schema: type[SelectSchemaType] = ProductVariantRead,
    ) -> SelectSchemaType | None:
        filters = filter.model_dump(exclude_none=True)

        if not filters:
            raise ValueError("At least one filter must be provided")

        variant = await crud_product_variant.get(
            db=session, schema_to_select=variant_schema, return_as_model=True, **filters
        )

        if check and not variant:
            raise NotFoundException(
                resource="Product Variant",
                identifier=filter.id or filter.product_id or filter.variant_type_id,
                error_code=ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
            )

        return variant

    async def create_variant(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID,
        payload: ProductVariantCreate,
    ):
        product = await product_service.get_product(
            session=session, product_id=product_id, check=True
        )

        variant_type = await variant_type_service.get_variant_type(
            session=session, variant_type_id=payload.variant_type_id, check=True
        )

        existing = await self.get_product_variant(
            session=session,
            filter=ProductVariantCheckDB(
                product_id=product_id,
                variant_type_id=payload.variant_type_id,
                width=payload.width,
                height=payload.height,
            ),
        )

        if existing:
            raise ConflictException(
                message=(
                    f"Variant '{variant_type.name if variant_type else ''}' "
                    f"with size {payload.width} × {payload.height} "
                    f"{payload.dimension_unit.value} already exists"
                ),
                error_code=ErrorCode.PRODUCT_VARIANT_ALREADY_EXISTS,
            )

        if payload.sku:
            sku_exists = await crud_product_variant.exists(db=session, sku=payload.sku)

            if sku_exists:
                raise ConflictException(
                    message=f"SKU '{payload.sku}' already exists",
                    error_code=ErrorCode.PRODUCT_VARIANT_SKU_ALREADY_EXISTS,
                )
        else:
            width = str(payload.width).replace(".", "_")
            height = str(payload.height).replace(".", "_")

            base_sku = (f"{product.slug}-{variant_type.slug}-{width}x{height}").lower()

            sku = base_sku
            counter = 1

            while await crud_product_variant.exists(db=session, sku=sku):
                counter += 1
                sku = f"{base_sku}-{counter}"

            payload.sku = sku

        variant_count = await crud_product_variant.count(
            db=session, product_id=product_id
        )

        if variant_count == 0:
            payload.is_default = True
        elif payload.is_default:
            await crud_product_variant.update(
                db=session,
                object={"is_default": False},
                allow_multiple=True,
                product_id=product_id,
            )

        try:
            variant = await crud_product_variant.create(
                db=session,
                object=ProductVariantCreateDB(
                    product_id=product_id, **payload.model_dump()
                ),
                schema_to_select=ProductVariantRead,
                return_as_model=True,
            )

        except IntegrityError as e:
            constraint = getattr(e.orig, "constraint_name", None)

            if constraint == "product_variants_sku_key":
                raise ConflictException(
                    message=f"SKU '{payload.sku}' already exists",
                    error_code=ErrorCode.PRODUCT_VARIANT_SKU_ALREADY_EXISTS,
                ) from e

            if constraint == "uq_product_variant_dimension":
                raise ConflictException(
                    message=(
                        f"Variant '{variant_type.name}' "
                        f"with size {payload.width} × {payload.height} "
                        f"{payload.dimension_unit.value} already exists"
                    ),
                    error_code=ErrorCode.PRODUCT_VARIANT_ALREADY_EXISTS,
                ) from e

            raise

        if variant is None:
            raise RuntimeError("Failed to create variant")

        return variant

    async def update_variant(
        self,
        *,
        session: AsyncSession,
        variant_id: uuid.UUID,
        payload: ProductVariantUpdate,
    ) -> ProductVariantRead:
        variant = await self.get_product_variant(
            session=session, filter=ProductVariantCheckDB(id=variant_id), check=True
        )
        variant_type = None

        if payload.variant_type_id is not None:
            variant_type = await variant_type_service.get_variant_type(
                session=session, variant_type_id=payload.variant_type_id, check=True
            )

        check_variant_type_id = (
            payload.variant_type_id
            if payload.variant_type_id is not None
            else variant.variant_type_id
        )
        check_width = payload.width if payload.width is not None else variant.width
        check_height = payload.height if payload.height is not None else variant.height
        check_dimension_unit = (
            payload.dimension_unit.value
            if payload.dimension_unit
            else variant.dimension_unit.value
        )

        existing = await self.get_product_variant(
            session=session,
            filter=ProductVariantCheckDB(
                product_id=variant.product_id,
                variant_type_id=check_variant_type_id,
                width=check_width,
                height=check_height,
                dimension_unit=check_dimension_unit,
            ),
        )

        if existing and existing.id != variant_id:
            variant_name = (
                variant_type.name
                if variant_type
                else (variant.variant_type.name if variant.variant_type else "Custom")
            )
            raise ConflictException(
                message=(
                    f"Variant '{variant_name}' "
                    f"with size {check_width} × {check_height} "
                    f"{check_dimension_unit} "
                    f"already exists"
                ),
                error_code=ErrorCode.PRODUCT_VARIANT_ALREADY_EXISTS,
            )

        if payload.is_default is True:
            try:
                await crud_product_variant.update(
                    db=session,
                    object={"is_default": False},
                    allow_multiple=True,
                    product_id=variant.product_id,
                    id__ne=variant_id,
                )
            except NoResultFound:
                pass

        sku_exists = await crud_product_variant.exists(
            db=session, sku=payload.sku, id__ne=variant_id
        )
        if sku_exists:
            raise ConflictException(
                message="SKU already exists",
                error_code=ErrorCode.PRODUCT_VARIANT_SKU_ALREADY_EXISTS,
            )

        try:
            updated = await crud_product_variant.update(
                db=session,
                id=variant_id,
                object=payload.model_dump(exclude_unset=True),
                schema_to_select=ProductVariantRead,
                return_as_model=True,
            )

        except NoResultFound:
            raise ValidationException(  # noqa: B904
                message="Validation failed",
                details={
                    "payload.variants": [f"Variant {variant_id} no longer exists."]
                },
            )

        return updated

    async def delete_variant(self, *, session: AsyncSession, variant_id: uuid.UUID):
        variant = await self.get_product_variant(
            session=session, filter=ProductVariantCheckDB(id=variant_id), check=True
        )

        variants_count = await crud_product_variant.count(
            db=session, product_id=variant.product_id
        )

        if variants_count <= 1:
            raise ConflictException(
                message="Product must have at least one variant",
                error_code=ErrorCode.CONFLICT,
            )

        await crud_product_variant.delete(db=session, id=variant_id)

        if variant.is_default is True:
            next_variant = await crud_product_variant.get(
                db=session, product_id=variant.product_id
            )

            if next_variant:
                await crud_product_variant.update(
                    db=session, id=next_variant.id, object={"is_default": True}
                )

    # can add list_variants method here which will be used to list variants of a product
    async def get_variants(self, *, session: AsyncSession, product_id: uuid.UUID):
        return await crud_product_variant.get_multi(db=session, product_id=product_id)

    async def list_variants(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ):
        await product_service.get_product(
            session=session, product_id=product_id, check=True
        )

        return await crud_product_variant.get_multi(
            db=session,
            product_id=product_id,
            offset=compute_offset(page, page_size),
            limit=page_size,
            return_total_count=True,
            return_as_model=True,
            schema_to_select=ProductVariantRead,
        )


class ProductImageService:
    async def get_image(
        self, *, session: AsyncSession, image_id: int, check: bool = False
    ) -> ProductImageRead | None:

        image = await crud_product_image.get(
            db=session,
            id=image_id,
            schema_to_select=ProductImageRead,
            return_as_model=True,
        )

        if check and not image:
            raise NotFoundException(
                resource="Product Image",
                identifier=image_id,
                error_code=ErrorCode.PRODUCT_IMAGE_NOT_FOUND,
            )

        return image

    async def add_image(
        self,
        *,
        session: AsyncSession,
        product_id: uuid.UUID,
        payload: ProductImageInput,
        source_type: ImageSourceType = ImageSourceType.EXTERNAL_URL,
    ):
        await product_service.get_product(
            session=session, product_id=product_id, check=True
        )

        if payload.is_primary is True:
            try:
                await crud_product_image.update(
                    db=session,
                    object={"is_primary": False},
                    allow_multiple=True,
                    product_id=product_id,
                )
            except NoResultFound:
                pass

        image_count = await crud_product_image.count(db=session, product_id=product_id)

        if image_count == 0:
            payload.is_primary = True
        image = await crud_product_image.create(
            db=session,
            object=ProductImageCreate(
                product_id=product_id,
                image_url=payload.image_url,
                alt_text=payload.alt_text,
                is_primary=payload.is_primary,
                sort_order=payload.sort_order,
                source_type=source_type,
            ),
            schema_to_select=ProductImageRead,
            return_as_model=True,
        )

        if image is None:
            raise RuntimeError("Failed to create image")

        return image

    async def update_image(
        self, *, session: AsyncSession, image_id: int, payload: ProductImageUpdate
    ):
        image = await self.get_image(session=session, image_id=image_id, check=True)

        if payload.is_primary is False and image.is_primary:
            primary_count = await crud_product_image.count(
                db=session,
                product_id=image.product_id,
                is_primary=True,
            )

            if primary_count <= 1:
                raise ConflictException(
                    message="A product must have one primary image",
                    error_code=ErrorCode.CONFLICT,
                )

        if payload.is_primary is True:
            try:
                await crud_product_image.update(
                    db=session,
                    object={"is_primary": False},
                    allow_multiple=True,
                    product_id=image.product_id,
                    id__ne=image_id,
                )
            except NoResultFound:
                pass

        updated = await crud_product_image.update(
            db=session,
            id=image_id,
            object=payload.model_dump(exclude_unset=True),
            schema_to_select=ProductImageRead,
            return_as_model=True,
        )

        if updated is None:
            raise RuntimeError("Failed to update image")

        return updated

    async def delete_image(self, *, session: AsyncSession, image_id: int):
        image = await self.get_image(session=session, image_id=image_id, check=True)

        image_count = await crud_product_image.count(
            db=session, product_id=image.product_id
        )

        if image_count <= 1:
            raise ConflictException(
                message="Product must have at least one image",
                error_code=ErrorCode.CONFLICT,
            )

        await crud_product_image.delete(
            db=session,
            id=image_id,
        )

        if image.is_primary:
            next_image = await crud_product_image.get(
                db=session, product_id=image.product_id
            )

            if next_image:
                await crud_product_image.update(
                    db=session, id=next_image.id, object={"is_primary": True}
                )

    async def get_images(self, *, session: AsyncSession, product_id: uuid.UUID):
        await product_service.get_product(
            session=session, product_id=product_id, check=True
        )

        return await crud_product_image.get_multi(
            db=session,
            product_id=product_id,
            schema_to_select=ProductImageRead,
            return_as_model=True,
            return_total_count=True,
        )


class ProductCategoryService:
    async def get_category(
        self,
        *,
        session: AsyncSession,
        category_id: int | None = None,
        slug: str | None = None,
        category_schema: type[ProductCategoryRead] = ProductCategoryRead,
        check: bool = False,
    ):
        filters = {}

        if category_id is not None:
            filters["id"] = category_id
        elif slug is not None:
            filters["slug"] = slug
        else:
            raise ValueError("Either category_id or slug must be provided")

        category = await crud_product_category.get(
            db=session,
            schema_to_select=category_schema,
            return_as_model=True,
            **filters,
        )

        if check and not category:
            raise NotFoundException(
                resource="Category",
                identifier=category_id or slug,
                error_code=ErrorCode.PRODUCT_CATEGORY_NOT_FOUND,
            )

        return category

    async def create_category(
        self, *, session: AsyncSession, payload: ProductCategoryCreate
    ):
        existing = await self.get_category(session=session, slug=payload.slug)

        if existing:
            raise ConflictException(
                message="Category already exists",
                error_code=ErrorCode.PRODUCT_CATEGORY_ALREADY_EXISTS,
            )

        category = await crud_product_category.create(
            db=session,
            object=payload,
            schema_to_select=ProductCategoryRead,
            return_as_model=True,
        )

        if category is None:
            raise RuntimeError("Failed to create category")

        return category

    async def update_category(
        self, *, session: AsyncSession, category_id: int, payload: ProductCategoryUpdate
    ):
        await self.get_category(session=session, category_id=category_id, check=True)

        if payload.slug:
            existing = await self.get_category(session=session, slug=payload.slug)

            if existing and existing.id != category_id:
                raise ConflictException(
                    message="Category slug already exists",
                    error_code=ErrorCode.PRODUCT_CATEGORY_ALREADY_EXISTS,
                )

        updated = await crud_product_category.update(
            db=session,
            id=category_id,
            object=payload.model_dump(exclude_unset=True),
            schema_to_select=ProductCategoryRead,
            return_as_model=True,
        )

        if updated is None:
            raise RuntimeError("Failed to update category")

        return updated

    async def delete_category(self, *, session: AsyncSession, category_id: int):
        await self.get_category(session=session, category_id=category_id, check=True)

        product_exists = await crud_product.get(db=session, category_id=category_id)

        if product_exists:
            raise ConflictException(
                message="Category is used by products", error_code=ErrorCode.CONFLICT
            )

        await crud_product_category.delete(db=session, id=category_id)

    async def list_categories(
        self, *, session: AsyncSession, page: int = 1, page_size: int = 20
    ):
        return await crud_product_category.get_multi(
            db=session,
            offset=compute_offset(page, page_size),
            limit=page_size,
            schema_to_select=ProductCategoryRead,
            return_as_model=True,
            return_total_count=True,
        )


product_service = ProductService()
product_medium_service = ProductMediumService()
variant_type_service = VariantTypeService()
product_variant_service = ProductVariantService()
product_image_service = ProductImageService()
product_category_service = ProductCategoryService()
"""
 SELECT order_items.product_id, count(distinct(orders.user_id)) AS count_1  
 FROM order_items JOIN orders ON order_items.order_id = orders.id
  WHERE order_items.product_id IN 'a42d2cfa-1d95-4e3e-b794-482f9ff1e055' AND orders.payment_status ='paid' GROUP BY order_items.product_id
"""
"""
SELECT count(*) AS count_1 
FROM (SELECT order_items.id AS distinct_id FROM order_items
 WHERE order_items.product_id IN ('a42d2cfa-1d95-4e3e-b794-482f9ff1e055')) AS anon_1;
"""
"""
SELECT order_items.id, order_items.order_id, order_items.product_id, order_items.variant_id, order_items.course_id, order_items.quantity, order_items.price, (SELECT count(*) AS count_1
FROM orders WHERE order_items.order_id = orders.id AND orders.payment_status = 'paid') AS buyer_count FROM order_items
WHERE order_items.product_id IN ('a42d2cfa-1d95-4e3e-b794-482f9ff1e055')
LIMIT 100;
"""
