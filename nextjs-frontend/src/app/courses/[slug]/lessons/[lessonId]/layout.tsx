import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lesson Player | Artist Kashi",
  robots: { index: false },
};

export default function LessonPlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
