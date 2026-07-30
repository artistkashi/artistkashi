from typing import Literal

from pydantic import BaseModel, Field


class HeroStat(BaseModel):
    label: str = Field(..., max_length=50)
    value: str = Field(..., max_length=20)


class HeroSection(BaseModel):
    title: str = Field(..., max_length=150)
    subtitle: str = Field(..., max_length=300)
    primaryBtnText: str = Field(..., max_length=30)
    primaryBtnLink: str = Field("/courses", max_length=100)
    ghostBtnText: str = Field(..., max_length=30)
    ghostBtnLink: str = Field("/shop", max_length=100)
    mediaType: Literal["image", "video"] = "image"
    mediaUrl: str = Field(..., max_length=500)
    stats: list[HeroStat] = Field(default_factory=list)


class FeaturedSection(BaseModel):
    label: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    items: list[str] = Field(
        default_factory=list, description="UUIDs of featured products/courses"
    )


class AboutStat(BaseModel):
    label: str = Field(..., max_length=30)
    value: str = Field(..., max_length=20)


class AboutSection(BaseModel):
    label: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    description1: str = Field(..., max_length=600)
    description2: str = Field(..., max_length=600)
    description3: str = Field(..., max_length=600)
    instructorName: str = Field(..., max_length=50)
    instructorRole: str = Field(..., max_length=50)
    image: str = Field(..., max_length=500)
    stats: list[AboutStat] = Field(default_factory=list)


class VideoCtaSection(BaseModel):
    label: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    bgImage: str = Field(..., max_length=500)
    videoUrl: str = Field(..., max_length=500)


class FaqItem(BaseModel):
    question: str = Field(..., max_length=200)
    answer: str = Field(..., max_length=1000)


class FaqSection(BaseModel):
    label: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    description: str = Field(..., max_length=400)
    items: list[FaqItem] = Field(default_factory=list)


class TestimonialItem(BaseModel):
    name: str = Field(..., max_length=50)
    role: str = Field(..., max_length=50)
    text: str = Field(..., max_length=500)
    rating: int = Field(5, ge=1, le=5)
    avatar: str = Field(..., max_length=10)


class CommunitySection(BaseModel):
    label: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    description: str = Field(..., max_length=400)
    items: list[TestimonialItem] = Field(default_factory=list)


class BannerSection(BaseModel):
    label: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    description: str = Field(..., max_length=400)
    primaryBtnText: str = Field(..., max_length=30)
    primaryBtnLink: str = Field("/courses", max_length=100)
    ghostBtnText: str = Field(..., max_length=30)
    ghostBtnLink: str = Field("/shop", max_length=100)


class HomePageConfig(BaseModel):
    hero: HeroSection
    featuredPaintings: FeaturedSection
    featuredCourses: FeaturedSection
    collection: FeaturedSection
    bestSellers: FeaturedSection
    about: AboutSection
    videoCta: VideoCtaSection
    faq: FaqSection
    community: CommunitySection
    banner: BannerSection


class SiteConfigUpdate(BaseModel):
    value: HomePageConfig


class SiteConfigRead(BaseModel):
    key: str
    value: HomePageConfig
    description: str | None = None

    class Config:
        from_attributes = True
