import * as z from "zod";

const statSchema = z.object({
  label: z.string().max(50, "Label too long"),
  value: z.string().max(20, "Value too long"),
});

const faqItemSchema = z.object({
  question: z.string().max(200, "Question too long"),
  answer: z.string().max(1000, "Answer too long"),
});

const testimonialSchema = z.object({
  name: z.string().max(50, "Name too long"),
  role: z.string().max(50, "Role too long"),
  text: z.string().max(500, "Text too long"),
  rating: z.number().min(1).max(5),
  avatar: z.string().max(10),
});

const communitySchema = z.object({
  label: z.string().max(50, "Label too long"),
  title: z.string().max(150, "Title too long"),
  description: z.string().max(400, "Description too long"),
  items: z.array(testimonialSchema),
});

export const homePageSchema = z.object({
  // Hero Section
  hero: z.object({
    title: z.string().max(150, "Title is too long"),
    subtitle: z.string().max(300, "Description is too long"),
    primaryBtnText: z.string().max(30, "Button text too long"),
    primaryBtnLink: z.string().max(100),
    ghostBtnText: z.string().max(30, "Button text too long"),
    ghostBtnLink: z.string().max(100),
    mediaType: z.enum(["image", "video"]),
    mediaUrl: z.string().max(500, "URL too long"),
    stats: z.array(statSchema).max(4),
  }),

  // Featured Sections
  featuredPaintings: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    items: z.array(z.string()),
  }),

  featuredCourses: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    items: z.array(z.string()),
  }),

  collection: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    items: z.array(z.string()),
  }),

  bestSellers: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    items: z.array(z.string()),
  }),

  // About Instructor Section
  about: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    description1: z.string().max(600, "Paragraph 1 too long"),
    description2: z.string().max(600, "Paragraph 2 too long"),
    description3: z.string().max(600, "Paragraph 3 too long"),
    instructorName: z.string().max(50, "Name too long"),
    instructorRole: z.string().max(50, "Role too long"),
    image: z.string().max(500, "URL too long"),
    stats: z.array(statSchema).max(4),
  }),

  // Video CTA Section
  videoCta: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    bgImage: z.string().max(500, "URL too long"),
    videoUrl: z.string().max(500, "URL too long"),
  }),

  // FAQ Section
  faq: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    description: z.string().max(400, "Description too long"),
    items: z.array(faqItemSchema),
  }),

  community: communitySchema,

  // CTA Banner (Bottom)
  banner: z.object({
    label: z.string().max(50, "Label too long"),
    title: z.string().max(150, "Title too long"),
    description: z.string().max(400, "Description too long"),
    primaryBtnText: z.string().max(30, "Button text too long"),
    primaryBtnLink: z.string().max(100),
    ghostBtnText: z.string().max(30, "Button text too long"),
    ghostBtnLink: z.string().max(100),
  }),

  // Footer (social links)
  footer: z.object({
    socials: z.array(
      z.object({
        platform: z.string().max(30, "Platform too long"),
        url: z.string().max(500, "URL too long"),
      })
    ),
  }),
});

export type HomePageSettings = z.infer<typeof homePageSchema>;

// These will be fetched from API now
export const defaultHomeSettings: HomePageSettings = {
  hero: {
    title: "Paint.\nCollect.\nMaster.",
    subtitle:
      "A singular platform for those who take the painted world seriously — original works, masterclass curriculum, and an uncompromising aesthetic.",
    primaryBtnText: "Begin Learning",
    primaryBtnLink: "/courses",
    ghostBtnText: "View Paintings",
    ghostBtnLink: "/shop",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1774126512715-5a8858c579c9?w=1800&h=1100&fit=crop&auto=format",
    stats: [
      { value: "340+", label: "Original Works" },
      { value: "12K+", label: "Enrolled Students" },
      { value: "94", label: "Lesson Hours" },
      { value: "4.9", label: "Avg. Rating" },
    ],
  },
  featuredPaintings: {
    label: "Original Works",
    title: "Paintings\nAvailable Now",
    items: [],
  },
  featuredCourses: {
    label: "Masterclass Series",
    title: "Learn from\nMaster Painters",
    items: [],
  },
  collection: {
    label: "The Gallery",
    title: "Works in the\nCollection",
    items: [],
  },
  bestSellers: {
    label: "Most Collected",
    title: "Best Sellers",
    items: [],
  },
  about: {
    label: "The Artist Behind the Vision",
    title: "Mastering the Art of Visual Storytelling",
    description1:
      "With over two decades of professional experience in contemporary oil painting and classical Artist techniques, Kashi has dedicated his life to the pursuit of artistic excellence and the preservation of master-level craftsmanship.",
    description2:
      "His work is characterized by a profound understanding of light, shadow, and the emotional resonance of color. As the founder of Artist Kashi Academy, he bridges the gap between traditional methods and modern expression, empowering thousands of students globally to find their unique voice.",
    description3:
      "Kashi's philosophy centers on the belief that technical mastery is the foundation of true creative freedom. Through his uncompromising curriculum, he provides the tools necessary for serious artists to transcend mere representation and create works of lasting impact.",
    instructorName: "Kashi",
    instructorRole: "Lead Instructor",
    image: "/images/ak.png",
    stats: [
      { label: "Experience", value: "20+ Yrs" },
      { label: "Students", value: "12K+" },
      { label: "Exhibitions", value: "45+" },
    ],
  },
  videoCta: {
    label: "Inside the Studio",
    title: "Watch How a Painting Comes to Life",
    bgImage:
      "https://images.unsplash.com/photo-1775346098886-72ab6697b331?w=1400&h=600&fit=crop&auto=format",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  faq: {
    label: "Questions",
    title: "Frequently Asked",
    description:
      "Everything you need to know about collecting original works and enrolling in our masterclass curriculum.",
    items: [
      {
        question: "How do I enroll?",
        answer:
          "Simply browse our courses and click the Begin Learning button to start your journey.",
      },
    ],
  },
  community: {
    label: "Voices",
    title: "What Our Community Says",
    description:
      "Reviews are curated and moderated by the admin team until direct user submissions are added.",
    items: [
      {
        name: "Elena M.",
        role: "Collector",
        text: "The depth of color in these works is unmatched.",
        rating: 5,
        avatar: "EM",
      },
      {
        name: "David Miller",
        role: "Hobbyist, New York",
        text: "The community support here is amazing. I got detailed feedback on my first abstract piece from the instructor within 48 hours.",
        rating: 4,
        avatar: "DM",
      },
    ],
  },
  banner: {
    label: "Begin Your Journey",
    title: "The Canvas\nAwaits You",
    description:
      "Join a community of serious painters and collectors who have made Artist Kashi their studio, gallery, and academy.",
    primaryBtnText: "Explore Courses",
    primaryBtnLink: "/courses",
    ghostBtnText: "Browse Originals",
    ghostBtnLink: "/shop",
  },
  footer: {
    socials: [],
  },
};
