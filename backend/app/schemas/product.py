from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from urllib.parse import urlparse
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

from app.core.schema import TimestampSchemaRead, slugify
from app.models.product import DimensionUnit, ImageSourceType, ProductStatus

# ─── ProductMedium ────────────────────────────────────────────────────────────


class ProductMediumCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Oil"])
    slug: str | None = Field(None, max_length=120)
    is_active: bool = True

    @model_validator(mode="after")
    def auto_slug(self) -> ProductMediumCreate:
        if not self.slug:
            self.slug = slugify(self.name)
        return self


class ProductMediumUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=120)
    is_active: bool | None = None


class ProductMediumRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    is_active: bool


# ─── VariantType ──────────────────────────────────────────────────────────────


class VariantTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Canvas Print"])
    slug: str | None = Field(None, max_length=120)
    description: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def auto_slug(self) -> VariantTypeCreate:
        if not self.slug:
            self.slug = slugify(self.name)
        return self


class VariantTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    slug: str | None = Field(None, max_length=120)
    description: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class VariantTypeRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool


# ─── ProductImage ─────────────────────────────────────────────────────────────


class ProductImageInput(BaseModel):
    """
    Represents one external image URL submitted in the product form.
    Uploaded files are handled separately as multipart file fields
    and never go through this schema.
    """

    image_url: str | None = None
    alt_text: str | None = Field(None, max_length=255)
    is_primary: bool = False
    sort_order: int = Field(0, ge=0)

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, value: str | None) -> str | None:
        if value is None:
            return value

        parsed = urlparse(value)

        if parsed.scheme not in {"http", "https"}:
            raise ValueError("Image URL must start with http:// or https://")

        if not parsed.netloc:
            raise ValueError("Invalid image URL")

        return value


class ProductImageCreate(ProductImageInput):
    product_id: UUID
    source_type: ImageSourceType


class ProductImageUpdate(BaseModel):
    alt_text: str | None = Field(None, max_length=255)
    is_primary: bool | None = None
    sort_order: int | None = Field(None, ge=0)


class ProductImageRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: UUID
    image_url: str
    alt_text: str | None
    is_primary: bool
    sort_order: int

    source_type: ImageSourceType


# ─── ProductVariant ───────────────────────────────────────────────────────────


class ProductVariantCreate(BaseModel):
    variant_type_id: int

    width: Decimal | None = Field(None, ge=0, decimal_places=2)

    height: Decimal | None = Field(None, ge=0, decimal_places=2)
    dimension_unit: DimensionUnit | None = DimensionUnit.CM

    sku: str | None = Field(None, max_length=100)
    price: Decimal = Field(..., gt=0, decimal_places=2, examples=[799.00])
    stock_quantity: int = Field(0, ge=0)
    is_default: bool = False
    is_available: bool = True


class ProductVariantCreateDB(ProductVariantCreate):
    product_id: UUID


class ProductVariantCheckDB(BaseModel):
    id: UUID | None = None
    product_id: UUID | None = None
    variant_type_id: int | None = None
    width: Decimal | None = None
    height: Decimal | None = None


class ProductVariantUpdate(BaseModel):
    id: UUID | None = None

    variant_type_id: int | None = None

    width: Decimal | None = Field(None, ge=0, decimal_places=2)
    height: Decimal | None = Field(None, ge=0, decimal_places=2)

    dimension_unit: DimensionUnit | None = None

    sku: str | None = None

    price: Decimal | None = Field(None, ge=0, decimal_places=2)

    stock_quantity: int | None = Field(None, ge=0)

    is_default: bool | None = None

    is_available: bool | None = None


class ProductVariantRead(TimestampSchemaRead):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    variant_type_id: int | None
    variant_type_name: str | None = None
    # variant_type: VariantTypeRead | None = None
    width: Decimal | None
    height: Decimal | None
    dimension_unit: DimensionUnit
    sku: str | None
    price: Decimal = Field(decimal_places=2, max_digits=10)
    stock_quantity: int
    is_default: bool
    is_available: bool

    @computed_field
    @property
    def dimensions(self) -> str | None:
        if self.width and self.height:
            return f"{self.width} × {self.height} {self.dimension_unit.value}"
        return None


# ─── Product computed field mixin ─────────────────────────────────────────────
# Shared between ProductDetailRead and ProductListRead to avoid duplication


class _ProductComputedMixin(BaseModel):
    """
    Provides price and primary_image as computed fields.
    Both ProductDetailRead and ProductListRead inherit this.
    """

    images: list[ProductImageRead] = Field(default_factory=list)
    variants: list[ProductVariantRead] = Field(default_factory=list)

    @computed_field
    @property
    def price(self) -> Decimal | None:
        """
        Returns the price of the default variant.
        Falls back to the cheapest available variant if none is marked default.
        Returns None if the product has no variants at all.
        """
        for variant in self.variants:
            if variant.is_default and variant.is_available:
                return variant.price
        available = [v for v in self.variants if v.is_available]
        if available:
            return min(available, key=lambda v: v.price).price
        return Decimal("0.00")

    @computed_field
    @property
    def primary_image(self) -> str | None:
        """
        Returns the URL of the image marked is_primary.
        Falls back to the first image if none is marked primary.
        Returns None if the product has no images.
        """
        for img in self.images:
            if img.is_primary:
                return img.image_url
        return self.images[0].image_url if self.images else None


# ─── Product Image and Variant State (Unified Payload) ─────────────────────────


