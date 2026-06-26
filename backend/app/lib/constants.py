from app.schemas.site_config import (
    AboutSection,
    AboutStat,
    BannerSection,
    CommunitySection,
    FaqItem,
    FaqSection,
    FeaturedSection,
    HeroSection,
    HeroStat,
    HomePageConfig,
    TestimonialItem,
    VideoCtaSection,
)

DEFAULT_PAINTINGS = [
    {
        "id": 1,
        "title": "Solitude in Ochre",
        "medium": "Oil on linen, 120 x 90 cm",
        "price": 4800,
        "image": "https://images.unsplash.com/photo-1541512416146-3cf58d6b27cc?w=600&h=750&fit=crop&auto=format",
        "sold": False,
    },
    {
        "id": 2,
        "title": "The Weight of Silence",
        "medium": "Oil on canvas, 100 x 80 cm",
        "price": 3600,
        "image": "https://images.unsplash.com/photo-1566410824233-a8011929225c?w=600&h=750&fit=crop&auto=format",
        "sold": False,
    },
    {
        "id": 3,
        "title": "Nocturne No. 7",
        "medium": "Acrylic on board, 60 x 80 cm",
        "price": 2200,
        "image": "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?w=600&h=750&fit=crop&auto=format",
        "sold": True,
    },
    {
        "id": 4,
        "title": "Cartography of Feeling",
        "medium": "Mixed media, 150 x 120 cm",
        "price": 6400,
        "image": "https://images.unsplash.com/photo-1570475754561-4effe71c5084?w=600&h=750&fit=crop&auto=format",
        "sold": False,
    },
    {
        "id": 5,
        "title": "Ephemeral Dawn",
        "medium": "Oil on panel, 50 x 70 cm",
        "price": 1850,
        "image": "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=750&fit=crop&auto=format",
        "sold": False,
    },
    {
        "id": 6,
        "title": "Structure of Memory",
        "medium": "Mixed media on canvas, 120 x 120 cm",
        "price": 5200,
        "image": "https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=750&fit=crop&auto=format",
        "sold": False,
    },
    {
        "id": 7,
        "title": "The Quiet Hour",
        "medium": "Watercolor on paper, 40 x 60 cm",
        "price": 950,
        "image": "https://images.unsplash.com/photo-1582721691120-d1db3852893e?w=600&h=750&fit=crop&auto=format",
        "sold": True,
    },
    {
        "id": 8,
        "title": "Resonance in Blue",
        "medium": "Acrylic on linen, 90 x 110 cm",
        "price": 3100,
        "image": "https://images.unsplash.com/photo-1612733399020-e2194e3dbfda?w=600&h=750&fit=crop&auto=format",
        "sold": False,
    },
]

DEFAULT_COURSES = [
    {
        "id": 1,
        "title": "Oil Painting Fundamentals",
        "subtitle": "From blank canvas to confident composition",
        "instructor": "Elena Marchetti",
        "level": "Beginner",
        "lessons": 42,
        "hours": "18h 30m",
        "students": 2847,
        "rating": 4.9,
        "price": 280,
        "image": "https://images.unsplash.com/photo-1621975496579-6bd9e8c6ab65?w=700&h=420&fit=crop&auto=format",
        "tags": ["Oil", "Composition", "Color Theory"],
    },
    {
        "id": 2,
        "title": "Advanced Portrait Mastery",
        "subtitle": "Light, likeness, and emotional depth in portraiture",
        "instructor": "James Okafor",
        "level": "Advanced",
        "lessons": 58,
        "hours": "26h 15m",
        "students": 1203,
        "rating": 4.8,
        "price": 420,
        "image": "https://images.unsplash.com/photo-1774126512715-5a8858c579c9?w=700&h=420&fit=crop&auto=format",
        "tags": ["Portrait", "Oil", "Anatomy"],
    },
    {
        "id": 3,
        "title": "Abstract Expression Workshop",
        "subtitle": "Finding your visual language through abstraction",
        "instructor": "Sofia Reyes",
        "level": "Intermediate",
        "lessons": 31,
        "hours": "14h 00m",
        "students": 1876,
        "rating": 4.7,
        "price": 195,
        "image": "https://images.unsplash.com/photo-1566410824233-a8011929225c?w=700&h=420&fit=crop&auto=format",
        "tags": ["Abstract", "Acrylic", "Texture"],
    },
    {
        "id": 4,
        "title": "The Art of Still Life",
        "subtitle": "Mastering light, shadow, and texture",
        "instructor": "Marcus Vane",
        "level": "Beginner",
        "lessons": 24,
        "hours": "10h 45m",
        "students": 3420,
        "rating": 4.9,
        "price": 150,
        "image": "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?w=700&h=420&fit=crop&auto=format",
        "tags": ["Still Life", "Charcoal", "Light"],
    },
    {
        "id": 5,
        "title": "Color Theory for Modernists",
        "subtitle": "Unlocking the emotional power of palette",
        "instructor": "Sarah Jenkins",
        "level": "Intermediate",
        "lessons": 18,
        "hours": "8h 20m",
        "students": 5600,
        "rating": 5.0,
        "price": 120,
        "image": "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=700&h=420&fit=crop&auto=format",
        "tags": ["Color", "Theory", "History"],
    },
]

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
        items=[1, 2, 3, 4],
    ),
    featuredCourses=FeaturedSection(
        label="Masterclass Series",
        title="Learn from\nMaster Painters",
        items=[1, 2, 3],
    ),
    collection=FeaturedSection(
        label="The Gallery",
        title="Works in the\nCollection",
        items=[1, 2, 4, 5, 6],
    ),
    bestSellers=FeaturedSection(
        label="Most Collected",
        title="Best Sellers",
        items=[1, 2],
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
)

# Default review data for community section
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
