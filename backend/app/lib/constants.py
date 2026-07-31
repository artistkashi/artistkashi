from app.schemas.site_config import (
    AboutSection,
    AboutStat,
    BannerSection,
    CommunitySection,
    FaqItem,
    FaqSection,
    FeaturedSection,
    FooterSection,
    HeroSection,
    HeroStat,
    HomePageConfig,
    TestimonialItem,
    VideoCtaSection,
)

DEFAULT_HOME_PAGE_CONFIG = HomePageConfig(
    hero=HeroSection(
        title="Paint.\nCollect.\nMaster.",
        subtitle=(
            "A singular platform for those who take the painted world seriously "
            "— original works, masterclass curriculum, and an uncompromising aesthetic."
        ),
        primaryBtnText="Begin Learning",
        primaryBtnLink="/courses",
        ghostBtnText="View Paintings",
        ghostBtnLink="/shop",
        mediaType="image",
        mediaUrl="https://images.unsplash.com/photo-1774126512715-5a8858c579c9?w=1800&h=1100&fit=crop&auto=format",
        stats=[
            HeroStat(value="340+", label="Original Works"),
            HeroStat(value="12K+", label="Enrolled Students"),
            HeroStat(value="94", label="Lesson Hours"),
            HeroStat(value="4.9", label="Avg. Rating"),
        ],
    ),
    featuredPaintings=FeaturedSection(
        label="Original Works",
        title="Paintings\nAvailable Now",
        items=[],
    ),
    featuredCourses=FeaturedSection(
        label="Masterclass Series",
        title="Learn from\nMaster Painters",
        items=[],
    ),
    collection=FeaturedSection(
        label="The Gallery",
        title="Works in the\nCollection",
        items=[],
    ),
    bestSellers=FeaturedSection(
        label="Most Collected",
        title="Best Sellers",
        items=[],
    ),
    about=AboutSection(
        label="The Artist Behind the Vision",
        title="Mastering the Art of Visual Storytelling",
        description1=(
            "With over two decades of professional experience in contemporary oil painting "
            "and classical Artist techniques, Kashi has dedicated his life to the pursuit "
            "of artistic excellence and the preservation of master-level craftsmanship."
        ),
        description2=(
            "His work is characterized by a profound understanding of light, shadow, and the "
            "emotional resonance of color. As the founder of Artist Kashi Academy, he bridges "
            "the gap between traditional methods and modern expression, empowering thousands "
            "of students globally to find their unique voice."
        ),
        description3=(
            "Kashi's philosophy centers on the belief that technical mastery is the foundation "
            "of true creative freedom. Through his uncompromising curriculum, he provides the "
            "tools necessary for serious artists to transcend mere representation and create "
            "works of lasting impact."
        ),
        instructorName="Kashi",
        instructorRole="Lead Instructor",
        image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop&auto=format",
        stats=[
            AboutStat(label="Experience", value="20+ Yrs"),
            AboutStat(label="Students", value="12K+"),
            AboutStat(label="Exhibitions", value="45+"),
        ],
    ),
    videoCta=VideoCtaSection(
        label="Inside the Studio",
        title="Watch How a Painting Comes to Life",
        bgImage="https://images.unsplash.com/photo-1775346098886-72ab6697b331?w=1400&h=600&fit=crop&auto=format",
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ",
    ),
    faq=FaqSection(
        label="Questions",
        title="Frequently Asked",
        description="Everything you need to know about collecting original works and enrolling in our masterclass curriculum.",
        items=[
            FaqItem(
                question="How do I enroll?",
                answer="Simply browse our courses and click the Begin Learning button to start your journey.",
            )
        ],
    ),
    community=CommunitySection(
        label="Voices",
        title="What Our Community Says",
        description="Reviews are curated and moderated by the admin team until direct user submissions are added.",
        items=[
            TestimonialItem(
                name="Elena M.",
                role="Collector",
                text="The depth of color in these works is unmatched.",
                rating=5,
                avatar="EM",
            ),
            TestimonialItem(
                name="David Miller",
                role="Hobbyist, New York",
                text="The community support here is amazing. I got detailed feedback on my first abstract piece from the instructor within 48 hours.",
                rating=4,
                avatar="DM",
            ),
        ],
    ),
    banner=BannerSection(
        label="Begin Your Journey",
        title="The Canvas\nAwaits You",
        description="Join a community of serious painters and collectors who have made Artist Kashi their studio, gallery, and academy.",
        primaryBtnText="Explore Courses",
        primaryBtnLink="/courses",
        ghostBtnText="Browse Originals",
        ghostBtnLink="/shop",
    ),
    footer=FooterSection(socials=[]),
)

DEFAULT_REVIEWS = [
    {
        "type": "site",
        "rating": 5,
        "text": "The depth of color in these works is unmatched. A truly transformative experience.",
        "entity_id": None,
    },
    {
        "type": "site",
        "rating": 5,
        "text": "The community support here is amazing. I got detailed feedback on my first abstract piece from the instructor within 48 hours.",
        "entity_id": None,
    },
    {
        "type": "site",
        "rating": 4,
        "text": "Excellent curriculum structure and the instructors are incredibly knowledgeable. Highly recommended for serious artists.",
        "entity_id": None,
    },
    {
        "type": "product",
        "entity_id": 1,
        "rating": 5,
        "text": "The oil painting is even more stunning in person. Worth every penny.",
        "entity_id": 1,
    },
    {
        "type": "painting",
        "entity_id": 1,
        "rating": 5,
        "text": "Solitude in Ochre captures something truly special. The composition and color harmony are exceptional.",
        "entity_id": 1,
    },
]
