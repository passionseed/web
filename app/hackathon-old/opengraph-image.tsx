import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "Hackathon Archive | PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  return renderPoster({ title: "HACKATHON", subtitle: "รวมทีม ลงมือสร้าง แก้ปัญหาจริง", label: "THE NEXT DECADE / ARCHIVE", theme: "bloom" });
}
