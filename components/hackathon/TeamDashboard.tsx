"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Clock, RefreshCw } from "lucide-react";
import FractalGlassBackground from "@/components/hackathon/ClarityGlassBackground";

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

type View = "home" | "create" | "join";

export default function TeamDashboard({ initialTeam, participant }: Props) {
    const [team, setTeam] = useState<Team | null>(initialTeam);
    const [view, setView] = useState<View>("home");
    const [teamName, setTeamName] = useState("");
    const [lobbyCode, setLobbyCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
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

    useEffect(() => {
        if (!team) return;
        const interval = setInterval(refreshTeam, 5000);
        return () => clearInterval(interval);
    }, [team, refreshTeam]);

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

    const LogoutButton = () => (
        <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="fixed top-4 right-4 z-50 text-sm text-gray-600 hover:text-red-400 bg-[#0d1219]/80 border border-white/5 hover:border-red-400/30 px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
            {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
        </button>
    );

    // ─── Team Lobby View ───────────────────────────────────────────────────
    if (team) {
        const isOwner = team.owner_id === participant.id;
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
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
                                                {isTeamOwner && <span className="text-[#6b5a7a] text-xs ml-2">👑</span>}
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
                </div>
            </div>
        );
    }

    // ─── Create Team View ──────────────────────────────────────────────────
    if (view === "create") {
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
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
                            <div className="w-16 h-16 mx-auto bg-[#4a6b82]/15 border border-[#4a6b82]/25 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-[0_0_15px_rgba(74,107,130,0.2)]">
                                🚀
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
                            <div className="w-16 h-16 mx-auto bg-[#6b5a7a]/15 border border-[#6b5a7a]/25 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-[0_0_15px_rgba(107,90,122,0.2)]">
                                🔑
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

    // ─── Home View (No Team) ────────────────────────────────────────────────
    return (
        <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
            <FractalGlassBackground />
            <LogoutButton />

            <div className="w-full max-w-xl space-y-8 text-center relative z-10">
                <div>
                    <div className="mb-4 inline-block">
                        <div className="w-20 h-20 mx-auto bg-[#4a6b82]/15 border border-[#4a6b82]/25 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(74,107,130,0.2)]">
                            <span className="text-4xl">🎉</span>
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
                                <div className="w-16 h-16 rounded-2xl bg-[#4a6b82]/15 border border-[#4a6b82]/25 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:bg-[#4a6b82]/25 transition-all duration-300 shadow-[0_0_12px_rgba(74,107,130,0.2)]">
                                    🚀
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
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
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
                                <div className="w-16 h-16 rounded-2xl bg-[#6b5a7a]/15 border border-[#6b5a7a]/25 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:bg-[#6b5a7a]/25 transition-all duration-300 shadow-[0_0_12px_rgba(107,90,122,0.2)]">
                                    🔑
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
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Find Team Button (Disabled) */}
                    <div className="relative overflow-hidden rounded-3xl opacity-50 cursor-not-allowed bg-gradient-to-br from-[#0d1219]/60 to-[#121c29]/60 border border-white/10">
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                                    🔍
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-bold text-gray-400">
                                        หาทีม
                                    </h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        จับคู่อัตโนมัติกับสมาชิกทีมที่ยังเปิดรับ
                                    </p>
                                </div>
                                <span className="text-xs bg-white/10 text-gray-400 px-3 py-1.5 rounded-full font-medium">
                                    เร็วๆ นี้
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
