import { HeroSection } from "@/components/hero-section";
import { FeatureSection } from "@/components/feature-section";
import { WorkshopCategories } from "@/components/workshop-categories";
import { CommunitySection } from "@/components/community-section";
import { Layout } from "@/components/layout";
import { DashboardHome } from "@/components/dashboard-home";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <>
      {user ? (
        <DashboardHome user={user} />
      ) : (
        <>
          <HeroSection />
          <FeatureSection />
          <WorkshopCategories />
          <CommunitySection />
        </>
      )}
    </>
  );
}
