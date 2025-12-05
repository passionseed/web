import { getMapsWithStatsServer } from "@/lib/supabase/maps-server";
import { MapsClientPage } from "./client-page";

// OPTIMIZATION: Server component that pre-fetches initial data
export const dynamic = "force-dynamic";

export default async function MapsPage() {
  try {
    // Fetch first page of maps on the server for better performance
    const initialData = await getMapsWithStatsServer(0, 20);

    return <MapsClientPage initialData={initialData} />;
  } catch (error) {
    console.error("Error fetching initial maps data:", error);
    
    // Fallback to client-side loading if server fetch fails
    return <MapsClientPage initialData={null} />;
  }
}