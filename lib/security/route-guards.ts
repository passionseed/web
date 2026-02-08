import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type GuardResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

function isDebugRoutesEnabled(): boolean {
  return process.env.DEBUG_ROUTES_ENABLED === "true";
}

export function safeServerError(
  message = "Internal server error",
  error?: unknown
) {
  if (process.env.NODE_ENV !== "production" && error) {
    console.error(message, error);
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function requireUser(): Promise<
  | { ok: true; value: GuardResult }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true,
    value: {
      supabase,
      userId: user.id,
    },
  };
}

export async function requireAdmin(): Promise<
  | { ok: true; value: GuardResult }
  | { ok: false; response: NextResponse }
> {
  const userCheck = await requireUser();
  if (!userCheck.ok) return userCheck;

  const { supabase, userId } = userCheck.value;

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);

  if (error || !roles || roles.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, value: { supabase, userId } };
}

export async function requireDebugAccess(): Promise<
  | { ok: true; value: GuardResult }
  | { ok: false; response: NextResponse }
> {
  if (!isDebugRoutesEnabled()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return adminCheck;
}
