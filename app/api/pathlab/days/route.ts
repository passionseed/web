import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

async function canManageSeed(seedId: string, userId: string) {
  const supabase = await createClient();

  const [{ data: seedData }, { data: rolesData }] = await Promise.all([
    supabase
      .from("seeds")
      .select("id, created_by")
      .eq("id", seedId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "instructor"]),
  ]);

  const isAdminOrInstructor = !!rolesData?.length;
  const isSeedCreator = seedData?.created_by === userId;

  return isAdminOrInstructor || isSeedCreator;
}

async function canManagePath(pathId: string, userId: string) {
  const supabase = await createClient();

  const [{ data: pathData }, { data: rolesData }] = await Promise.all([
    supabase
      .from("paths")
      .select("id, created_by, seed:seeds!inner(id, created_by)")
      .eq("id", pathId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "instructor"]),
  ]);

  const isAdminOrInstructor = !!rolesData?.length;
  const isPathCreator = pathData?.created_by === userId;
  const isSeedCreator = (pathData as any)?.seed?.created_by === userId;

  return isAdminOrInstructor || isPathCreator || isSeedCreator;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seedId = searchParams.get("seedId");

    if (!seedId) {
      return NextResponse.json({ error: "seedId is required" }, { status: 400 });
    }

    const allowed = await canManageSeed(seedId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the path for this seed
    const { data: path } = await supabase
      .from("paths")
      .select("id")
      .eq("seed_id", seedId)
      .maybeSingle();

    if (!path) {
      return NextResponse.json({ days: [] });
    }

    // Get path days
    const { data: days, error: daysError } = await supabase
      .from("path_days")
      .select("*")
      .eq("path_id", path.id)
      .order("day_number", { ascending: true });

    if (daysError) {
      throw daysError;
    }

    return NextResponse.json({ days: days || [], pathId: path.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch path days" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const pathId = body?.pathId as string | undefined;
    const totalDays = Number(body?.totalDays);
    const days = Array.isArray(body?.days) ? body.days : [];
    const allowDestructive = body?.allowDestructive === true;

    if (!pathId || !Number.isFinite(totalDays) || totalDays <= 0) {
      return NextResponse.json(
        { error: "pathId and valid totalDays are required" },
        { status: 400 }
      );
    }

    const allowed = await canManagePath(pathId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Safety guard: block accidental single-page overwrite of multi-page paths.
    // This catches the exact failure mode where a single page save calls this bulk endpoint.
    const { data: existingPath, error: existingPathError } = await supabase
      .from("paths")
      .select("id, total_days")
      .eq("id", pathId)
      .single();

    if (existingPathError || !existingPath) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    const incomingDayCount = days.length;
    const looksLikeAccidentalSinglePageOverwrite =
      existingPath.total_days > 1 &&
      totalDays === 1 &&
      incomingDayCount === 1 &&
      Number(days[0]?.day_number) === 1;

    if (looksLikeAccidentalSinglePageOverwrite && !allowDestructive) {
      return NextResponse.json(
        {
          error:
            "Blocked potentially destructive save: received single-page payload for a multi-page path. Use the per-day PATCH endpoint or pass allowDestructive=true only if this is intentional.",
        },
        { status: 409 }
      );
    }

    const normalizedDays = days
      .filter((day: any) => Number.isFinite(Number(day.day_number)))
      .map((day: any) => ({
        path_id: pathId,
        day_number: Number(day.day_number),
        title: typeof day.title === "string" ? day.title.trim() || null : null,
        context_text: String(day.context_text || "").trim() || `Day ${day.day_number}`,
        reflection_prompts: Array.isArray(day.reflection_prompts)
          ? day.reflection_prompts.map((prompt: any) => String(prompt)).filter(Boolean)
          : [],
        node_ids: Array.isArray(day.node_ids) ? day.node_ids : [],
      }))
      .sort((a: any, b: any) => a.day_number - b.day_number);

    const dayNumbers = normalizedDays.map((day: any) => day.day_number);

    const { error: pathUpdateError } = await supabase
      .from("paths")
      .update({ total_days: totalDays })
      .eq("id", pathId);
    if (pathUpdateError) {
      throw pathUpdateError;
    }

    if (dayNumbers.length > 0) {
      const { error: deleteError } = await supabase
        .from("path_days")
        .delete()
        .eq("path_id", pathId)
        .not("day_number", "in", `(${dayNumbers.join(",")})`);

      if (deleteError) {
        throw deleteError;
      }
    } else {
      const { error: deleteAllError } = await supabase
        .from("path_days")
        .delete()
        .eq("path_id", pathId);
      if (deleteAllError) {
        throw deleteAllError;
      }
    }

    if (normalizedDays.length > 0) {
      const { error: upsertError } = await supabase
        .from("path_days")
        .upsert(normalizedDays, { onConflict: "path_id,day_number" });

      if (upsertError) {
        throw upsertError;
      }
    }

    const { data: savedDays, error: savedDaysError } = await supabase
      .from("path_days")
      .select("*")
      .eq("path_id", pathId)
      .order("day_number", { ascending: true });

    if (savedDaysError) {
      throw savedDaysError;
    }

    return NextResponse.json({ success: true, days: savedDays || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save path days" },
      { status: 500 }
    );
  }
}
