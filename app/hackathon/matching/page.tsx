import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import HackathonMatchingPage from "@/components/hackathon/HackathonMatchingPage";

export default async function MatchingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) redirect("/hackathon/register");

  const participant = await getSessionParticipant(token);
  if (!participant) redirect("/hackathon/register");

  return (
    <HackathonMatchingPage
      participant={{
        id: participant.id,
        name: participant.name,
      }}
    />
  );
}
