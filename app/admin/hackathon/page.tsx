import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminHackathonPage() {
  redirect("/admin/hackathon/activities");
}
