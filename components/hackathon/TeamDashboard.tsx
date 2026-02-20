"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Clock, RefreshCw } from "lucide-react";

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
            className="fixed top-4 right-4 z-50 text-sm text-gray-500 hover:text-red-400 bg-[#0d1219] border border-white/10 hover:border-red-400/30 px-3 py-2 rounded-lg transition-all duration-200"
        >
            {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
        </button>
    );

    // ─── Team Lobby View ───────────────────────────────────────────────────
    if (team) {
        const isOwner = team.owner_id === participant.id;
        return (
            <div className="min-h-screen bg-[#03050a] text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)]">
                <LogoutButton />
                <div className="w-full max-w-lg space-y-6">
                    <div className="text-center">
                        <p className="text-[#91C4E3] text-sm tracking-widest uppercase mb-1">ทีมของคุณ</p>
                        <h1 className="text-4xl font-bold text-white">{team.name}</h1>
                    </div>

                    <div className="bg-[#0d1219] border border-[#91C4E3]/30 rounded-2xl p-6 text-center">
                        <p className="text-gray-400 text-sm mb-2">รหัสล็อบบี้</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-5xl font-bold tracking-[0.3em] text-[#91C4E3] font-mono">
                                {team.lobby_code}
                            </span>
                            <button onClick={copyCode} className="text-gray-400 hover:text-[#91C4E3] transition-colors">
                                {copied ? <Check className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6" />}
                            </button>
                        </div>
                        <p className="text-gray-500 text-xs mt-2">แชร์รหัสนี้ให้เพื่อนเพื่อเข้าร่วมทีม</p>
                    </div>

                    <div className="bg-[#0d1219] border border-[#91C4E3]/20 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[#91C4E3]">
                                <Users className="w-5 h-5" />
                                <span className="font-semibold">สมาชิก ({team.members.length})</span>
                            </div>
                            <button onClick={refreshTeam} className="text-gray-500 hover:text-[#91C4E3] transition-colors">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {team.members.map((m) => {
                                const p = m.hackathon_participants;
                                const isMe = m.participant_id === participant.id;
                                const isTeamOwner = m.participant_id === team.owner_id;
                                return (
                                    <div key={m.participant_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="font-medium text-white">
                                                {p.name}
                                                {isMe && <span className="text-[#91C4E3] text-xs ml-2">(คุณ)</span>}
                                                {isTeamOwner && <span className="text-[#A594BA] text-xs ml-2">👑</span>}
                                            </p>
                                            <p className="text-gray-500 text-sm">{p.university} · {p.track}</p>
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
            <div className="min-h-screen bg-[#03050a] text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)]">
                <LogoutButton />
                <div className="w-full max-w-sm space-y-5">
                    <button onClick={() => { setView("home"); setError(""); }} className="text-gray-500 hover:text-white text-sm flex items-center gap-1 transition-colors">
                        ← กลับ
                    </button>
                    <h2 className="text-3xl font-bold text-[#91C4E3]">สร้างทีม</h2>
                    <div className="space-y-3">
                        <input
                            className="w-full bg-[#0d1219] border border-[#91C4E3]/30 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#91C4E3] transition-colors"
                            placeholder="ชื่อทีม"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <Button onClick={handleCreate} disabled={loading} className="w-full bg-[#91C4E3] hover:bg-[#7ab3d3] text-[#03050a] font-bold py-3 rounded-xl transition-all">
                            {loading ? "กำลังสร้าง..." : "สร้างทีม"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Join Team View ────────────────────────────────────────────────────
    if (view === "join") {
        return (
            <div className="min-h-screen bg-[#03050a] text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)]">
                <LogoutButton />
                <div className="w-full max-w-sm space-y-5">
                    <button onClick={() => { setView("home"); setError(""); }} className="text-gray-500 hover:text-white text-sm flex items-center gap-1 transition-colors">
                        ← กลับ
                    </button>
                    <h2 className="text-3xl font-bold text-[#A594BA]">เข้าร่วมทีม</h2>
                    <div className="space-y-3">
                        <input
                            className="w-full bg-[#0d1219] border border-[#A594BA]/30 rounded-xl px-4 py-3 text-white placeholder-gray-600 font-mono text-lg tracking-widest uppercase focus:outline-none focus:border-[#A594BA] transition-colors"
                            placeholder="XXXXXX"
                            value={lobbyCode}
                            onChange={(e) => setLobbyCode(e.target.value.toUpperCase().slice(0, 6))}
                            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                            maxLength={6}
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <Button onClick={handleJoin} disabled={loading || lobbyCode.length < 6} className="w-full bg-[#A594BA] hover:bg-[#9484aa] text-white font-bold py-3 rounded-xl transition-all">
                            {loading ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Home View (No Team) ────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#03050a] text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)]">
            <LogoutButton />
            <div className="w-full max-w-xl space-y-8 text-center">
                <div>
                    <p className="text-[#91C4E3] text-sm tracking-widest uppercase mb-2">ยินดีต้อนรับ, {participant.name}</p>
                    <h1 className="text-4xl font-bold">เลือกวิธีเข้าร่วมทีม</h1>
                    <p className="text-gray-500 mt-2 text-sm">คุณยังไม่ได้อยู่ในทีม</p>
                </div>

                <div className="grid gap-4">
                    <button
                        onClick={() => setView("create")}
                        className="group bg-[#0d1219] hover:bg-[#91C4E3]/10 border border-[#91C4E3]/30 hover:border-[#91C4E3]/70 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-[0_0_30px_rgba(145,196,227,0.2)]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#91C4E3]/10 flex items-center justify-center text-2xl">🚀</div>
                            <div>
                                <h3 className="text-xl font-bold text-[#91C4E3] group-hover:text-white transition-colors">สร้างทีม</h3>
                                <p className="text-gray-500 text-sm mt-0.5">สร้างล็อบบี้และรับรหัสเพื่อให้เพื่อนเข้าร่วม</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setView("join")}
                        className="group bg-[#0d1219] hover:bg-[#A594BA]/10 border border-[#A594BA]/30 hover:border-[#A594BA]/70 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-[0_0_30px_rgba(165,148,186,0.2)]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#A594BA]/10 flex items-center justify-center text-2xl">🔑</div>
                            <div>
                                <h3 className="text-xl font-bold text-[#A594BA] group-hover:text-white transition-colors">เข้าร่วมทีม</h3>
                                <p className="text-gray-500 text-sm mt-0.5">ใส่รหัสล็อบบี้จากเพื่อนของคุณ</p>
                            </div>
                        </div>
                    </button>

                    <div className="relative bg-[#0d1219] border border-white/10 rounded-2xl p-6 text-left opacity-60 cursor-not-allowed">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">🔍</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-400">หาทีม</h3>
                                <p className="text-gray-600 text-sm mt-0.5">จับคู่อัตโนมัติกับสมาชิกทีมที่ยังเปิดรับ</p>
                            </div>
                            <span className="text-xs bg-white/10 text-gray-400 px-2 py-1 rounded-full">เร็วๆ นี้</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
