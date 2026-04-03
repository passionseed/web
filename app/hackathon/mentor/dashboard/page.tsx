"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import MentorBookingCard from "@/components/hackathon/mentor/MentorBookingCard";
import MentorStatsRow from "@/components/hackathon/mentor/MentorStatsRow";
import type { MentorProfile, MentorBooking, MentorTeamAssignment } from "@/types/mentor";

type BookingFilter = "upcoming" | "past" | "all";
type DashTab = "bookings" | "teams";

const SESSION_TYPE_BADGE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  healthcare: {
    label: "Healthcare Mentor",
    color: "#65ABFC",
    bg: "rgba(101,171,252,0.12)",
  },
  group: {
    label: "Group Mentor",
    color: "#A594BA",
    bg: "rgba(165,148,186,0.12)",
  },
};

export default function MentorDashboardPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [assignments, setAssignments] = useState<MentorTeamAssignment[]>([]);
  const [filter, setFilter] = useState<BookingFilter>("upcoming");
  const [dashTab, setDashTab] = useState<DashTab>("bookings");

  useEffect(() => {
    if (!mentor || !pageRef.current) return;
    gsap.fromTo(
      pageRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, [mentor]);

  useEffect(() => {
    fetch("/api/hackathon/mentor/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.mentor) {
          router.replace("/hackathon/mentor/login");
          return;
        }
        setMentor(data.mentor);
      })
      .catch(() => router.replace("/hackathon/mentor/login"));

    fetch("/api/hackathon/mentor/bookings?filter=all")
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings ?? []));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/hackathon/mentor/logout", { method: "POST" });
    router.push("/hackathon/mentor/login");
  };

  const now = new Date();
  const filteredBookings = bookings.filter((b) => {
    const d = new Date(b.slot_datetime);
    if (filter === "upcoming") return d >= now && b.status !== "cancelled";
    if (filter === "past") return d < now;
    return true;
  });

  if (!mentor) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#010108" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-[#91C4E3]/30 border-t-[#91C4E3] animate-spin" />
      </div>
    );
  }

  const badge =
    SESSION_TYPE_BADGE[mentor.session_type] ?? SESSION_TYPE_BADGE.healthcare;

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden py-16"
      style={{
        background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)",
      }}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#91C4E3] opacity-4 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#9D81AC] opacity-4 blur-[150px] rounded-full pointer-events-none" />

      <div
        ref={pageRef}
        className="relative z-10 max-w-2xl mx-auto px-6 space-y-8 opacity-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-xs tracking-widest uppercase font-[family-name:var(--font-mitr)]"
              style={{ color: "#5a7a94" }}
            >
              Mentor Portal
            </p>
            <h1 className="text-3xl font-medium text-white mt-1 font-[family-name:var(--font-bai-jamjuree)]">
              {mentor.full_name}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
                style={{
                  color: badge.color,
                  background: badge.bg,
                  border: `1px solid ${badge.color}40`,
                }}
              >
                {badge.label}
              </span>
              {mentor.is_approved ? (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
                  style={{
                    color: "#34d399",
                    background: "rgba(52,211,153,0.12)",
                    border: "1px solid rgba(52,211,153,0.3)",
                  }}
                >
                  Active
                </span>
              ) : (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium font-[family-name:var(--font-mitr)]"
                  style={{
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  Pending Approval
                </span>
              )}
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-[#4a6b82]/40 text-[#91C4E3] hover:bg-[#91C4E3]/10 font-[family-name:var(--font-mitr)] shrink-0"
          >
            <Link href="/hackathon/mentor/profile">Edit Profile</Link>
          </Button>
        </div>

        {/* Stats */}
        <MentorStatsRow
          bookings={bookings}
          sessionType={mentor.session_type}
          assignments={assignments}
        />

        {/* Group mentor tab nav */}
        {mentor.session_type === "group" && (
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "rgba(13,18,25,0.8)",
              border: "1px solid rgba(74,107,130,0.25)",
            }}
          >
            {(["bookings", "teams"] as DashTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setDashTab(tab)}
                className="flex-1 py-2 rounded-lg text-sm transition-all font-[family-name:var(--font-mitr)]"
                style={{
                  background:
                    dashTab === tab ? "rgba(145,196,227,0.15)" : "transparent",
                  color: dashTab === tab ? "#91C4E3" : "#5a7a94",
                  border:
                    dashTab === tab
                      ? "1px solid rgba(145,196,227,0.3)"
                      : "1px solid transparent",
                }}
              >
                {tab === "teams" ? "Team Submissions" : "My Bookings"}
              </button>
            ))}
          </div>
        )}

        {/* Teams view (group mentors only) */}
        {mentor.session_type === "group" && dashTab === "teams" && (
          <div
            className="rounded-3xl p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            {assignments.length === 0 ? (
              <p
                className="text-center text-sm py-8 font-[family-name:var(--font-mitr)]"
                style={{ color: "#5a7a94" }}
              >
                No teams assigned yet. An admin will assign teams to you.
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-3 rounded-xl"
                    style={{
                      background: "rgba(165,148,186,0.08)",
                      border: "1px solid rgba(165,148,186,0.2)",
                    }}
                  >
                    <p className="text-sm font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">
                      Team {a.team_id.slice(0, 8)}
                    </p>
                    <p
                      className="text-xs font-[family-name:var(--font-space-mono)]"
                      style={{ color: "#A594BA" }}
                    >
                      Assigned {new Date(a.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings section */}
        {(mentor.session_type === "healthcare" || dashTab === "bookings") && (
          <div
            className="rounded-3xl p-6 space-y-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">
                Bookings
              </h2>
              {/* Filter tabs */}
              <div
                className="flex gap-1 p-0.5 rounded-lg"
                style={{
                  background: "rgba(10,14,26,0.8)",
                  border: "1px solid rgba(74,107,130,0.2)",
                }}
              >
                {(["upcoming", "past", "all"] as BookingFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1 rounded-md text-xs transition-all font-[family-name:var(--font-mitr)] capitalize"
                    style={{
                      background:
                        filter === f ? "rgba(145,196,227,0.15)" : "transparent",
                      color: filter === f ? "#91C4E3" : "#5a7a94",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <p
                className="text-center text-sm py-8 font-[family-name:var(--font-mitr)]"
                style={{ color: "#5a7a94" }}
              >
                No {filter} bookings yet.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => (
                  <MentorBookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full text-sm transition-colors py-2 font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#5a7a94")}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
