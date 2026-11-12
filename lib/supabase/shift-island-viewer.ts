import { islandSeasonPhase } from "@/lib/content/shift-island";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { getIslandRsvp } from "@/lib/supabase/shift-island-rsvps";
import { findLinkedApplication, getAlumniMember } from "@/lib/supabase/shift-alumni-members";
import {
  islandDiscordUrl,
  islandViewer,
  type IslandViewer,
  type IslandViewerInput,
} from "@/lib/shift/islandInvite";
import { createClient } from "@/utils/supabase/server";

export interface IslandViewerState {
  viewer: IslandViewer;
  userId: string | null;
  input: IslandViewerInput;
}

async function hasRsvp(userId: string): Promise<boolean> {
  try {
    return (await getIslandRsvp(userId)) !== null;
  } catch (error) {
    // Table not migrated yet: show the page as if nobody had RSVPed.
    console.error("shift island rsvp lookup failed", error);
    return false;
  }
}

export async function loadIslandViewer(): Promise<IslandViewerState> {
  const phase = islandSeasonPhase();
  const discordUrl = islandDiscordUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isAnonymousUser(user)) {
    const input: IslandViewerInput = {
      user: user ? { anonymous: true } : null,
      isAdmin: false,
      member: null,
      linkedApplication: null,
      rsvp: false,
      phase,
    };
    return { viewer: islandViewer(input, discordUrl), userId: null, input };
  }

  const [{ data: roles }, member, rsvp] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1),
    getAlumniMember(user.id),
    hasRsvp(user.id),
  ]);
  const linkedApplication = member ? null : await findLinkedApplication(user.id);

  const input: IslandViewerInput = {
    user: { anonymous: false },
    isAdmin: Boolean(roles?.length),
    member: member ? { nickname: member.nickname, cohort: member.cohort, status: member.status } : null,
    linkedApplication: linkedApplication
      ? { nickname: linkedApplication.nickname, cohort: linkedApplication.cohort }
      : null,
    rsvp,
    phase,
  };
  return { viewer: islandViewer(input, discordUrl), userId: user.id, input };
}
