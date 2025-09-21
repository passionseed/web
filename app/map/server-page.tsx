import { getMapsWithStats } from "@/lib/supabase/maps";
import { MapsClientPage } from "./client-page";

// OPTIMIZATION: Server component that pre-fetches initial data
export default async function MapsServerPage() {
  try {
    // Fetch first page of maps on the server
    const initialData = await getMapsWithStats(0, 20);

    return <MapsClientPage initialData={initialData} />;
  } catch (error) {
    console.error("Error fetching initial maps data:", error);
    
    // Fallback to client-side loading if server fetch fails
    return <MapsClientPage initialData={null} />;
  }
}