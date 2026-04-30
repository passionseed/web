import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getActiveGradingPrompt,
  updateGradingPrompt,
} from "@/lib/hackathon/grading-prompt";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const prompt = await getActiveGradingPrompt("default");
  if (!prompt)
    return NextResponse.json({ error: "No prompt found" }, { status: 404 });

  return NextResponse.json(prompt);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const template = body?.template;
  if (typeof template !== "string" || !template.trim()) {
    return NextResponse.json(
      { error: "template is required" },
      { status: 400 }
    );
  }

  const updated = await updateGradingPrompt("default", template, admin.id);
  return NextResponse.json(updated);
}
