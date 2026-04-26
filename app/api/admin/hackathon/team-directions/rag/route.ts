import { NextResponse } from "next/server";
import { askTeamDirections } from "@/lib/embeddings/rag";

async function requireAdminUser() {
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const { question, aspect, topK } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const result = await askTeamDirections(question, { aspect, topK });

    return NextResponse.json(result);
  } catch (error) {
    console.error("RAG error:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
