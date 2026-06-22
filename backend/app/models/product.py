import enum
import uuid
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.models.base import Base, TimestampMixin


class ProductMedium(Base, TimestampMixin):
    """
    Oil
    Watercolor
    Acrylic
    Pencil Drawing
    Charcoal
    Digital Art
    """

    __tablename__ = "product_mediums"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    products = relationship("Product", back_populates="medium")


class VariantType(Base, TimestampMixin):
    """
    Original
    A4 Print
    A3 Print
    Canvas Print
    Framed Print
    """

    __tablename__ = "variant_types"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    variants = relationship("ProductVariant", back_populates="variant_type")


class ProductStatus(enum.StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SOLD_OUT = "sold_out"
    ARCHIVED = "archived"


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )

    medium_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_mediums.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True
    )

    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    year_created: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_original_available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_framed: Mapped[bool] = mapped_column(Boolean, default=False)
    certificate_of_authenticity: Mapped[bool] = mapped_column(Boolean, default=False)
    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ProductStatus] = mapped_column(
        Enum(
            ProductStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]
        ),
        default=ProductStatus.DRAFT,
        nullable=False,
    )
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    medium = relationship("ProductMedium", back_populates="products")

    variants = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan"
    )

    images = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan"
    )
    category = relationship(
        "ProductCategory",
        back_populates="products",
    )


class ImageSourceType(enum.Enum):
    UPLOAD = "upload"
    EXTERNAL_URL = "external_url"


class ProductImage(Base, TimestampMixin):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE")
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    source_type: Mapped[ImageSourceType] = mapped_column(
        Enum(
            ImageSourceType,
            values_callable=lambda obj: [e.value for e in obj],
            name="image_source_type",
        ),
        default=ImageSourceType.EXTERNAL_URL,
        nullable=False,
    )

    product = relationship("Product", back_populates="images")


class DimensionUnit(enum.StrEnum):
    CM = "cm"
    INCH = "inch"
    MM = "mm"


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "variant_type_id",
            "width",
            "height",
            name="uq_product_variant_dimension",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE")
    )
    variant_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("variant_types.id", ondelete="SET NULL")
    )

    width: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    height: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    dimension_unit: Mapped[DimensionUnit] = mapped_column(
        Enum(
            DimensionUnit,
            values_callable=lambda obj: [e.value for e in obj],
            name="dimensionunit",
        ),
        default=DimensionUnit.CM,
    )

    sku: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    product = relationship("Product", back_populates="variants")

    variant_type = relationship("VariantType", back_populates="variants")


class ProductCategory(Base, TimestampMixin):
    """
    Landscape
    Portrait
    Nature
    Abstract
    Spiritual
    Animals
    Modern Art
    Traditional Art
    Still Life
    """

    __tablename__ = "product_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    products = relationship("Product", back_populates="category")
