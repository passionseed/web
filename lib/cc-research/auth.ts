import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export interface CcAuthResult {
  authorized: boolean;
  status: 200 | 401 | 403;
  error: string | null;
  supabase?: SupabaseClient;
  userId?: string;
}

export async function requireCCResearchAccess(): Promise<CcAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized",
      supabase,
    };
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    return {
      authorized: false,
      status: 500,
      error: "Role lookup failed",
      supabase,
      userId: user.id,
    };
  }

  const isTeamMember = (roles || []).some((entry) => entry.role === "passion-seed-team");

  if (!isTeamMember) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden",
      supabase,
      userId: user.id,
    };
  }

  return {
    authorized: true,
    status: 200,
    error: null,
    supabase,
    userId: user.id,
  };
}
