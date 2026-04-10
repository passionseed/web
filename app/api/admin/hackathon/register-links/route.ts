import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createRegisterLink, listRegisterLinks, deleteRegisterLink } from "@/lib/hackathon/register-links";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  return roles && roles.length > 0 ? user : null;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const links = await listRegisterLinks();
    return NextResponse.json({ links });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const note: string | undefined = body.note || undefined;
    const link = await createRegisterLink(note);
    return NextResponse.json({ link });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteRegisterLink(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
