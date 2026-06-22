import type { Metadata } from "next";
import { unwrap } from "@/api/client-service";
import { coursesGetCourse } from "@/api/openapi-client";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, siteUrl } from "@/lib/seo";

type CourseDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function fetchCourseBySlug(slug: string) {
  try {
    return await unwrap(coursesGetCourse({ path: { slug } }));
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await fetchCourseBySlug(slug);

  if (!course) {
    return buildMetadata({
      title: "Course Not Found",
      description:
        "The requested course could not be found in the Artist Kashi academy.",
      path: `/courses/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${course.title} - Masterclass`,
    description: course.short_description ?? `Learn with Artist Kashi.`,
    path: `/courses/${course.slug}`,
    type: "article",
    image: course.computed_thumbnail_url ?? undefined,
    keywords: [
      course.title,
      course.level ?? "intermediate",
      "painting course",
      "art masterclass",
    ],
  });
}

export default async function CourseDetailLayout({
  children,
  params,
}: CourseDetailLayoutProps) {
  const { slug } = await params;
  const course = await fetchCourseBySlug(slug);

  const schema = course
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: course.title,
        description: course.short_description ?? "",
        provider: {
          "@type": "Organization",
          name: "Artist Kashi",
          url: siteUrl,
        },
        image: course.computed_thumbnail_url
          ? [course.computed_thumbnail_url]
          : [],
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: course.price,
          category: "Online Course",
          url: `${siteUrl}/courses/${course.slug}`,
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Course Not Found",
        url: `${siteUrl}/courses/${slug}`,
      };

  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
