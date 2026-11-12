"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";

interface TeamRow {
  teamId: string; label: string; members: number; cycles: number;
  completion: number | null; scoredSubs: number;
  honestWrongness: boolean; learningIndex: number | null; fidelity: number | null;
  aiLikelihood: number | null; engagement: number; iteration: number;
  semifinal: number | null; round1: number | null; quadrant: string | null;
}
interface Payload {
  teams: TeamRow[];
  medians: { learning: number; semifinal: number; round1: number };
  counts: { total: number; finalists: number; round1: number };
}
interface TeamDetail {
  journey: string | null;
  submissions: { scope: string; activity: string; text: string | null; image: string | null;
    fidelity: number | null; ai: number | null;
    exemplar: string | null; criteriaMet: string[]; redFlags: string[]; rationale: string }[];
  cycles: { cycleNumber: number | null; work: string | null; total: number; honestWrongness: boolean; rationale: string }[];
  video: {
    total: number; aiLikelihood: number | null; journey: string | null; summary: string | null;
    storyClarity: number | null; evidenceIntegration: number | null; delivery: number | null;
    problemShown: boolean; solutionShown: boolean; demoShown: boolean; videoUrl: string | null; rationale: string;
  } | null;
  summary: { avgFidelity: number | null; avgCycleRigor: number | null; scoredSubmissions: number; scoredCycles: number };
}
interface FunnelStage { label: string; phase: number; teams: number; drop: number; pctOfStart: number; }
interface ExpTeam {
  teamId: string; label: string; division: string | null;
  semifinal: number; round1: number | null; avgExperience: number; members: number;
}

const QUADRANT = {
  grew_delivered: { label: "Grew + Delivered", color: "#22c55e", emoji: "🌟" },
  undervalued_growth: { label: "Undervalued Growth", color: "#3b82f6", emoji: "🔑" },
  polished_coaster: { label: "Polished Coaster", color: "#f59e0b", emoji: "🪤" },
  disengaged: { label: "Disengaged", color: "#9ca3af", emoji: "😐" },
} as const;

const isTestTeam = (label: string) => /test|ทดสอบ|^demo/i.test(label);

