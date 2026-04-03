import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function checkAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();
  return !!data;
}

export async function GET(req: NextRequest) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin
    .from("hackathon_participants")
    .select("name, email, phone, university, track, grade_level, team_name, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const headers = ["name", "email", "phone", "university", "track", "grade_level", "team_name", "created_at"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h as keyof typeof r])).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="hackathon-participants-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
