import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import {
  getSessionParticipant,
  getParticipantTeam,
  hasCompletedHackathonOnboarding,
} from "@/lib/hackathon/db";
import TeamDashboard from "@/components/hackathon/TeamDashboard";

export default async function TeamPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) redirect("/hackathon/register");

    const participant = await getSessionParticipant(token);
    if (!participant) redirect("/hackathon/register");

    const onboardingDone = await hasCompletedHackathonOnboarding(participant.id);
    if (!onboardingDone) {
        redirect(
            `/hackathon/onboarding?returnTo=${encodeURIComponent("/hackathon/team")}`
        );
    }

    const team = await getParticipantTeam(participant.id);

    return (
        <TeamDashboard
            initialTeam={team as Parameters<typeof TeamDashboard>[0]["initialTeam"]}
            participant={{ id: participant.id, name: participant.name, university: participant.university }}
        />
    );
}