export function LearningAnalyticsDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideTest, setHideTest] = useState(true);
  const [minMembers, setMinMembers] = useState(1);
  const [quadrantFilter, setQuadrantFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof TeamRow>("learningIndex");
  const [chartView, setChartView] = useState<"finalists" | "all">("finalists");
  const [selected, setSelected] = useState<TeamRow | null>(null);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [funnel, setFunnel] = useState<Record<string, FunnelStage[]> | null>(null);
  const [expTeams, setExpTeams] = useState<ExpTeam[] | null>(null);
  const [scoreRound, setScoreRound] = useState<"semifinal" | "round1">("semifinal");
  const [detailError, setDetailError] = useState(false);
  const [funnelError, setFunnelError] = useState(false);
  const [expError, setExpError] = useState(false);

  async function openTeam(t: TeamRow) {
    setSelected(t); setDetail(null); setDetailError(false); setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/hackathon/learning/${t.teamId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDetail(await res.json());
    } catch {
      setDetailError(true);
    } finally { setDetailLoading(false); }
  }

  async function loadMain() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hackathon/learning");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function loadFunnel() {
    setFunnelError(false);
    fetch("/api/admin/hackathon/learning/funnel")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setFunnel(d.divisions ?? null))
      .catch(() => setFunnelError(true));
  }

  function loadExperience() {
    setExpError(false);
    fetch("/api/admin/hackathon/learning/experience")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setExpTeams(d.teams ?? null))
      .catch(() => setExpError(true));
  }

  useEffect(() => {
    void loadMain();
    loadFunnel();
    loadExperience();
  }, []);

  const teams = useMemo(() => {
    if (!data) return [];
    return data.teams.filter((t) =>
      (!hideTest || !isTestTeam(t.label)) &&
      t.members >= minMembers &&
      (!quadrantFilter || t.quadrant === quadrantFilter),
    );
  }, [data, hideTest, minMembers, quadrantFilter]);

  const finalists = useMemo(
    () => teams.filter((t) => t[scoreRound] !== null && t.learningIndex !== null),
    [teams, scoreRound],
  );
  const allTeams = useMemo(
    () => teams.filter((t) => t.learningIndex !== null && t.completion !== null),
    [teams],
  );
  const ranked = useMemo(
    () => [...teams].sort((a, b) => (Number(b[sortKey] ?? -1) - Number(a[sortKey] ?? -1))),
    [teams, sortKey],
  );

  if (loading) return <Card><CardContent className="py-12 text-center text-muted-foreground">Loading learning analytics…</CardContent></Card>;
  if (error)
    return (
      <AdminErrorState
        title="Could not load learning analytics"
        message={error}
        onRetry={() => void loadMain()}
      />
    );
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* summary */}
      <div className="flex items-center justify-between">
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-5">
          <Stat title="Teams" value={data.counts.total} />
          <Stat title="Semifinalists" value={data.counts.finalists} />
          <Stat title="Round 1 teams" value={data.counts.round1} />
          <Stat title="Median Learning" value={data.medians.learning.toFixed(1)} />
          <Stat title="Med R1 / R2" value={`${data.medians.round1.toFixed(1)} / ${data.medians.semifinal.toFixed(1)}`} />
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/hackathon/learning/export"
          className="ml-4 shrink-0 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          ⬇ Export CSV
        </a>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hideTest} onChange={(e) => setHideTest(e.target.checked)} />
          Hide test teams
        </label>
        <label className="flex items-center gap-2">
          Min members
          <input type="number" min={1} max={6} value={minMembers}
            onChange={(e) => setMinMembers(Number(e.target.value))}
            className="w-14 rounded border px-2 py-1" />
        </label>
        <div className="flex gap-1">
          <button onClick={() => setQuadrantFilter(null)}
            className={`rounded px-2 py-1 ${!quadrantFilter ? "bg-foreground text-background" : "border"}`}>All</button>
          {Object.entries(QUADRANT).map(([k, q]) => (
            <button key={k} onClick={() => setQuadrantFilter(k)}
              className={`rounded px-2 py-1 ${quadrantFilter === k ? "text-background" : "border"}`}
              style={quadrantFilter === k ? { background: q.color } : {}}>
              {q.emoji} {q.label}
            </button>
          ))}
        </div>
      </div>

      {funnelError ? (
        <AdminErrorState title="Could not load the drop-off funnel" onRetry={loadFunnel} />
      ) : (
        funnel && <FunnelCard divisions={funnel} />
      )}

      {/* scatter */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>
                {chartView === "finalists"
                  ? `Learning × ${scoreRound === "round1" ? "Round 1" : "Semifinal"}`
                  : "Learning × Completion, all teams"}
              </CardTitle>
              <CardDescription>
                {chartView === "finalists"
                  ? `Process (did they learn) vs outcome (judges' score). Top-left 🔑 undervalued growth; bottom-right 🪤 polished coasters.`
                  : `All ${allTeams.length} teams. X = how far through the program; Y = Learning Index. Dropouts cluster bottom-left. Click any dot.`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1 text-sm">
              <button onClick={() => setChartView("finalists")}
                className={`rounded px-3 py-1 ${chartView === "finalists" ? "bg-foreground text-background" : "border"}`}>Finalists (2×2)</button>
              <button onClick={() => setChartView("all")}
                className={`rounded px-3 py-1 ${chartView === "all" ? "bg-foreground text-background" : "border"}`}>All teams</button>
              {chartView === "finalists" && (
                <div className="flex gap-1 border-l pl-1 ml-1">
                  <button onClick={() => setScoreRound("semifinal")}
                    className={`rounded px-3 py-1 ${scoreRound === "semifinal" ? "bg-blue-600 text-white" : "border"}`}>Round 2 (Semi)</button>
                  <button onClick={() => setScoreRound("round1")}
                    className={`rounded px-3 py-1 ${scoreRound === "round1" ? "bg-amber-500 text-white" : "border"}`}>Round 1</button>
                </div>
              )}
            </div>
          </div>
          {/* legend */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {Object.entries(QUADRANT).map(([k, q]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: q.color }} />
                {q.emoji} {q.label}
              </span>
            ))}
            <span className="text-muted-foreground">· dot size = team members · click a dot for evidence</span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={460}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey={chartView === "finalists" ? scoreRound : "completion"}
                name={chartView === "finalists" ? (scoreRound === "round1" ? "Round 1" : "Semifinal") : "Completion"}
                domain={chartView === "finalists" ? (scoreRound === "round1" ? [40, 75] : [0, 60]) : [0, 100]}
                label={{ value: chartView === "finalists" ? (scoreRound === "round1" ? "Round 1 score (judges)" : "Semifinal score (judges)") : "Completion %", position: "bottom", offset: 0 }}
              />
              <YAxis type="number" dataKey="learningIndex" name="Learning" domain={[0, 100]}
                label={{ value: "Learning Index", angle: -90, position: "insideLeft" }} />
              <ZAxis type="number" dataKey="members" range={[40, 260]} name="Members" />
              {chartView === "finalists" && (
                <ReferenceLine
                  x={scoreRound === "round1" ? data.medians.round1 : data.medians.semifinal}
                  stroke="#888" strokeDasharray="4 4"
                />
              )}
              <ReferenceLine y={data.medians.learning} stroke="#888" strokeDasharray="4 4" />
              <Tooltip content={<DotTip mode={chartView} scoreRound={scoreRound} />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartView === "finalists" ? finalists : allTeams}
                onClick={(d) => { const t = (d as unknown as { payload?: TeamRow }).payload; if (t) openTeam(t); }}
                cursor="pointer">
                {(chartView === "finalists" ? finalists : allTeams).map((t) => (
                  <Cell key={t.teamId}
                    fill={QUADRANT[t.quadrant as keyof typeof QUADRANT]?.color ?? "#9ca3af"}
                    fillOpacity={chartView === "all" && !t.quadrant ? 0.45 : 0.8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {expError ? (
        <AdminErrorState title="Could not load the experience chart" onRetry={loadExperience} />
      ) : (
        expTeams && expTeams.length > 0 && <ExperienceChart teams={expTeams} />
      )}


      {/* ranked table */}
      <Card>
        <CardHeader>
          <CardTitle>All teams ({ranked.length})</CardTitle>
          <CardDescription>
            Click a row for the evidence. <b>Learning</b> = quality × completion (rewards finishing).
            <b> Fidelity</b> = how well their submissions met the activity specs (raw quality, not adjusted).
            <b> Completion</b> = how far through the 4 phases they got. <b>AI%</b> is independent.
            Click a column header to re-sort.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {([["label", "Team"], ["learningIndex", "Learning"], ["fidelity", "Fidelity"],
                   ["completion", "Completion"], ["aiLikelihood", "AI%"], ["round1", "R1"],
                   ["semifinal", "R2 (Semi)"], ["cycles", "P3 cyc"], ["scoredSubs", "Subs"],
                   ["members", "Mem"]] as [keyof TeamRow, string][]).map(([k, lbl]) => (
                  <th key={k} className="cursor-pointer px-2 py-2 hover:text-foreground"
                    onClick={() => setSortKey(k)}>{lbl}</th>
                ))}
                <th className="px-2 py-2">Quadrant</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((t) => {
                const q = QUADRANT[t.quadrant as keyof typeof QUADRANT];
                const lowN = t.members < 2 || (t.learningIndex !== null && (t.cycles + t.members) < 2);
                return (
                  <tr key={t.teamId} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => openTeam(t)}>
                    <td className="px-2 py-1.5 font-medium">
                      {t.label}
                      {t.honestWrongness && <span title="Admitted being wrong (genuine learning)"> 💡</span>}
                      {lowN && <span title="Low data volume: interpret with caution" className="ml-1 text-amber-500">⚠</span>}
                    </td>
                    <td className="px-2 py-1.5 font-semibold">{t.learningIndex?.toFixed(1) ?? "–"}</td>
                    <td className="px-2 py-1.5">{t.fidelity?.toFixed(0) ?? "–"}</td>
                    <td className="px-2 py-1.5">{t.completion != null ? `${t.completion}%` : "–"}</td>
                    <td className="px-2 py-1.5">{t.aiLikelihood?.toFixed(0) ?? "–"}</td>
                    <td className="px-2 py-1.5">{t.round1?.toFixed(1) ?? "–"}</td>
                    <td className="px-2 py-1.5">{t.semifinal?.toFixed(1) ?? "–"}</td>
                    <td className="px-2 py-1.5">{t.cycles || "–"}</td>
                    <td className="px-2 py-1.5">{t.scoredSubs}</td>
                    <td className="px-2 py-1.5">{t.members}</td>
                    <td className="px-2 py-1.5">
                      {q && <span className="rounded px-1.5 py-0.5 text-xs text-white" style={{ background: q.color }}>{q.emoji} {q.label}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selected && (
        <TeamDrawer
          team={selected}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onRetry={() => void openTeam(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TeamDrawer({ team, detail, loading, error, onRetry, onClose }: {
  team: TeamRow; detail: TeamDetail | null; loading: boolean; error: boolean; onRetry: () => void; onClose: () => void;
}) {
  const q = QUADRANT[team.quadrant as keyof typeof QUADRANT];
  const fidComp = detail?.summary.avgFidelity ?? team.fidelity ?? 0;
  const rigorComp = detail?.summary.avgCycleRigor;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{team.label} {q?.emoji}</h2>
            <div className="text-sm text-muted-foreground">
              Learning {team.learningIndex?.toFixed(1)} · Semifinal {team.semifinal?.toFixed(1) ?? "–"} · {q?.label}
            </div>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1 text-sm">Close</button>
        </div>

        {/* the math */}
        <div className="mb-5 rounded-lg border p-3 text-sm">
          <div className="mb-2 font-semibold">How the {team.learningIndex?.toFixed(1)} is built</div>
          <Bar label="Plan-fidelity (Phase 1–2)" weight="×0.45" value={fidComp} />
          {rigorComp != null && <Bar label="Cycle-rigor (Phase 3)" weight="×0.25" value={rigorComp} />}
          <Bar label="Iteration (normalized)" weight="×0.18" value={team.iteration} />
          <Bar label="Engagement (normalized)" weight="×0.12" value={team.engagement} />
          <div className="mt-2 text-xs text-muted-foreground">
            AI-likelihood ({team.aiLikelihood?.toFixed(0)}%) is independent and never folded into the index.
          </div>
        </div>

        {loading && <div className="py-8 text-center text-muted-foreground">Loading evidence…</div>}
        {error && <AdminErrorState title="Could not load this team's evidence" onRetry={onRetry} />}

        {detail && (
          <>
            {detail.journey && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  🧭 Journey across all phases
                </div>
                <div className="text-sm leading-snug text-amber-950 dark:text-amber-100">{detail.journey}</div>
              </div>
            )}

            {detail.video && (
              <div className="mb-4 rounded-lg border border-violet-300 bg-violet-50/60 p-3 dark:border-violet-500/40 dark:bg-violet-500/10">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  🎬 Round-1 video pitch
                  <span className="rounded bg-violet-200 px-1.5 py-0.5 font-mono text-violet-900 dark:bg-violet-500/25 dark:text-violet-200">{detail.video.total}/100</span>
                  {detail.video.aiLikelihood != null && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">ai {detail.video.aiLikelihood}%</span>
                  )}
                  {detail.video.videoUrl && (
                    <a href={detail.video.videoUrl} target="_blank" rel="noreferrer" className="ml-auto text-[11px] text-blue-600 underline dark:text-blue-400">watch ↗</a>
                  )}
                </div>
                {detail.video.journey && (
                  <div className="mb-1.5 text-sm leading-snug text-violet-950 dark:text-violet-100">
                    <span className="text-[10px] uppercase text-violet-500 dark:text-violet-400">in the pitch · </span>{detail.video.journey}
                  </div>
                )}
                <div className="mb-1.5 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-white px-1.5 py-0.5 text-foreground dark:bg-white/10">story {detail.video.storyClarity}/30</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-foreground dark:bg-white/10">evidence {detail.video.evidenceIntegration}/40</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-foreground dark:bg-white/10">delivery {detail.video.delivery}/30</span>
                  <span className={`rounded px-1.5 py-0.5 ${detail.video.demoShown ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"}`}>{detail.video.demoShown ? "demo ✓" : "no demo"}</span>
                </div>
                {detail.video.rationale && (
                  <div className="text-xs text-foreground/90"><span className="text-[10px] uppercase text-muted-foreground">model rationale </span>{detail.video.rationale}</div>
                )}
              </div>
            )}

            <div className="mb-2 text-sm font-semibold">
              Phase 1–2 submissions ({detail.summary.scoredSubmissions}), avg fidelity {detail.summary.avgFidelity?.toFixed(1)}
            </div>
            <div className="space-y-2">
              {detail.submissions.map((s, i) => (
                <div key={i} className="rounded border p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 font-mono ${(s.fidelity ?? 0) >= 70 ? "bg-green-100 text-green-800" : (s.fidelity ?? 0) >= 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>fid {s.fidelity}</span>
                    <span className="text-muted-foreground">ai {s.ai}%</span>
                    <span className="text-muted-foreground">{s.exemplar}</span>
                    <span className="font-medium">{s.activity}</span>
                    <span className="ml-auto rounded bg-muted px-1 text-[10px] uppercase">{s.scope}</span>
                  </div>
                  {s.text && (
                    <div className="mt-1.5 whitespace-pre-wrap rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
                      <span className="text-[10px] uppercase text-muted-foreground">student wrote</span>
                      {"\n"}{s.text.length > 1200 ? s.text.slice(0, 1200) + "…" : s.text}
                    </div>
                  )}
                  {s.image && (
                    <a href={s.image} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 underline">
                      view submitted image ↗
                    </a>
                  )}
                  <div className="mt-1.5"><span className="text-[10px] uppercase text-muted-foreground">model rationale </span>{s.rationale}</div>
                  {s.redFlags.length > 0 && <div className="mt-1 text-red-600">⚑ {s.redFlags.join("; ")}</div>}
                </div>
              ))}
            </div>

            {detail.cycles.length > 0 && (
              <>
                <div className="mb-2 mt-5 text-sm font-semibold">
                  Phase 3 cycles ({detail.summary.scoredCycles}), avg rigor {detail.summary.avgCycleRigor?.toFixed(1)}/100
                </div>
                <div className="space-y-2">
                  {detail.cycles.map((c, i) => (
                    <div key={i} className="rounded border p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-800">{c.total}/100</span>
                        {c.cycleNumber != null && <span className="font-medium">Cycle #{c.cycleNumber}</span>}
                        {c.honestWrongness && <span title="Admitted being wrong">💡 honest wrongness</span>}
                      </div>
                      {c.work && (
                        <div className="mt-1.5 whitespace-pre-wrap rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
                          <span className="text-[10px] uppercase text-muted-foreground">team wrote</span>
                          {"\n"}{c.work}
                        </div>
                      )}
                      <div className="mt-1.5"><span className="text-[10px] uppercase text-muted-foreground">model rationale </span>{c.rationale}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Bar({ label, weight, value }: { label: string; weight: string; value: number }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="w-44 shrink-0">{label} <span className="text-muted-foreground">{weight}</span></div>
      <div className="h-2 flex-1 rounded bg-muted">
        <div className="h-2 rounded bg-foreground" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <div className="w-10 text-right font-mono">{value.toFixed(0)}</div>
    </div>
  );
}

function FunnelCard({ divisions }: { divisions: Record<string, FunnelStage[]> }) {
  const [div, setDiv] = useState<"all" | "high_school" | "university">("all");
  const stages = divisions[div] ?? [];
  const start = stages[0]?.teams || 1;
  const maxDrop = Math.max(1, ...stages.map((s) => s.drop));
  const tabs: [typeof div, string][] = [["all", "All"], ["high_school", "High School"], ["university", "University"]];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Drop-off funnel</CardTitle>
            <CardDescription>
              Distinct teams active at each stage. Red = the biggest bleed points. Bar width = % of registered teams.
            </CardDescription>
          </div>
          <div className="flex gap-1 text-sm">
            {tabs.map(([k, lbl]) => (
              <button key={k} onClick={() => setDiv(k)}
                className={`rounded px-3 py-1 ${div === k ? "bg-foreground text-background" : "border"}`}>{lbl}</button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {stages.map((s, i) => {
          const bigDrop = s.drop > 0 && s.drop >= maxDrop * 0.6;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-52 shrink-0 truncate" title={s.label}>{s.label}</div>
              <div className="relative h-5 flex-1 rounded bg-muted">
                <div className="flex h-5 items-center rounded bg-foreground/80 px-2 text-[11px] font-medium text-background"
                  style={{ width: `${Math.max(6, (s.teams / start) * 100)}%` }}>
                  {s.teams}
                </div>
              </div>
              <div className="w-12 text-right text-muted-foreground">{s.pctOfStart}%</div>
              <div className={`w-16 text-right ${bigDrop ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                {s.drop > 0 ? `−${s.drop}` : ""}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ExperienceChart({ teams }: { teams: ExpTeam[] }) {
  const [divFilter, setDivFilter] = useState<"all" | "high_school" | "university">("all");
  const [expRound, setExpRound] = useState<"semifinal" | "round1">("semifinal");

  const baseFiltered = divFilter === "all" ? teams : teams.filter((t) => t.division === divFilter);
  // For round1 view, only show teams that have round1 data
  const filtered = expRound === "round1"
    ? baseFiltered.filter((t) => t.round1 !== null)
    : baseFiltered;

  const scoreKey = expRound === "round1" ? "round1" : "semifinal";
  const scoreLabel = expRound === "round1" ? "Round 1 score" : "Semifinal score";
  const scoreDomain = expRound === "round1" ? ([40, 75] as [number, number]) : ([0, 60] as [number, number]);

  // Bucket teams by experience bracket (1-3, 4-6, 7-10)
  const brackets = [
    { key: "1–3", label: "1–3\nFirst-timer", min: 1, max: 3 },
    { key: "4–6", label: "4–6\nSome exp", min: 4, max: 6 },
    { key: "7–10", label: "7–10\nVeteran", min: 7, max: 10 },
  ];
  const stats = brackets.map(({ key, min, max }) => {
    const bucket = filtered.filter((t) => t.avgExperience >= min && t.avgExperience <= max);
    const scores = bucket.map((t) => (expRound === "round1" ? (t.round1 ?? 0) : t.semifinal));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const sorted = [...scores].sort((a, b) => a - b);
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    return { key, count: bucket.length, avg, med };
  });

  const tabs: [typeof divFilter, string][] = [["all", "All"], ["high_school", "High School"], ["university", "University"]];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Prior experience vs Judge score</CardTitle>
            <CardDescription>
              X = avg team <b>experience_level</b> from registration (1 = first-timer, 10 = veteran).
              Y = {scoreLabel}. Dot size = team members.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 text-sm">
            {tabs.map(([k, lbl]) => (
              <button key={k} onClick={() => setDivFilter(k)}
                className={`rounded px-3 py-1 ${divFilter === k ? "bg-foreground text-background" : "border"}`}>{lbl}</button>
            ))}
            <div className="flex gap-1 border-l pl-1 ml-1">
              <button onClick={() => setExpRound("semifinal")}
                className={`rounded px-3 py-1 ${expRound === "semifinal" ? "bg-blue-600 text-white" : "border"}`}>Round 2 (Semi)</button>
              <button onClick={() => setExpRound("round1")}
                className={`rounded px-3 py-1 ${expRound === "round1" ? "bg-amber-500 text-white" : "border"}`}>Round 1</button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" dataKey="avgExperience" name="Experience" domain={[1, 10]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              label={{ value: "Avg experience level (registration)", position: "bottom", offset: 0 }} />
            <YAxis type="number" dataKey={scoreKey} name={scoreLabel} domain={scoreDomain}
              label={{ value: scoreLabel, angle: -90, position: "insideLeft" }} />
            <ZAxis type="number" dataKey="members" range={[40, 220]} name="Members" />
            {(() => {
              const scores = filtered.map((t) => (expRound === "round1" ? (t.round1 ?? 0) : t.semifinal)).sort((a, b) => a - b);
              const med = scores.length ? scores[Math.floor(scores.length / 2)] : null;
              return med !== null ? <ReferenceLine y={med} stroke="#888" strokeDasharray="4 4" label={{ value: `med ${med.toFixed(1)}`, position: "right", fontSize: 10 }} /> : null;
            })()}
            <Tooltip content={<ExpDotTip scoreRound={expRound} />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={filtered} fill="#8b5cf6" fillOpacity={0.75}>
              {filtered.map((t) => (
                <Cell key={t.teamId}
                  fill={t.division === "high_school" ? "#3b82f6" : t.division === "university" ? "#f59e0b" : "#8b5cf6"}
                  fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Bracket summary */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          {stats.map((s) => (
            <div key={s.key} className="rounded-lg border p-3">
              <div className="font-semibold">Exp {s.key}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {s.key === "1–3" ? "First-timer" : s.key === "4–6" ? "Some experience" : "Veteran"}
              </div>
              <div className="mt-2 space-y-0.5 text-xs">
                <div>{s.count} teams</div>
                <div>Avg score: <span className="font-mono font-semibold">{s.avg !== null ? s.avg.toFixed(1) : "–"}</span></div>
                <div>Median: <span className="font-mono">{s.med !== null ? s.med.toFixed(1) : "–"}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3b82f6]" /> High school</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> University</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" /> Unknown division</span>
          <span className="ml-2">· dot size = members</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpDotTip({ active, payload, scoreRound = "semifinal" }: {
  active?: boolean; payload?: Array<{ payload: ExpTeam }>; scoreRound?: "semifinal" | "round1";
}) {
  if (!active || !payload?.length) return null;
  const t = payload[0].payload;
  const score = scoreRound === "round1" ? t.round1 : t.semifinal;
  const label = scoreRound === "round1" ? "Round 1" : "Semifinal";
  return (
    <div className="rounded border bg-background p-2 text-xs shadow">
      <div className="font-semibold">{t.label}</div>
      <div>{label} {score != null ? score.toFixed(1) : "–"} · Avg exp {t.avgExperience.toFixed(1)}</div>
      <div>{t.members} members · {t.division ?? "unknown"}</div>
    </div>
  );
}

function DotTip({ active, payload, mode, scoreRound = "semifinal" }: {
  active?: boolean; payload?: Array<{ payload: TeamRow }>; mode?: "finalists" | "all"; scoreRound?: "semifinal" | "round1";
}) {
  if (!active || !payload?.length) return null;
  const t = payload[0].payload;
  const q = QUADRANT[t.quadrant as keyof typeof QUADRANT];
  const scoreVal = scoreRound === "round1" ? t.round1 : t.semifinal;
  const scoreLabel = scoreRound === "round1" ? "Round 1" : "Semifinal";
  return (
    <div className="rounded border bg-background p-2 text-xs shadow">
      <div className="font-semibold">{t.label} {q?.emoji}</div>
      <div>
        Learning {t.learningIndex?.toFixed(1)}
        {mode === "all"
          ? ` · Completion ${t.completion}%`
          : ` · ${scoreLabel} ${scoreVal?.toFixed(1) ?? "–"}`}
      </div>
      <div>Fidelity {t.fidelity?.toFixed(0)} · AI {t.aiLikelihood?.toFixed(0)}% · {t.members} members · {t.scoredSubs} subs · {t.cycles} cycles</div>
      <div className="mt-0.5 text-muted-foreground">click for evidence</div>
    </div>
  );
}
