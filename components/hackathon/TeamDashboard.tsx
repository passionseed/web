"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Clock, RefreshCw, Sparkles, X, Link } from "lucide-react";
import FractalGlassBackground from "@/components/hackathon/ClarityGlassBackground";
import { PartyIcon, CrownIcon, RocketIcon, KeyIcon, FindIcon } from "@/components/hackathon/TeamIcons";
import { PreferenceCombobox } from "@/components/admin/team-matching/PreferenceCombobox";
import type { SimUser } from "@/components/admin/team-matching/types";

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

type InterestEntry = {
    participant_id: string;
    name: string;
    problem_preferences: string[];
    team_role_preference: string;
};

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
    const [teamInterests, setTeamInterests] = useState<InterestEntry[]>([]);
    const [isMatching, setIsMatching] = useState(false);
    const [hasActiveMatchingEvent, setHasActiveMatchingEvent] = useState(false);
    const router = useRouter();

    // Find Team modal state
    // Invite link state
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [inviteEnabled, setInviteEnabled] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [isInvited, setIsInvited] = useState(false);
    const [inviteAlreadyUsed, setInviteAlreadyUsed] = useState(false);
    const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
    const [kicking, setKicking] = useState(false);
    const [kickError, setKickError] = useState("");

    const [finderOpen, setFinderOpen] = useState(false);
    const [finderLoaded, setFinderLoaded] = useState(false);
    const [finderOptedIn, setFinderOptedIn] = useState(false);
    const [finderOthers, setFinderOthers] = useState<{ id: string; name: string }[]>([]);
    const [finderPrefs, setFinderPrefs] = useState<string[]>([]);
    const [finderJoining, setFinderJoining] = useState(false);
    const [finderSaveMsg, setFinderSaveMsg] = useState("");
    const finderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadFinderStatus = useCallback(async () => {
        const res = await fetch("/api/hackathon/team-finder/status");
        if (!res.ok) return;
        const data = await res.json();
        setFinderOptedIn(data.isOptedIn);
        setFinderOthers(data.participants);
        setFinderPrefs(data.preferences);
        setFinderLoaded(true);
    }, []);

    const openFinder = () => {
        setFinderOpen(true);
        if (!finderLoaded) loadFinderStatus();
    };

    const handleFinderJoin = async () => {
        setFinderJoining(true);
        const res = await fetch("/api/hackathon/team-finder/join", { method: "POST" });
        setFinderJoining(false);
        if (res.ok) await loadFinderStatus();
    };

    const saveFinderPrefs = useCallback(async (prefs: string[]) => {
        setFinderSaveMsg("กำลังบันทึก...");
        const res = await fetch("/api/hackathon/team-finder/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferences: prefs }),
        });
        setFinderSaveMsg(res.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ");
        setTimeout(() => setFinderSaveMsg(""), 2000);
    }, []);

    const setFinderPref = (index: number, userId: string | null) => {
        const next = [...finderPrefs];
        if (userId === null) {
            next.splice(index, 1);
        } else {
            next[index] = userId;
        }
        setFinderPrefs(next);
        if (finderDebounceRef.current) clearTimeout(finderDebounceRef.current);
        finderDebounceRef.current = setTimeout(() => saveFinderPrefs(next), 600);
    };

    const finderOptionsFor = (index: number): SimUser[] => {
        const otherSelected = finderPrefs.filter((_, j) => j !== index);
        return finderOthers
            .filter((p) => !otherSelected.includes(p.id))
            .map((p) => ({ id: p.id, name: p.name, preferences: [] }));
    };

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

    const loadInviteStatus = useCallback(async () => {
        const res = await fetch("/api/hackathon/team/invite/status");
        if (!res.ok) return;
        const data = await res.json();
        setInviteToken(data.invite?.token ?? null);
        setInviteEnabled(data.enabled ?? false);
        setIsInvited(data.isInvited ?? false);
        setInviteAlreadyUsed(data.alreadyUsed ?? false);
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
                setIsMatching(true);
                if (view !== "matching") {
                    setView("matching");
                }
            } else {
                // Not in waitlist
                setIsMatching(false);
                if (view === "matching") {
                    setView("home");
                }
            }
        }
    }, [view, refreshTeam]);

    // Check matching status on mount
    useEffect(() => {
        if (!team) {
            checkMatchingStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [team]);

    useEffect(() => {
        if (team) {
            setHasActiveMatchingEvent(false);
            return;
        }

        fetch("/api/hackathon/matching/event")
            .then((response) => response.json())
            .then((data) => {
                setHasActiveMatchingEvent(Boolean(data.state?.event));
            })
            .catch(() => {
                setHasActiveMatchingEvent(false);
            });
    }, [team]);

    useEffect(() => {
        if (!team) return;
        const interval = setInterval(refreshTeam, 5000);
        return () => clearInterval(interval);
    }, [team, refreshTeam]);

    useEffect(() => {
        if (!team) return;
        loadInviteStatus();
    }, [team, loadInviteStatus]);

    useEffect(() => {
        if (!team) return;
        fetch("/api/hackathon/team/interests")
            .then((r) => r.json())
            .then((data) => { if (data.interests) setTeamInterests(data.interests); })
            .catch(() => {});
    }, [team]);

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

    const handleKickConfirm = async () => {
        if (!kickTarget) return;
        setKicking(true);
        setKickError("");
        const res = await fetch("/api/hackathon/team/kick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: kickTarget.id }),
        });
        setKicking(false);
        if (res.ok) {
            setTeam((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.participant_id !== kickTarget.id) } : prev);
            setKickTarget(null);
        } else {
            const data = await res.json();
            setKickError(data.error || "ไม่สามารถลบสมาชิกได้");
        }
    };

    const handleCreateInvite = async () => {
        setInviteLoading(true);
        const res = await fetch("/api/hackathon/team/invite/create", { method: "POST" });
        setInviteLoading(false);
        if (!res.ok) { const d = await res.json(); setError(d.error || "สร้างลิงก์ไม่สำเร็จ"); return; }
        const data = await res.json();
        setInviteToken(data.token);
    };

    const copyInviteLink = () => {
        if (!inviteToken) return;
        navigator.clipboard.writeText(`${window.location.origin}/hackathon/register/invite/${inviteToken}`);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    const handleBackToHome = () => {
        router.push("/hackathon/dashboard");
    };

    const LogoutButton = () => (
        <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="fixed top-4 right-4 z-50 text-sm text-gray-200 hover:text-red-300 bg-[#1a2530]/90 border-2 border-red-500/30 hover:border-red-400/60 px-4 py-2.5 rounded-lg transition-all duration-200 backdrop-blur-sm font-medium shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
        >
            {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
        </button>
    );

    const BackButton = () => (
        <button
            onClick={handleBackToHome}
            className="fixed top-4 left-4 z-50 text-sm text-gray-200 hover:text-[#7aa4c4] bg-[#1a2530]/90 border-2 border-[#5a7a94]/30 hover:border-[#7aa4c4]/60 px-4 py-2.5 rounded-lg transition-all duration-200 backdrop-blur-sm flex items-center gap-2 font-medium shadow-[0_0_15px_rgba(90,122,148,0.2)] hover:shadow-[0_0_20px_rgba(106,154,196,0.3)]"
        >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 12L6 8l4-4" />
            </svg>
            กลับหน้าหลัก
        </button>
    );

    const LineButton = () => (
        <a
            href="https://line.me/ti/g2/5prSQrsDW52jlyXOWzmuQwIw7MB31rA1fL4DzA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 z-50 w-16 h-16 bg-[#06C755] hover:bg-[#05b34c] border-2 border-[#06C755]/50 hover:border-[#06C755] rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_0_30px_rgba(6,199,85,0.5)] hover:shadow-[0_0_45px_rgba(6,199,85,0.7)] hover:scale-110"
            title="Join LINE Group"
        >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
        </a>
    );

    // ─── Team Lobby View ───────────────────────────────────────────────────
    if (team) {
        const isOwner = team.owner_id === participant.id;
        return (
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
                <BackButton />
                <LogoutButton />
                <LineButton />
                <div className="w-full max-w-lg space-y-6 relative z-10">
                    <div className="text-center">
                        <p className="text-[#7aa4c4] text-sm tracking-widest uppercase mb-1 font-medium">ทีมของคุณ</p>
                        <h1 className="text-4xl font-medium text-white">{team.name}</h1>
                    </div>

                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#4a6b82]/20 rounded-2xl p-6 text-center shadow-[0_0_25px_rgba(74,107,130,0.15)]">
                        <p className="text-gray-400 text-sm mb-2 font-medium">รหัสล็อบบี้</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-5xl font-medium tracking-[0.3em] text-[#7aa4c4] font-mono" style={{ textShadow: '0 0 20px rgba(106,154,196,0.5)' }}>
                                {team.lobby_code}
                            </span>
                            <button onClick={copyCode} className="text-gray-300 hover:text-[#7aa4c4] transition-colors bg-[#1a2530]/60 border border-[#5a7a94]/30 hover:border-[#7aa4c4]/60 p-2 rounded-lg">
                                {copied ? <Check className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6" />}
                            </button>
                        </div>
                        <p className="text-gray-400 text-xs mt-2">แชร์รหัสนี้ให้เพื่อนเพื่อเข้าร่วมทีม</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80 border border-[#4a6b82]/15 rounded-2xl p-5 shadow-[0_0_20px_rgba(74,107,130,0.1)]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[#7aa4c4]">
                                <Users className="w-5 h-5" />
                                <span className="font-medium">สมาชิก ({team.members.length})</span>
                            </div>
                            <button onClick={refreshTeam} className="text-gray-300 hover:text-[#7aa4c4] transition-colors bg-[#1a2530]/60 border border-[#5a7a94]/30 hover:border-[#7aa4c4]/60 p-2 rounded-lg">
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
                                            <p className="font-medium text-white">
                                                {p.name}
                                                {isMe && <span className="text-[#7aa4c4] text-xs ml-2">(คุณ)</span>}
                                                {isTeamOwner && <span title="Team Owner" className="inline-flex items-center ml-2"><CrownIcon className="w-4 h-4 text-[#b5a4ca]" /></span>}
                                            </p>
                                            <p className="text-gray-400 text-sm">{p.university} · {p.track}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                                                <Clock className="w-3 h-3" />
                                                {new Date(m.joined_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                            {isOwner && !isMe && (
                                                <button
                                                    onClick={() => { setKickTarget({ id: m.participant_id, name: p.name }); setKickError(""); }}
                                                    className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-400/10"
                                                    title="นำออกจากทีม"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {team.members.length === 0 && (
                                <p className="text-gray-400 text-center text-sm py-2">ยังไม่มีสมาชิก</p>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <p className="text-center text-gray-400 text-sm">รอสมาชิกเข้าร่วมทีม...</p>
                    )}

                    {/* Kick confirmation popup */}
                    {kickTarget && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                            <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#0d1219] p-6 space-y-4 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                                        <X className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">นำออกจากทีม</p>
                                        <p className="text-xs text-gray-400 mt-0.5">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-300">
                                    คุณแน่ใจหรือไม่ว่าต้องการนำ <span className="text-white font-medium">{kickTarget.name}</span> ออกจากทีม?
                                    พวกเขาจะสามารถเข้าร่วมทีมอื่นได้หลังจากนี้
                                </p>
                                {kickError && (
                                    <p className="text-xs text-red-400 border border-red-400/20 bg-red-400/10 rounded-lg px-3 py-2">{kickError}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleKickConfirm}
                                        disabled={kicking}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                                        style={{
                                            background: kicking ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.15)",
                                            border: "1px solid rgba(239,68,68,0.3)",
                                            color: kicking ? "rgba(239,68,68,0.5)" : "#f87171",
                                            cursor: kicking ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {kicking ? "กำลังดำเนินการ..." : "นำออก"}
                                    </button>
                                    <button
                                        onClick={() => { setKickTarget(null); setKickError(""); }}
                                        disabled={kicking}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                                        style={{
                                            background: "rgba(90,122,148,0.1)",
                                            border: "1px solid rgba(90,122,148,0.25)",
                                            color: "#7aa4c4",
                                            cursor: kicking ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team Problem Interests Panel */}
                    {teamInterests.length > 0 && (() => {
                        const PROBLEM_LABELS: Record<string, { title: string; color: string }> = {
                            P1: { title: "Last-Mile Chronic Disease", color: "#91C4E3" },
                            P2: { title: "Traditional Medicine Data", color: "#91C4E3" },
                            P3: { title: "Preventive Intervention", color: "#91C4E3" },
                            P4: { title: "The Stigma Wall", color: "#A594BA" },
                            P5: { title: "Connected But Alone", color: "#A594BA" },
                            P6: { title: "Mental Care Last Mile", color: "#A594BA" },
                            P7: { title: "Data Rich, Action Poor", color: "#91C4E3" },
                            P8: { title: "Food Safety Blind Spot", color: "#91C4E3" },
                            P9: { title: "PM2.5 vs. Children", color: "#91C4E3" },
                        };
                        // Count how many members picked each problem
                        const counts: Record<string, string[]> = {};
                        teamInterests.forEach((entry) => {
                            (entry.problem_preferences || []).forEach((pid) => {
                                if (!counts[pid]) counts[pid] = [];
                                counts[pid].push(entry.name);
                            });
                        });
                        const sorted = Object.entries(counts).sort((a, b) => b[1].length - a[1].length);
                        const shared = sorted.filter(([, names]) => names.length > 1);

                        return (
                            <div className="bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80 border border-[#4a6b82]/15 rounded-2xl p-5 shadow-[0_0_20px_rgba(74,107,130,0.1)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-4 h-4 text-[#91C4E3]" />
                                    <span className="font-medium text-[#7aa4c4] text-sm">Team Problem Interests</span>
                                </div>
                                {shared.length > 0 && (
                                    <div className="mb-4 p-3 rounded-xl border border-[#91C4E3]/20" style={{ background: "rgba(145,196,227,0.05)" }}>
                                        <p className="text-[10px] text-[#91C4E3]/60 uppercase tracking-widest mb-2">Shared by multiple members</p>
                                        <div className="flex flex-wrap gap-2">
                                            {shared.map(([pid, names]) => {
                                                const info = PROBLEM_LABELS[pid];
                                                return info ? (
                                                    <div key={pid} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: `${info.color}15`, border: `1px solid ${info.color}35`, color: info.color }}>
                                                        <span className="font-mono opacity-60">{pid}</span>
                                                        <span>{info.title}</span>
                                                        <span className="opacity-50">·{names.length}</span>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {teamInterests.map((entry) => (
                                        <div key={entry.participant_id} className="flex items-start justify-between gap-3">
                                            <span className="text-xs text-gray-400 w-24 flex-shrink-0 truncate">{entry.name}</span>
                                            <div className="flex flex-wrap gap-1 flex-1">
                                                {(entry.problem_preferences || []).map((pid) => {
                                                    const info = PROBLEM_LABELS[pid];
                                                    return info ? (
                                                        <span key={pid} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${info.color}15`, color: `${info.color}80` }}>
                                                            {pid}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <a href="/pre-questionnaire" className="text-[10px] text-[#7aa4c4]/50 hover:text-[#7aa4c4] transition-colors">
                                        {teamInterests.length < team.members.length
                                            ? `${team.members.length - teamInterests.length} member(s) haven't filled the questionnaire yet →`
                                            : "All members have filled the questionnaire ✓"}
                                    </a>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Invite Link — closed */}
                    {false && isOwner && inviteEnabled && team.members.length < 5 && !inviteAlreadyUsed && (
                        <div className="bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80 border border-[#4a6b82]/15 rounded-2xl p-5 shadow-[0_0_20px_rgba(74,107,130,0.1)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Link className="w-4 h-4 text-[#7aa4c4]" />
                                <span className="font-medium text-[#7aa4c4] text-sm">ลิงก์เชิญสมาชิก</span>
                                <span className="text-xs text-gray-500 ml-auto">ใช้ได้ 1 ครั้ง</span>
                            </div>
                            {!inviteToken ? (
                                <button
                                    onClick={handleCreateInvite}
                                    disabled={inviteLoading}
                                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border border-[#5a7a94]/40 hover:border-[#7aa4c4]/60 text-[#7aa4c4] hover:text-white"
                                    style={{ background: "rgba(74,107,130,0.1)" }}
                                >
                                    {inviteLoading ? "กำลังสร้าง..." : "สร้างลิงก์เชิญ"}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 rounded-xl px-3 py-2 text-xs font-mono truncate" style={{ background: "rgba(10,20,30,0.8)", border: "1px solid rgba(74,107,130,0.3)", color: "#4A7090" }}>
                                        {`${typeof window !== "undefined" ? window.location.origin : ""}/hackathon/register/invite/${inviteToken}`}
                                    </div>
                                    <button onClick={copyInviteLink} className="flex-shrink-0 p-2 rounded-lg border border-[#5a7a94]/30 hover:border-[#7aa4c4]/60 text-gray-300 hover:text-[#7aa4c4] transition-colors">
                                        {inviteCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Leave Team Button — hidden for invited members */}
                    {!isInvited && (
                        <button
                            onClick={handleLeaveTeam}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#4a3a3a] to-[#3a2a2a] hover:from-[#6a3a3a] hover:to-[#5a2a2a] text-gray-300 hover:text-red-300 font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-500/20 hover:border-red-400/50 shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                        >
                            {loading ? "กำลังออกจากทีม..." : "ออกจากทีม"}
                        </button>
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
                <BackButton />
                <LogoutButton />
                <LineButton />
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <button onClick={() => { setView("home"); setError(""); }} className="text-gray-200 hover:text-[#7aa4c4] text-sm flex items-center gap-2 transition-colors group bg-[#1a2530]/60 border border-[#5a7a94]/20 hover:border-[#7aa4c4]/40 px-4 py-2 rounded-lg font-medium">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M10 12L6 8l4-4" />
                        </svg>
                        กลับ
                    </button>
                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#4a6b82]/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(74,107,130,0.15)]">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-[#5a7a94]/30 border-2 border-[#5a7a94]/50 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(90,122,148,0.4)]">
                                <RocketIcon className="w-8 h-8 text-[#7aa4c4]" />
                            </div>
                            <h2 className="text-3xl font-medium text-[#7aa4c4]">สร้างทีม</h2>
                            <p className="text-gray-300 text-sm mt-2">ตั้งชื่อทีมและรับรหัสล็อบบี้</p>
                        </div>
                        <div className="space-y-4">
                            <input
                                className="w-full bg-[#1a2530]/80 border-2 border-[#5a7a94]/40 rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#7aa4c4] focus:bg-[#1a2530] transition-all text-lg shadow-[0_0_10px_rgba(90,122,148,0.1)] focus:shadow-[0_0_20px_rgba(106,154,196,0.3)]"
                                placeholder="ชื่อทีม"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            />
                            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] hover:from-[#6a9ac4] hover:to-[#5a8ab4] text-white font-medium py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(90,122,148,0.4)] hover:shadow-[0_0_40px_rgba(106,154,196,0.6)] hover:scale-[1.02] border border-[#7aa4c4]/30"
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
                <LineButton />
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <button onClick={() => { setView("home"); setError(""); }} className="text-gray-200 hover:text-[#7aa4c4] text-sm flex items-center gap-2 transition-colors group bg-[#1a2530]/60 border border-[#5a7a94]/20 hover:border-[#7aa4c4]/40 px-4 py-2 rounded-lg font-medium">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M10 12L6 8l4-4" />
                        </svg>
                        กลับ
                    </button>
                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#6b5a7a]/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(107,90,122,0.15)]">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-[#8b7a9a]/30 border-2 border-[#8b7a9a]/50 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(139,122,154,0.4)]">
                                <KeyIcon className="w-8 h-8 text-[#b5a4ca]" />
                            </div>
                            <h2 className="text-3xl font-medium text-[#b5a4ca]">เข้าร่วมทีม</h2>
                            <p className="text-gray-300 text-sm mt-2">ใส่รหัสล็อบบี้ 6 หลัก</p>
                        </div>
                        <div className="space-y-4">
                            <input
                                className="w-full bg-[#1a2530]/80 border-2 border-[#8b7a9a]/40 rounded-xl px-5 py-4 text-white text-center placeholder-gray-400 font-mono text-2xl tracking-[0.5em] uppercase focus:outline-none focus:border-[#b5a4ca] focus:bg-[#1a2530] transition-all shadow-[0_0_10px_rgba(139,122,154,0.1)] focus:shadow-[0_0_20px_rgba(181,164,202,0.3)]"
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
                                className="w-full bg-gradient-to-r from-[#8b7a9a] to-[#7b6a8a] hover:from-[#b5a4ca] hover:to-[#a594ba] text-white font-medium py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(139,122,154,0.4)] hover:shadow-[0_0_40px_rgba(181,164,202,0.6)] hover:scale-[1.02] border border-[#b5a4ca]/30"
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
            <>
            <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
                <FractalGlassBackground />
                <BackButton />
                <LogoutButton />
                <LineButton />
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <button onClick={handleCancelMatching} disabled={loading} className="text-gray-200 hover:text-red-300 text-sm flex items-center gap-2 transition-colors group bg-[#4a3a3a]/60 border border-red-500/20 hover:border-red-400/40 px-4 py-2 rounded-lg font-medium">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M10 12L6 8l4-4" />
                        </svg>
                        ยกเลิก
                    </button>
                    <div className="bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 border border-[#5a7a94]/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(90,122,148,0.15)]">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto mb-6 relative">
                                <div className="absolute inset-0 bg-[#6a9ac4]/30 border-2 border-[#6a9ac4]/50 rounded-full animate-ping" />
                                <div className="absolute inset-0 bg-[#6a9ac4]/30 border-2 border-[#6a9ac4]/50 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(106,154,196,0.5)]">
                                    <FindIcon className="w-8 h-8 text-[#8abade]" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-medium text-[#8abade] mb-3">เข้าสู่รายชื่อหาทีมแล้ว!</h2>
                            <p className="text-gray-300 text-sm">เราได้เพิ่มคุณเข้าสู่รายชื่อหาทีมแล้ว</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-gray-300 text-sm">
                                <div className="w-5 h-5 rounded-full bg-[#6a9ac4]/30 border border-[#6a9ac4]/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-[#8abade]" />
                                </div>
                                <span>เราจะจัดให้คุณเจอทีมในงานวันที่ 4 เมษายน</span>
                            </div>
                            <div className="flex items-start gap-3 text-gray-300 text-sm">
                                <div className="w-5 h-5 rounded-full bg-[#6a9ac4]/30 border border-[#6a9ac4]/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-[#8abade]" />
                                </div>
                                <span>ติดตามกิจกรรมหาทีมได้ทาง Instagram</span>
                            </div>
                            <div className="flex items-start gap-3 text-gray-300 text-sm">
                                <div className="w-5 h-5 rounded-full bg-[#6a9ac4]/30 border border-[#6a9ac4]/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-[#8abade]" />
                                </div>
                                <span>หรือคุณสามารถสร้างทีมหรือเข้าร่วมทีมได้เลยตอนนี้</span>
                            </div>
                        </div>

                        <button
                            onClick={openFinder}
                            className="w-full mt-6 bg-gradient-to-r from-[#1e2a35] to-[#263a4a] hover:from-[#2a3a4a] hover:to-[#324a5a] text-[#8abade] hover:text-white font-medium py-3 rounded-xl transition-all duration-300 border-2 border-[#6a9ac4]/40 hover:border-[#8abade]/60 shadow-[0_0_15px_rgba(106,154,196,0.2)] hover:shadow-[0_0_25px_rgba(138,186,222,0.3)]"
                        >
                            เลือกคนที่อยากร่วมทีม
                        </button>

                        <button
                            onClick={handleCancelMatching}
                            disabled={loading}
                            className="w-full mt-3 bg-gradient-to-r from-[#4a3a3a] to-[#3a2a2a] hover:from-[#6a3a3a] hover:to-[#5a2a2a] text-gray-300 hover:text-red-300 font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-500/20 hover:border-red-400/50 shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                        >
                            {loading ? "กำลังออกจากรายชื่อ..." : "ออกจากรายชื่อหาทีม"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Find Team Modal */}
            {finderOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFinderOpen(false)} />
                    <div className="relative w-full max-w-md rounded-3xl border border-[#6a9ac4]/30 bg-[#0d1219] p-6 shadow-[0_0_40px_rgba(106,154,196,0.2)]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-white">เลือกคนที่อยากร่วมทีม</h2>
                            <button onClick={() => setFinderOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {!finderLoaded && (
                            <p className="text-sm text-slate-400 text-center py-6">กำลังโหลด...</p>
                        )}

                        {finderLoaded && !finderOptedIn && (
                            <div className="text-center py-4">
                                <p className="text-sm text-slate-300 mb-2">
                                    เข้าร่วมรายชื่อหาทีมเพื่อเลือกคนที่อยากร่วมทีม
                                </p>
                                <p className="text-sm text-slate-500 mb-5">
                                    {finderOthers.length} คนกำลังเลือกเพื่อนร่วมทีมอยู่
                                </p>
                                <button
                                    onClick={handleFinderJoin}
                                    disabled={finderJoining}
                                    className="px-6 py-2 rounded-xl bg-[#6a9ac4] hover:bg-[#8abade] text-white font-medium text-sm transition-colors disabled:opacity-50"
                                >
                                    {finderJoining ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
                                </button>
                            </div>
                        )}

                        {finderLoaded && finderOptedIn && (
                            <div>
                                <p className="text-xs text-slate-400 mb-4">
                                    เลือกสูงสุด 5 คน เรียงตามลำดับความต้องการ — {finderOthers.length + 1} คนในรายชื่อ
                                </p>
                                <div className="flex flex-col gap-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <PreferenceCombobox
                                            key={i}
                                            value={finderPrefs[i] ?? null}
                                            onChange={(val) => setFinderPref(i, val)}
                                            options={finderOptionsFor(i)}
                                            placeholder={`อันดับ ${i + 1}...`}
                                        />
                                    ))}
                                </div>
                                {finderSaveMsg && (
                                    <p className="text-xs text-slate-400 mt-3 text-right">{finderSaveMsg}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            </>
        );
    }

    // ─── Home View (No Team) ────────────────────────────────────────────────
    return (
        <div className="min-h-screen relative text-white flex items-center justify-center px-4 font-[family-name:var(--font-mitr)] overflow-hidden">
            <FractalGlassBackground />
            <BackButton />
            <LogoutButton />
            <LineButton />

            <div className="w-full max-w-xl space-y-8 text-center relative z-10">
                <div>
                    <div className="mb-4 inline-block">
                        <div className="w-24 h-24 mx-auto bg-[#5a7a94]/30 border-2 border-[#7aa4c4]/60 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(106,154,196,0.6)] relative">
                            <div className="absolute inset-0 bg-[#7aa4c4]/10 rounded-full animate-pulse" />
                            <PartyIcon className="w-12 h-12 text-[#8abade] relative z-10" />
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm tracking-widest uppercase mb-2 font-medium">
                        คุณสมัครเสร็จสิ้น
                    </p>
                    <p className="text-[#7aa4c4] text-base tracking-[0.3em] uppercase mb-3 font-medium">
                        ยินดีต้อนรับ
                    </p>
                    <h1 className="text-5xl md:text-6xl font-medium mb-2 text-white" style={{ letterSpacing: '-0.02em' }}>
                        {participant.name}
                    </h1>
                    <p className="text-gray-300 mt-3 text-base font-medium">เลือกวิธีเข้าร่วมทีมของคุณ</p>
                </div>

                <div className="grid gap-5 pt-4">
                    {/* Create Team Button */}
                    <button
                        onClick={() => setView("create")}
                        className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#1a2530]/95 to-[#1e3444]/90 border-2 border-[#5a7a94]/50 hover:border-[#6a9ac4]/80 shadow-[0_0_30px_rgba(90,122,148,0.3)] hover:shadow-[0_0_40px_rgba(106,154,196,0.5)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#5a7a94]/0 via-[#5a7a94]/20 to-[#5a7a94]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#5a7a94]/30 border-2 border-[#5a7a94]/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#5a7a94]/40 transition-all duration-300 shadow-[0_0_20px_rgba(90,122,148,0.4)]">
                                    <RocketIcon className="w-8 h-8 text-[#7aa4c4]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-medium text-white group-hover:text-[#7aa4c4] transition-colors duration-300">
                                        สร้างทีม
                                    </h3>
                                    <p className="text-gray-300 text-sm mt-1 group-hover:text-gray-200 transition-colors">
                                        สร้างล็อบบี้และรับรหัสเพื่อให้เพื่อนเข้าร่วม
                                    </p>
                                </div>
                                <div className="text-[#5a7a94] group-hover:text-[#7aa4c4] group-hover:translate-x-1 transition-all duration-300">
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
                        className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#251e30]/95 to-[#332940]/90 border-2 border-[#8b7a9a]/50 hover:border-[#b5a4ca]/80 shadow-[0_0_30px_rgba(139,122,154,0.3)] hover:shadow-[0_0_40px_rgba(181,164,202,0.5)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#8b7a9a]/0 via-[#8b7a9a]/20 to-[#8b7a9a]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#8b7a9a]/30 border-2 border-[#8b7a9a]/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#8b7a9a]/40 transition-all duration-300 shadow-[0_0_20px_rgba(139,122,154,0.4)]">
                                    <KeyIcon className="w-8 h-8 text-[#b5a4ca]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-medium text-white group-hover:text-[#b5a4ca] transition-colors duration-300">
                                        เข้าร่วมทีม
                                    </h3>
                                    <p className="text-gray-300 text-sm mt-1 group-hover:text-gray-200 transition-colors">
                                        ใส่รหัสล็อบบี้จากเพื่อนของคุณ
                                    </p>
                                </div>
                                <div className="text-[#8b7a9a] group-hover:text-[#b5a4ca] group-hover:translate-x-1 transition-all duration-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Find Team Button */}
                    <button
                        onClick={() => {
                            if (hasActiveMatchingEvent) {
                                router.push("/hackathon/matching");
                                return;
                            }
                            handleStartMatching();
                        }}
                        className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-[#1e2a35]/95 to-[#263a4a]/90 border-2 border-[#6a9ac4]/50 hover:border-[#8abade]/80 shadow-[0_0_30px_rgba(106,154,196,0.3)] hover:shadow-[0_0_40px_rgba(138,186,222,0.5)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#6a9ac4]/0 via-[#6a9ac4]/20 to-[#6a9ac4]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative p-7">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#6a9ac4]/30 border-2 border-[#6a9ac4]/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#6a9ac4]/40 transition-all duration-300 shadow-[0_0_20px_rgba(106,154,196,0.4)]">
                                    <FindIcon className="w-8 h-8 text-[#8abade]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-2xl font-medium text-white group-hover:text-[#8abade] transition-colors duration-300">
                                        {hasActiveMatchingEvent ? "จัดอันดับคนที่เจอ" : "หาทีม"}
                                    </h3>
                                    <p className="text-gray-300 text-sm mt-1 group-hover:text-gray-200 transition-colors">
                                        {hasActiveMatchingEvent
                                            ? "เลือกคนที่คุณได้คุยด้วยและจัดอันดับเพื่อให้ระบบจับทีมอัตโนมัติ"
                                            : "จับคู่อัตโนมัติกับสมาชิกทีมที่ยังเปิดรับ"}
                                    </p>
                                </div>
                                <div className="text-[#6a9ac4] group-hover:text-[#8abade] group-hover:translate-x-1 transition-all duration-300">
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
