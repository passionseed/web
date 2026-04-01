import { cookies } from "next/headers";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import LandingPage from "@/components/hackathon/LandingPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hackathon 2026 | The Next Decade",
  description: "Join the Next Decade Hackathon to build the future of Preventive & Predictive Healthcare and Mental Health.",
};

export default async function HackathonPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  let isLoggedIn = false;
  if (token) {
    try {
      const participant = await getSessionParticipant(token);
      isLoggedIn = !!participant;
    } catch {
      isLoggedIn = false;
    }
  }

  return <LandingPage isLoggedIn={isLoggedIn} />;
}
