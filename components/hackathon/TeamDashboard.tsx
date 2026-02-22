"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Clock, RefreshCw } from "lucide-react";
import FractalGlassBackground from "@/components/hackathon/ClarityGlassBackground";
import { PartyIcon, CrownIcon, RocketIcon, KeyIcon, FindIcon } from "@/components/hackathon/TeamIcons";

type Member = {
    participant_id: string;
    joined_at: string;
    hackathon_participants: { name: string; university: string; track: string };
};

type Team = {
    id: string;
    name: string;
    lobby_code: string;
    owner_id: string;
    members: Member[];
};

type Participant = { id: string; name: string; university: string };

type Props = {
    initialTeam: Team | null;
    participant: Participant;
};

type View = "home" | "create" | "join" | "matching";

export default function TeamDashboard({ initialTeam, participant }: Props) {
    const [team, setTeam] = useState<Team | null>(initialTeam);
    const [view, setView] = useState<View>("home");
    const [teamName, setTeamName] = useState("");
    const [lobbyCode, setLobbyCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [matchingPosition, setMatchingPosition] = useState<number | null>(null);
    const [isMatching, setIsMatching] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setLoggingOut(true);
        await fetch("/api/hackathon/logout", { method: "POST" });
        router.push("/hackathon");
    };

    const refreshTeam = useCallback(async () => {
        const res = await fetch("/api/hackathon/team/me");
        if (res.ok) {
            const data = await res.json();
            setTeam(data.team);
        }
    }, []);

    const checkMatchingStatus = useCallback(async () => {
        const res = await fetch("/api/hackathon/team/match/status");
        if (res.ok) {
            const data = await res.json();
            if (data.status === "matched") {
                // Matched! Refresh team
                await refreshTeam();
                setIsMatching(false);
            } else if (data.status === "waiting") {
                setMatchingPosition(data.position);
            } else {
                // Not in waitlist
                setIsMatching(false);
                if (view === "matching") {
                    setView("home");
                }
            }
        }
    }, [view, refreshTeam]);

    useEffect(() => {
        if (!team) return;
        const interval = setInterval(refreshTeam, 5000);
        return () => clearInterval(interval);
    }, [team, refreshTeam]);

    useEffect(() => {
        if (!isMatching) return;
        const interval = setInterval(checkMatchingStatus, 3000);
        checkMatchingStatus(); // Check immediately
        return () => clearInterval(interval);
    }, [isMatching, checkMatchingStatus]);

    const handleCreate = async () => {
        if (!teamName.trim()) { setError("กรุณาใส่ชื่อทีม"); return; }
        setLoading(true); setError("");
        const res = await fetch("/api/hackathon/team/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: teamName }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
        await refreshTeam();
    };

    const handleJoin = async () => {
        if (!lobbyCode.trim()) { setError("กรุณาใส่รหัสล็อบบี้"); return; }
        setLoading(true); setError("");
        const res = await fetch("/api/hackathon/team/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lobbyCode }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
        await refreshTeam();
    };

    const copyCode = () => {
        if (!team) return;
        navigator.clipboard.writeText(team.lobby_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartMatching = async () => {
        setLoading(true);
        setError("");
        const res = await fetch("/api/hackathon/team/match/join", { method: "POST" });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error || "เกิดข้อผิดพลาด");
            return;
        }
        setView("matching");
        setIsMatching(true);
    };

    const handleCancelMatching = async () => {
        setLoading(true);
        await fetch("/api/hackathon/team/match/cancel", { method: "POST" });
        setLoading(false);
        setIsMatching(false);
        setView("home");
    };

    const handleLeaveTeam = async () => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการออกจากทีม?")) return;
        setLoading(true);
        const res = await fetch("/api/hackathon/team/leave", { method: "POST" });
        setLoading(false);
        if (res.ok) {
            setTeam(null);
        } else {
            const data = await res.json();
            setError(data.error || "ไม่สามารถออกจากทีมได้");
        }
    };

    const handleBackToHome = () => {
        router.push("/hackathon");
    };

    const LogoutButton = () => (
        <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="fixed top-4 right-4 z-50 text-sm text-gray-600 hover:text-red-400 bg-[#0d1219]/80 border border-white/5 hover:border-red-400/30 px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
            {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
        </button>
    );

    const BackButton = () => (
        <button
            onClick={handleBackToHome}
            className="fixed top-4 left-4 z-50 text-sm text-gray-600 hover:text-[#5a7a94] bg-[#0d1219]/80 border border-white/5 hover:border-[#5a7a94]/30 px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm flex items-center gap-2"
        >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 12L6 8l4-4" />
            </svg>
            กลับหน้าหลัก
        </button>
    );

    // ─── Team Lobby View ───────────────────────────────────────────────────
    if (team) {
        const isOwner = team.owner_id === participant.id;
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
                <BackButton />
                <LogoutButton />
                <div className="w-full max-w-lg space-y-6 relative z-10">
                    <div className="text-center">
                        <p className="text-[#5a7a94] text-sm tracking-widest uppercase mb-1">ทีมของคุณ</p>
                        <h1 className="text-4xl font-bold text-gray-300">{team.name}</h1>
                    </div>

                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#4a6b82]/20 rounded-2xl p-6 text-center shadow-[0_0_25px_rgba(74,107,130,0.15)]">
                        <p className="text-gray-500 text-sm mb-2">รหัสล็อบบี้</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-5xl font-bold tracking-[0.3em] text-[#5a7a94] font-mono" style={{ textShadow: '0 0 15px rgba(90,122,148,0.3)' }}>
                                {team.lobby_code}
                            </span>
                            <button onClick={copyCode} className="text-gray-500 hover:text-[#5a7a94] transition-colors">
                                {copied ? <Check className="w-6 h-6 text-gray-400" /> : <Copy className="w-6 h-6" />}
                            </button>
                        </div>
                        <p className="text-gray-600 text-xs mt-2">แชร์รหัสนี้ให้เพื่อนเพื่อเข้าร่วมทีม</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80 border border-[#4a6b82]/15 rounded-2xl p-5 shadow-[0_0_20px_rgba(74,107,130,0.1)]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[#5a7a94]">
                                <Users className="w-5 h-5" />
                                <span className="font-semibold">สมาชิก ({team.members.length})</span>
                            </div>
                            <button onClick={refreshTeam} className="text-gray-600 hover:text-[#5a7a94] transition-colors">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {team.members.map((m) => {
                                const p = m.hackathon_participants;
                                const isMe = m.participant_id === participant.id;
                                const isTeamOwner = m.participant_id === team.owner_id;
                                return (
                                    <div key={m.participant_id} className="flex items-center justify-between py-2 border-b border-[#4a6b82]/10 last:border-0">
                                        <div>
                                            <p className="font-medium text-gray-300">
                                                {p.name}
                                                {isMe && <span className="text-[#5a7a94] text-xs ml-2">(คุณ)</span>}
                                                {isTeamOwner && <span title="Team Owner" className="inline-flex items-center ml-2"><CrownIcon className="w-4 h-4 text-[#A594BA]" /></span>}
                                            </p>
                                            <p className="text-gray-600 text-sm">{p.university} · {p.track}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                                            <Clock className="w-3 h-3" />
                                            {new Date(m.joined_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </div>
                                );
                            })}
                            {team.members.length === 0 && (
                                <p className="text-gray-600 text-center text-sm py-2">ยังไม่มีสมาชิก</p>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <p className="text-center text-gray-600 text-sm">รอสมาชิกเข้าร่วมทีม...</p>
                    )}

                    {/* Leave Team Button */}
                    <button
                        onClick={handleLeaveTeam}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#3a3a3a] to-[#2a2a2a] hover:from-[#2a2a2a] hover:to-[#3a3a3a] text-gray-400 hover:text-red-400 font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 hover:border-red-400/30"
                    >
                        {loading ? "กำลังออกจากทีม..." : "ออกจากทีม"}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Create Team View ──────────────────────────────────────────────────
    if (view === "create") {
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
                <BackButton />
                <LogoutButton />
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <button onClick={() => { setView("home"); setError(""); }} className="text-gray-600 hover:text-[#5a7a94] text-sm flex items-center gap-2 transition-colors group">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M10 12L6 8l4-4" />
                        </svg>
                        กลับ
                    </button>
                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#4a6b82]/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(74,107,130,0.15)]">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-[#4a6b82]/15 border border-[#4a6b82]/25 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(74,107,130,0.2)]">
                                <RocketIcon className="w-8 h-8 text-[#5a7a94]" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#5a7a94]">สร้างทีม</h2>
                            <p className="text-gray-400 text-sm mt-2">ตั้งชื่อทีมและรับรหัสล็อบบี้</p>
                        </div>
                        <div className="space-y-4">
                            <input
                                className="w-full bg-[#0d1219]/80 border border-[#4a6b82]/25 rounded-xl px-5 py-4 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#5a7a94] focus:bg-[#0d1219] transition-all text-lg"
                                placeholder="ชื่อทีม"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            />
                            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#4a6b82] to-[#3a5565] hover:from-[#3a5565] hover:to-[#4a6b82] text-gray-300 font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(74,107,130,0.2)] hover:shadow-[0_0_30px_rgba(74,107,130,0.3)] hover:scale-[1.02]"
                            >
                                {loading ? "กำลังสร้าง..." : "สร้างทีม"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Join Team View ────────────────────────────────────────────────────
    if (view === "join") {
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
                <BackButton />
                <LogoutButton />
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <button onClick={() => { setView("home"); setError(""); }} className="text-gray-600 hover:text-[#5a7a94] text-sm flex items-center gap-2 transition-colors group">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M10 12L6 8l4-4" />
                        </svg>
                        กลับ
                    </button>
                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#6b5a7a]/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(107,90,122,0.15)]">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-[#6b5a7a]/15 border border-[#6b5a7a]/25 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(107,90,122,0.2)]">
                                <KeyIcon className="w-8 h-8 text-[#A594BA]" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#6b5a7a]">เข้าร่วมทีม</h2>
                            <p className="text-gray-400 text-sm mt-2">ใส่รหัสล็อบบี้ 6 หลัก</p>
                        </div>
                        <div className="space-y-4">
                            <input
                                className="w-full bg-[#0d1219]/80 border border-[#6b5a7a]/25 rounded-xl px-5 py-4 text-gray-300 text-center placeholder-gray-600 font-mono text-2xl tracking-[0.5em] uppercase focus:outline-none focus:border-[#6b5a7a] focus:bg-[#0d1219] transition-all"
                                placeholder="XXXXXX"
                                value={lobbyCode}
                                onChange={(e) => setLobbyCode(e.target.value.toUpperCase().slice(0, 6))}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                maxLength={6}
                            />
                            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
                            <button
                                onClick={handleJoin}
                                disabled={loading || lobbyCode.length < 6}
                                className="w-full bg-gradient-to-r from-[#6b5a7a] to-[#5a4a65] hover:from-[#5a4a65] hover:to-[#6b5a7a] text-gray-300 font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(107,90,122,0.2)] hover:shadow-[0_0_30px_rgba(107,90,122,0.3)] hover:scale-[1.02]"
                            >
                                {loading ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Matching View ─────────────────────────────────────────────────────
    if (view === "matching") {
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
                <BackButton />
                <LogoutButton />
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <button onClick={handleCancelMatching} disabled={loading} className="text-gray-600 hover:text-red-400 text-sm flex items-center gap-2 transition-colors group">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M10 12L6 8l4-4" />
                        </svg>
                        ยกเลิก
                    </button>
                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#5a7a94]/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(90,122,148,0.15)]">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-6 relative">
                                <div className="absolute inset-0 bg-[#5a7a94]/15 border border-[#5a7a94]/25 rounded-full animate-ping" />
                                <div className="absolute inset-0 bg-[#5a7a94]/15 border border-[#5a7a94]/25 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(90,122,148,0.2)]">
                                    <FindIcon className="w-8 h-8 text-[#5a7a94]" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-[#5a7a94] mb-3">กำลังหาทีม...</h2>
                            <p className="text-gray-400 text-sm">เรากำลังจับคู่คุณกับทีมที่เหมาะสม</p>
                        </div>

                        {matchingPosition !== null && (
                            <div className="bg-[#0d1219]/60 border border-[#5a7a94]/15 rounded-2xl p-6 text-center mb-6">
                                <p className="text-gray-500 text-sm mb-2">ตำแหน่งในคิว</p>
                                <p className="text-5xl font-bold text-[#5a7a94]" style={{ textShadow: '0 0 15px rgba(90,122,148,0.3)' }}>
                                    #{matchingPosition}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-gray-400 text-sm">
                                <div className="w-5 h-5 rounded-full bg-[#5a7a94]/20 border border-[#5a7a94]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-[#5a7a94]" />
                                </div>
                                <span>ระบบจะจับคู่คุณกับทีมที่มีสมาชิกใกล้เคียง</span>
                            </div>
                            <div className="flex items-start gap-3 text-gray-400 text-sm">
                                <div className="w-5 h-5 rounded-full bg-[#5a7a94]/20 border border-[#5a7a94]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-[#5a7a94]" />
                                </div>
                                <span>อาจใช้เวลาสักครู่ กรุณารอสักครู่</span>
                            </div>
                            <div className="flex items-start gap-3 text-gray-400 text-sm">
                                <div className="w-5 h-5 rounded-full bg-[#5a7a94]/20 border border-[#5a7a94]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-[#5a7a94]" />
                                </div>
                                <span>หากไม่ต้องการรอ คุณสามารถยกเลิกและสร้างทีมเองได้</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCancelMatching}
                            disabled={loading}
                            className="w-full mt-6 bg-gradient-to-r from-[#3a3a3a] to-[#2a2a2a] hover:from-[#2a2a2a] hover:to-[#3a3a3a] text-gray-400 hover:text-red-400 font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 hover:border-red-400/30"
                        >
                            {loading ? "กำลังยกเลิก..." : "ยกเลิกการหาทีม"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Home View (No Team) ────────────────────────────────────────────────
    return (
        <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
            <FractalGlassBackground />
            <BackButton />
            <LogoutButton />

            <div className="w-full max-w-xl space-y-8 text-center relative z-10">
                <div>
                    <div className="mb-4 inline-block">
                        <div className="w-20 h-20 mx-auto bg-[#4a6b82]/15 border border-[#4a6b82]/25 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(74,107,130,0.2)]">
                            <PartyIcon className="w-10 h-10 text-[#5a7a94]" />
                        </div>
                    </div>
                    <p className="text-[#5a7a94] text-sm tracking-[0.3em] uppercase mb-3 font-light">
                        ยินดีต้อนรับ
                    </p>
                    <h1 className="text-5xl md:text-6xl font-bold mb-2 text-gray-300" style={{ letterSpacing: '-0.02em' }}>
                        {participant.name}
                    </h1>
                    <p className="text-gray-400 mt-3 text-base">เลือกวิธีเข้าร่วมทีมของคุณ</p>
                </div>

                <div className="grid gap-5 pt-4">
                    {/* Create Team Button */}
                    <button
                        onClick={() => setView("create")}
                        className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#0d1219]/95 to-[#121c29]/80 border border-[#4a6b82]/20 hover:border-[#4a6b82]/40 shadow-[0_0_20px_rgba(74,107,130,0.15)] hover:shadow-[0_0_30px_rgba(74,107,130,0.25)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#4a6b82]/0 via-[#4a6b82]/10 to-[#4a6b82]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#4a6b82]/15 border border-[#4a6b82]/25 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#4a6b82]/25 transition-all duration-300 shadow-[0_0_12px_rgba(74,107,130,0.2)]">
                                    <RocketIcon className="w-8 h-8 text-[#5a7a94]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-bold text-gray-300 group-hover:text-[#5a7a94] transition-colors duration-300">
                                        สร้างทีม
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors">
                                        สร้างล็อบบี้และรับรหัสเพื่อให้เพื่อนเข้าร่วม
                                    </p>
                                </div>
                                <div className="text-[#4a6b82]/60 group-hover:text-[#5a7a94] group-hover:translate-x-1 transition-all duration-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Join Team Button */}
                    <button
                        onClick={() => setView("join")}
                        className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#0d1219]/95 to-[#121c29]/80 border border-[#6b5a7a]/20 hover:border-[#6b5a7a]/40 shadow-[0_0_20px_rgba(107,90,122,0.15)] hover:shadow-[0_0_30px_rgba(107,90,122,0.25)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#6b5a7a]/0 via-[#6b5a7a]/10 to-[#6b5a7a]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#6b5a7a]/15 border border-[#6b5a7a]/25 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#6b5a7a]/25 transition-all duration-300 shadow-[0_0_12px_rgba(107,90,122,0.2)]">
                                    <KeyIcon className="w-8 h-8 text-[#A594BA]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-bold text-gray-300 group-hover:text-[#6b5a7a] transition-colors duration-300">
                                        เข้าร่วมทีม
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors">
                                        ใส่รหัสล็อบบี้จากเพื่อนของคุณ
                                    </p>
                                </div>
                                <div className="text-[#6b5a7a]/60 group-hover:text-[#6b5a7a] group-hover:translate-x-1 transition-all duration-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Find Team Button */}
                    <button
                        onClick={handleStartMatching}
                        className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#0d1219]/95 to-[#121c29]/80 border border-[#5a7a94]/20 hover:border-[#5a7a94]/40 shadow-[0_0_20px_rgba(90,122,148,0.15)] hover:shadow-[0_0_30px_rgba(90,122,148,0.25)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#5a7a94]/0 via-[#5a7a94]/10 to-[#5a7a94]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#5a7a94]/15 border border-[#5a7a94]/25 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#5a7a94]/25 transition-all duration-300 shadow-[0_0_12px_rgba(90,122,148,0.2)]">
                                    <FindIcon className="w-8 h-8 text-[#5a7a94]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-bold text-gray-300 group-hover:text-[#5a7a94] transition-colors duration-300">
                                        หาทีม
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors">
                                        จับคู่อัตโนมัติกับสมาชิกทีมที่ยังเปิดรับ
                                    </p>
                                </div>
                                <div className="text-[#5a7a94]/60 group-hover:text-[#5a7a94] group-hover:translate-x-1 transition-all duration-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
