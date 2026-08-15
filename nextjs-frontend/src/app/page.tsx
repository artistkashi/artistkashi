import {
  defaultHomeSettings,
  type HomePageSettings,
} from "@/lib/home-customization";
import { siteConfigGetHomePageSettings } from "@/api/openapi-client";
import { HomePageClient } from "@/components/home/HomePageClient";
import { unwrap } from "@/api/client-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const settings = await unwrap(siteConfigGetHomePageSettings());
    return (
      <HomePageClient
        initialSettings={(settings || defaultHomeSettings) as HomePageSettings}
      />
    );
  } catch {
    return <HomePageClient initialSettings={defaultHomeSettings} />;
  }
}
