import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminHackathonArchivePage() {
  redirect("/admin/archive/hackathon-healthcare/activities");
}
