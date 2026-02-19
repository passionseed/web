"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { HackathonParticipant } from "@/lib/hackathon/db";

export default function HackathonDashboardPage() {
  const router = useRouter();
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hackathon/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.participant) {
          router.replace("/hackathon/login");
          return;
        }
        setParticipant(data.participant);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/hackathon/logout", { method: "POST" });
    router.push("/hackathon");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03050a] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!participant) return null;

  return (
    <div className="min-h-screen bg-[#03050a] text-white relative overflow-hidden flex items-center justify-center">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#9D81AC] opacity-5 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg px-6 py-12 text-center space-y-8">
        <div className="space-y-2">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-poppins)]">
            You're in!
          </h1>
          <p className="text-gray-400">Welcome to The Next Decade Hackathon 2026</p>
        </div>

        <div className="bg-[#0d1219]/80 backdrop-blur-sm border border-[#91C4E3]/20 rounded-2xl p-6 text-left space-y-4 shadow-[0_0_40px_rgba(145,196,227,0.08)]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xl font-semibold">{participant.name}</p>
              <p className="text-gray-400 text-sm">{participant.email}</p>
            </div>
            <span className="text-xs bg-[#91C4E3]/10 border border-[#91C4E3]/30 text-[#91C4E3] rounded-full px-3 py-1">
              {participant.role}
            </span>
          </div>

          <div className="border-t border-[#91C4E3]/10 pt-4 space-y-2 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>University / Org</span>
              <span className="text-white">{participant.university}</span>
            </div>
            {participant.team_name && (
              <div className="flex justify-between">
                <span>Team</span>
                <span className="text-white">{participant.team_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Registered</span>
              <span className="text-white">
                {new Date(participant.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#0d1219]/60 border border-[#A594BA]/20 rounded-2xl p-6 text-sm text-gray-400 space-y-2">
          <p className="text-white font-medium">What's next?</p>
          <p>The hackathon kicks off on <span className="text-[#91C4E3]">March 15, 2026</span>. We'll send event details and updates to your email.</p>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-gray-500 hover:text-white text-sm"
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
