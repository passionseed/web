import { HomePage } from "@/components/home/HomePage";
import { shiftHighSessionLine } from "@/lib/content/shift-high";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { createAdminClient } from "@/utils/supabase/admin";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * The real "น้องๆ ที่เราได้ดูแล" figure for the landing testimonials: every
 * profile, one per registered user including anonymous trial accounts. The
 * service role is required because profiles RLS reads for authenticated
 * users only, while the landing page is public. Only the count ever leaves
 * the server.
 *
 * Cached for an hour so the public page does not hit the database on every
 * visit. Failures throw instead of returning null: unstable_cache stores
 * whatever returns, and a cached null would pin the section to its fallback
 * copy for the whole hour. A throw is not cached, so the next visit retries.
 */
const getStudentCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(`profiles count failed: ${error.message}`);
    return count ?? 0;
  },
  ["student-count"],
  { revalidate: 3600 }
);

/**
 * The weekly SHIFT High slot. loadAlumniCalendar never throws: it falls back
 * to the defaults in code, which is also what gets cached if the read fails.
 */
const getSessionLine = unstable_cache(
  async (): Promise<string> => shiftHighSessionLine((await loadAlumniCalendar()).doc.defaults),
  ["shift-high-session-line"],
  { revalidate: 3600 }
);

export default async function Home() {
  const [studentCount, sessionLine] = await Promise.all([
    getStudentCount().catch(() => null),
    getSessionLine(),
  ]);

  return <HomePage studentCount={studentCount} sessionLine={sessionLine} />;
}
