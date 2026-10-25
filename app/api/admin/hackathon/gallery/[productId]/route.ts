import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminSetPublished, countPublishedProducts } from "@/lib/hackathon/gallery";
import { recordBrainEvent } from "@/lib/brain/events";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { productId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.is_published !== "boolean") {
    return NextResponse.json({ error: "is_published (boolean) is required" }, { status: 422 });
  }

  try {
    await adminSetPublished(productId, body.is_published);
    after(recordPublishedTotal);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/gallery PATCH]", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/** Company brain: the total of published products only, never which team. */
async function recordPublishedTotal() {
  const value = await countPublishedProducts();
  if (value === null) return;
  await recordBrainEvent(
    { type: "program_count_snapshot", payload: { program: "hackathon", metric: "gallery_products", value } },
    "admin/hackathon/gallery",
  );
}
