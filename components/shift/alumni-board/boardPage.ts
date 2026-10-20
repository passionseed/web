import { redirect } from "next/navigation";

import { alumniLoginHref } from "@/lib/shift/alumniMember";
import { getBoardAccess, type BoardAccess } from "@/lib/supabase/shift-alumni-board/core";

/** Who is looking at a board page. Signed-out visitors go to login and come back here. */
export async function boardAccessFor(path: string): Promise<Exclude<BoardAccess, { kind: "signedOut" }>> {
  const access = await getBoardAccess();
  if (access.kind === "signedOut") redirect(alumniLoginHref(path));
  return access;
}
