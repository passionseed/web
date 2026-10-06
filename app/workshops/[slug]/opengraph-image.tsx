import { createClient } from "@/utils/supabase/server";
import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "Workshop | PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("workshops").select("title").eq("slug", slug).single();
  return renderPoster({ title: data?.title ?? "WORKSHOPS", subtitle: "ลองสิ่งใหม่ สร้างอะไรที่เป็นของคุณ", label: "WORKSHOPS / LEARN BY DOING" });
}