class ProductVariantState(BaseModel):
    id: UUID | None = None
    variant_type_id: int
    price: Decimal = Field(..., gt=0, decimal_places=2)
    width: Decimal | None = Field(None, ge=0, decimal_places=2)
    height: Decimal | None = Field(None, ge=0, decimal_places=2)
    dimension_unit: DimensionUnit = DimensionUnit.CM
    stock_quantity: int = Field(0, ge=0)
    is_default: bool = False
    is_available: bool = True
    sku: str | None = Field(None, max_length=100)


class ProductImageState(BaseModel):
    id: int | None = None  # For existing images
    image_url: str | None = None  # For external images or existing image reference
    file_index: int | None = None  # For new uploaded files
    alt_text: str | None = Field(None, max_length=255)
    is_primary: bool = False
    sort_order: int = Field(0, ge=0)


class ProductCreateRequest(BaseModel):
    product: ProductCreate
    variants: list[ProductVariantState]
    images: list[ProductImageState]


class ProductUpdateRequest(BaseModel):
    product: ProductUpdate
    variants: list[ProductVariantState]
    images: list[ProductImageState]


class ProductBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    slug: str
    short_description: str | None = None
    is_original_available: bool = True

    medium: ProductMediumRead | None = None
    category: ProductCategoryRead | None = None

    status: ProductStatus = ProductStatus.DRAFT

    @computed_field
    @property
    def is_sold(self) -> bool:
        return not self.is_original_available


class ProductCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    medium_id: int | None = None
    short_description: str | None = Field(None, max_length=500)
    description: str | None = None
    style: str | None = Field(None, max_length=100, examples=["Realism"])
    subject: str | None = Field(None, max_length=100, examples=["Landscape"])
    year_created: int | None = Field(None, ge=1800, le=2100)
    is_original_available: bool = True
    is_framed: bool = False
    certificate_of_authenticity: bool = False
    category_id: int | None = None
    weight_grams: int | None = Field(None, ge=0)
    is_featured: bool = False
    sort_order: int = Field(0, ge=0)
    status: ProductStatus = ProductStatus.DRAFT
    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def auto_slug(self) -> ProductCreate:
        if not self.slug:
            self.slug = slugify(self.title)
        return self


class ProductUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    medium_id: int | None = None
    short_description: str | None = Field(None, max_length=500)
    description: str | None = None
    style: str | None = Field(None, max_length=100)
    subject: str | None = Field(None, max_length=100)
    year_created: int | None = Field(None, ge=1800, le=2100)
    is_original_available: bool | None = None
    is_framed: bool | None = None
    certificate_of_authenticity: bool | None = None
    category_id: int | None = None
    weight_grams: int | None = Field(None, ge=0)
    is_featured: bool | None = None
    sort_order: int | None = Field(None, ge=0)
    status: ProductStatus | None = None
    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = Field(None, max_length=500)


class ProductDetailRead(ProductBase, _ProductComputedMixin, TimestampSchemaRead):
    description: str | None = None

    style: str | None = None
    subject: str | None = None

    year_created: int | None = None

    is_original_available: bool
    is_framed: bool
    certificate_of_authenticity: bool

    weight_grams: int | None = None

    status: ProductStatus
    is_featured: bool

    sort_order: int

    meta_title: str | None = None
    meta_description: str | None = None

    average_rating: float = 0.0
    review_count: int = 0
    sold_count: int = 0
    is_wishlisted: bool = False
    is_in_cart: bool = False


class ProductListRead(_ProductComputedMixin):
    """
    Lightweight product schema for gallery listing pages.
    Omits description, meta fields, and admin-only data.
    Includes computed price and primary_image for card display.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    slug: str
    short_description: str | None
    medium: ProductMediumRead | None = None
    style: str | None
    subject: str | None
    category: ProductCategoryRead | None = None
    is_featured: bool
    is_original_available: bool
    is_framed: bool
    certificate_of_authenticity: bool
    status: ProductStatus
    created_at: datetime


# class ProductCardRead(BaseModel):
#     model_config = ConfigDict(from_attributes=True)

#     id: int
#     title: str
#     slug: str
#     short_description: str | None = None

#     medium: ProductMediumRead | None = None
#     category: ProductCategoryRead | None = None

#     variant: ProductVariantRead | None = None
#     image: ProductImageRead | None = None

#     @computed_field
#     @property
#     def price(self) -> Decimal | None:
#         return self.variant.price if self.variant else 0.00

#     @computed_field
#     @property
#     def primary_image(self) -> str | None:
#         return self.image.image_url if self.image else None


class ProductCardRead(ProductBase):
    price: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)

    primary_image: str | None = None

    average_rating: float = 0.0
    review_count: int = 0
    sold_count: int = 0
    is_wishlisted: bool = False
    is_in_cart: bool = False


class ProductCardJoinRead(ProductBase):
    variant: ProductVariantRead | None = Field(
        default=None,
        exclude=True,
    )

    image: ProductImageRead | None = Field(
        default=None,
        exclude=True,
    )

    @computed_field
    @property
    def price(self) -> Decimal:
        return self.variant.price if self.variant else Decimal("0.00")

    @computed_field
    @property
    def primary_image(self) -> str | None:
        return self.image.image_url if self.image else None


class ProductCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Paintings"])

    slug: str | None = Field(None, max_length=120)

    description: str | None = Field(
        None, max_length=255, examples=["Original paintings and artwork"]
    )

    is_active: bool = True

    @model_validator(mode="after")
    def auto_slug(self):
        if not self.slug:
            self.slug = slugify(self.name)

        return self


class ProductCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)

    slug: str | None = Field(None, max_length=120)

    description: str | None = Field(None, max_length=255)

    is_active: bool | None = None


class ProductCategoryRead(TimestampSchemaRead):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool
