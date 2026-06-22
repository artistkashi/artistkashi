import {
  type CourseLevel,
  type CourseRead,
  type FaqItem,
  type ProductCardRead,
  type TestimonialItem,
} from "@/api/openapi-client";

const now = new Date().toISOString();

export const PAINTINGS: ProductCardRead[] = [
  {
    id: "1",
    title: "Solitude in Ochre",
    slug: "solitude-in-ochre",
    medium: {
      id: 1,
      name: "Oil on linen, 120 × 90 cm",
      slug: "oil",
      is_active: true,
      created_at: now,
    },
    price: "4800",
    primary_image:
      "https://images.unsplash.com/photo-1541512416146-3cf58d6b27cc?w=600&h=750&fit=crop&auto=format",
    is_sold: false,
    status: "published",
  },
  {
    id: "2",
    title: "The Weight of Silence",
    slug: "the-weight-of-silence",
    medium: {
      id: 1,
      name: "Oil on canvas, 100 × 80 cm",
      slug: "oil",
      is_active: true,
      created_at: now,
    },
    price: "3600",
    primary_image:
      "https://images.unsplash.com/photo-1566410824233-a8011929225c?w=600&h=750&fit=crop&auto=format",
    is_sold: false,
    status: "published",
  },
  {
    id: "3",
    title: "Nocturne No. 7",
    slug: "nocturne-no-7",
    medium: {
      id: 2,
      name: "Acrylic on board, 60 × 80 cm",
      slug: "acrylic",
      is_active: true,
      created_at: now,
    },
    price: "2200",
    primary_image:
      "https://images.unsplash.com/photo-1556139930-c23fa4a4f934?w=600&h=750&fit=crop&auto=format",
    is_sold: true,
    status: "sold_out",
  },
];

export const COURSES: CourseRead[] = [
  {
    id: "1",
    title: "Oil Painting Fundamentals",
    slug: "oil-painting-fundamentals",
    short_description: "From blank canvas to confident composition",
    level: "beginner" as CourseLevel,
    language: "English",
    price: "280",
    lessons_count: 42,
    enrollment_count: 2847,
    average_rating: 4.9,
    review_count: 128,
    thumbnail_url:
      "https://images.unsplash.com/photo-1621975496579-6bd9e8c6ab65?w=700&h=420&fit=crop&auto=format",
    computed_thumbnail_url: null,
    computed_demo_video_url: null,
    created_at: now,
    description: "Learn the fundamentals of oil painting.",
    is_featured: true,
    is_published: true,
    total_duration_seconds: 66600,
    category: {
      id: "cat1",
      name: "Oil Painting",
      slug: "oil-painting",
      description: null,
      is_active: true,
      created_at: now,
    },
  },
  {
    id: "2",
    title: "Advanced Portrait Mastery",
    slug: "advanced-portrait-mastery",
    short_description: "Light, likeness, and emotional depth in portraiture",
    level: "advanced" as CourseLevel,
    language: "English",
    price: "420",
    lessons_count: 56,
    enrollment_count: 1203,
    average_rating: 4.8,
    review_count: 89,
    thumbnail_url:
      "https://images.unsplash.com/photo-1774126512715-5a8858c579c9?w=700&h=420&fit=crop&auto=format",
    computed_thumbnail_url: null,
    computed_demo_video_url: null,
    created_at: now,
    description: "Master the art of portraiture.",
    is_featured: false,
    is_published: true,
    total_duration_seconds: 94500,
    category: {
      id: "cat2",
      name: "Portrait",
      slug: "portrait",
      description: null,
      is_active: true,
      created_at: now,
    },
  },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    name: "Amara Nwosu",
    role: "Emerging Artist, Lagos",
    text: "Artist Kashi transformed how I see and work. The lesson player is distraction-free in a way no other platform has managed. I finished three completed paintings in my first month.",
    rating: 5,
    avatar: "AN",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Do I own the artworks I purchase permanently?",
    answer:
      "Yes. Every purchase includes a certificate of provenance, full transfer of ownership, and lifetime access to digital documentation. Physical works ship within 7–14 days in bespoke archival packaging.",
  },
];
