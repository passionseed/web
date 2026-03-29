"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Heart,
  Lightbulb,
  Target,
  Users,
  Zap,
} from "lucide-react";
import {
  getLocalizedText,
  parseProblemBrief,
  type ProblemBrief,
  type ProblemBriefSource,
} from "@/lib/hackathon/problem-brief-schema";

const TRACK_INFO: Record<string, { title: string; subtitle: string; icon: string }> = {
  "01": {
    title: "Traditional & Integrative Healthcare",
    subtitle: "แพทย์แผนไทยและการแพทย์เชิงป้องกัน",
    icon: "🏥",
  },
  "02": {
    title: "Mental Health",
    subtitle: "สุขภาพจิตและความเป็นอยู่ที่ดี",
    icon: "🧠",
  },
  "03": {
    title: "Community, Public & Environmental Health",
    subtitle: "สุขภาพชุมชนและสิ่งแวดล้อม",
    icon: "🌍",
  },
};

type Lang = "en" | "th";

const COPY = {
  en: {
    back: "← Back to Challenge Brief",
    loading: "Loading...",
    notFound: "Problem not found",
    problem: "The Problem",
    challenge: "The Challenge",
    impact: "Real-World Impact",
    research: "Research & Statistics",
    deepResearch: "AI Deep Research Dossier",
    affectedPopulations: "Affected Populations",
    stakeholderMap: "Stakeholder Map",
    primaryStakeholders: "Primary Stakeholders",
    secondaryStakeholders: "Secondary Stakeholders",
    rootCauses: "Root Causes",
    existingSolutions: "Existing Solutions",
    opportunityAreas: "Opportunity Areas",
    keyInsights: "Key Insights",
    resources: "Resources & References",
    severity: "Severity",
    difficulty: "Difficulty",
    feasibility: "Feasibility",
    impactLabel: "Impact",
    urgency: "Urgency",
    size: "Size",
    needs: "Needs",
    painPoints: "Pain points",
    influence: "Influence",
    interest: "Interest",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    ready: "Ready to solve this problem?",
    cta: "Join the hackathon and build a solution that could change millions of lives.",
    register: "Register Now",
    viewAll: "View All Problems",
    track: "Track",
  },
  th: {
    back: "← กลับไปหน้ารวมโจทย์",
    loading: "กำลังโหลด...",
    notFound: "ไม่พบโจทย์นี้",
    problem: "ปัญหา",
    challenge: "โจทย์",
    impact: "ผลกระทบในชีวิตจริง",
    research: "ข้อมูลวิจัยและสถิติ",
    deepResearch: "แฟ้มวิจัยเชิงลึกจาก AI",
    affectedPopulations: "กลุ่มผู้ได้รับผลกระทบ",
    stakeholderMap: "แผนที่ผู้มีส่วนได้ส่วนเสีย",
    primaryStakeholders: "ผู้มีส่วนได้ส่วนเสียหลัก",
    secondaryStakeholders: "ผู้มีส่วนได้ส่วนเสียรอง",
    rootCauses: "รากของปัญหา",
    existingSolutions: "แนวทางที่มีอยู่แล้ว",
    opportunityAreas: "พื้นที่แห่งโอกาส",
    keyInsights: "ข้อสังเกตสำคัญ",
    resources: "แหล่งอ้างอิงและทรัพยากร",
    severity: "ความรุนแรง",
    difficulty: "ความยาก",
    feasibility: "ความเป็นไปได้",
    impactLabel: "ผลกระทบ",
    urgency: "ความเร่งด่วน",
    size: "ขนาดของกลุ่ม",
    needs: "ความต้องการ",
    painPoints: "ความเจ็บปวด",
    influence: "อิทธิพล",
    interest: "ระดับความสนใจ",
    strengths: "จุดแข็ง",
    weaknesses: "จุดอ่อน",
    ready: "พร้อมลงมือแก้โจทย์นี้หรือยัง?",
    cta: "เข้าร่วมแฮกกาธอนและสร้างทางออกที่อาจเปลี่ยนชีวิตผู้คนได้นับล้าน",
    register: "สมัครเลย",
    viewAll: "ดูโจทย์ทั้งหมด",
    track: "แทร็ก",
  },
} as const;

function GradingBar({
  label,
  score,
  icon: Icon,
  color,
}: {
  label: string;
  score: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className="text-lg font-medium" style={{ color }}>
          {score}/10
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score * 10}%`,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

function ExpandableSection({
  title,
  icon: Icon,
  color,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-2xl border transition-all duration-300"
      style={{
        borderColor: isOpen ? `${color}40` : "rgba(255,255,255,0.06)",
        background: isOpen ? `${color}06` : "rgba(13,18,25,0.6)",
      }}
    >
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" style={{ color }} />
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" style={{ color: `${color}60` }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: `${color}60` }} />
        )}
      </button>
      {isOpen ? <div className="px-6 pb-6 space-y-4">{children}</div> : null}
    </div>
  );
}

function SourceLinks({ sources, color }: { sources: ProblemBriefSource[]; color: string }) {
  if (!sources.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => (
        <a
          key={`${source.label}-${source.url}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: `${color}35`,
            background: `${color}0d`,
            color,
          }}
        >
          <span>{source.label}</span>
          {source.year ? <span className="opacity-70">· {source.year}</span> : null}
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      className="flex items-center rounded-full border border-white/10 overflow-hidden text-xs font-mono"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {(["en", "th"] as Lang[]).map((entry) => (
        <button
          key={entry}
          onClick={() => onChange(entry)}
          className="px-3 py-1.5 transition-all duration-200"
          style={{
            background: lang === entry ? "rgba(145,196,227,0.15)" : "transparent",
            color: lang === entry ? "#91C4E3" : "rgba(255,255,255,0.3)",
            fontWeight: lang === entry ? 600 : 400,
          }}
        >
          {entry.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function ProblemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = params?.problemId as string;
  const [problem, setProblem] = useState<ProblemBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    let cancelled = false;

    if (problemId) {
      fetch(`/data/hackathon/problems/${problemId.toLowerCase()}.json`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setProblem(parseProblemBrief(data));
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  const copy = COPY[lang];
  const textFontClass =
    lang === "th"
      ? "font-[family-name:var(--font-bai-jamjuree)]"
      : "font-[family-name:var(--font-libre-franklin)]";

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}
      >
        <div className={`text-white/50 ${textFontClass}`}>{copy.loading}</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}
      >
        <div className="text-center">
          <h1 className={`text-2xl text-white mb-4 ${textFontClass}`}>{copy.notFound}</h1>
          <button onClick={() => router.push("/hackathon/challenge")} className="text-[#91C4E3] hover:underline">
            {copy.back}
          </button>
        </div>
      </div>
    );
  }

  const trackInfo = TRACK_INFO[problem.trackNum] || TRACK_INFO["01"];

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}
    >
      <div className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ background: "rgba(1,1,8,0.8)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/hackathon/challenge")}
            className="flex items-center gap-2 text-sm transition-all duration-200 hover:gap-3 shrink-0"
            style={{ color: "#65ABFC", textShadow: "0 0 12px rgba(101,171,252,0.4)" }}
          >
            {copy.back}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600 font-mono tracking-widest hidden md:block">
              {problem.problemId} · {lang === "th" ? trackInfo.subtitle : trackInfo.title}
            </span>
            <LangToggle lang={lang} onChange={setLang} />
          </div>
        </div>
      </div>

      <section className="pt-24 pb-16 relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={`/images/hackathon_${problem.problemId.toLowerCase()}_thumb.png`}
            alt="Atmospheric Problem Cover"
            className="absolute top-0 right-0 w-full md:w-[60%] h-full object-cover opacity-15 mix-blend-screen"
            style={{ maskImage: "linear-gradient(to right, transparent, black 40%, black 80%, transparent)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#010210]" />
        </div>

        <div className="container mx-auto px-4 max-w-5xl relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{trackInfo.icon}</span>
            <div>
              <p className="text-sm font-mono" style={{ color: problem.color }}>
                {copy.track} {problem.trackNum}
              </p>
              <p className={`text-xs text-gray-500 ${textFontClass}`}>
                {lang === "th" ? trackInfo.subtitle : trackInfo.title}
              </p>
            </div>
          </div>

          <h1 className={`text-4xl md:text-5xl font-medium mb-6 leading-tight ${textFontClass}`} style={{ color: problem.color }}>
            {getLocalizedText(problem.title, lang)}
          </h1>

          <div className="rounded-xl p-6 border-l-2 mb-8" style={{ borderColor: problem.color, background: `${problem.color}08` }}>
            <p className={`text-xs text-gray-500 uppercase tracking-widest mb-2 ${textFontClass}`}>{copy.problem}</p>
            <p className={`text-lg text-gray-200 leading-relaxed ${textFontClass}`}>{getLocalizedText(problem.hook, lang)}</p>
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-bai-jamjuree)]" style={{ color: `${problem.color}70` }}>
              {copy.challenge}
            </p>
            <p className={`text-xl text-white/80 leading-relaxed font-light ${textFontClass}`}>
              {getLocalizedText(problem.challenge, lang)}
            </p>
          </div>

          {problem.tangibleEquivalent ? (
            <div
              className="mb-12 rounded-2xl p-6 md:p-8 border border-white/10 relative overflow-hidden group shadow-2xl"
              style={{ background: "rgba(13,18,25,0.7)", boxShadow: `0 10px 40px -10px ${problem.color}20` }}
            >
              <div
                className="absolute inset-0 transition-opacity duration-1000 opacity-0 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at top right, ${problem.color}15 0%, transparent 60%)` }}
              />
              <div className="relative z-10 flex items-start gap-5">
                <div className="p-3 rounded-full shrink-0" style={{ background: `${problem.color}15` }}>
                  <Zap className="w-6 h-6" style={{ color: problem.color }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-bai-jamjuree)]" style={{ color: `${problem.color}80` }}>
                    {copy.impact}
                  </p>
                  <p className={`text-xl md:text-2xl font-medium text-white leading-relaxed drop-shadow-md ${textFontClass}`}>
                    "{getLocalizedText(problem.tangibleEquivalent, lang)}"
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 mb-12">
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: `${problem.color}18`,
                  border: `1px solid ${problem.color}40`,
                  color: problem.color,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl border border-white/5" style={{ background: "rgba(13,18,25,0.7)" }}>
            <GradingBar label={copy.severity} score={problem.grading.severity.score} icon={AlertTriangle} color={problem.color} />
            <GradingBar label={copy.difficulty} score={problem.grading.difficulty.score} icon={Target} color={problem.color} />
            <GradingBar label={copy.impactLabel} score={problem.grading.impact.score} icon={Heart} color={problem.color} />
            <GradingBar label={copy.urgency} score={problem.grading.urgency.score} icon={Clock} color={problem.color} />
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <ExpandableSection title={copy.research} icon={BarChart3} color={problem.color} defaultOpen>
            <div className="grid md:grid-cols-2 gap-4">
              {problem.statistics.map((stat, index) => (
                <div
                  key={`${stat.stat.en}-${index}`}
                  className="rounded-xl p-4 border-l-2 space-y-3"
                  style={{ borderColor: problem.color, background: `${problem.color}08` }}
                >
                  <p className={`text-sm text-gray-300 leading-relaxed ${textFontClass}`}>
                    {getLocalizedText(stat.stat, lang)}
                  </p>
                  <SourceLinks sources={stat.sources} color={problem.color} />
                  {stat.year ? <p className="text-xs text-gray-500">{stat.year}</p> : null}
                </div>
              ))}
            </div>
          </ExpandableSection>

          {problem.deepResearch?.length ? (
            <ExpandableSection title={copy.deepResearch} icon={Lightbulb} color={problem.color} defaultOpen>
              <div className="space-y-4">
                {problem.deepResearch.map((section, index) => (
                  <div
                    key={`${section.title.en}-${index}`}
                    className="rounded-2xl border border-white/6 p-5 space-y-4"
                    style={{ background: "rgba(13,18,25,0.55)" }}
                  >
                    <div className="space-y-2">
                      <h4 className={`text-lg text-white font-medium ${textFontClass}`}>
                        {getLocalizedText(section.title, lang)}
                      </h4>
                      <p className={`text-sm text-gray-300 leading-relaxed ${textFontClass}`}>
                        {getLocalizedText(section.summary, lang)}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {section.evidence.map((item, itemIndex) => (
                        <div
                          key={`${item.claim.en}-${itemIndex}`}
                          className="rounded-xl border border-white/5 p-4 space-y-3"
                          style={{ background: `${problem.color}08` }}
                        >
                          <p className={`text-sm text-white/85 leading-relaxed ${textFontClass}`}>
                            {getLocalizedText(item.claim, lang)}
                          </p>
                          <SourceLinks sources={item.sources} color={problem.color} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          ) : null}

          <ExpandableSection title={copy.affectedPopulations} icon={Users} color={problem.color}>
            <div className="grid md:grid-cols-2 gap-4">
              {problem.affectedPopulations.map((population, index) => (
                <div key={`${population.group.en}-${index}`} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <h4 className={`font-medium text-white mb-1 ${textFontClass}`}>{getLocalizedText(population.group, lang)}</h4>
                  <p className={`text-sm text-gray-500 mb-3 ${textFontClass}`}>
                    {copy.size}: {getLocalizedText(population.size, lang)}
                  </p>
                  <ul className="space-y-1">
                    {population.painPoints.map((point, pointIndex) => (
                      <li key={`${point.en}-${pointIndex}`} className={`text-sm text-gray-400 ${textFontClass}`}>
                        • {getLocalizedText(point, lang)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title={copy.stakeholderMap} icon={Users} color={problem.color}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className={`text-sm uppercase tracking-wider text-gray-500 mb-3 ${textFontClass}`}>{copy.primaryStakeholders}</h4>
                <div className="space-y-3">
                  {problem.stakeholderMap.primary.map((stakeholder, index) => (
                    <div key={`${stakeholder.role.en}-${index}`} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                      <h5 className={`font-medium text-white mb-2 ${textFontClass}`}>{getLocalizedText(stakeholder.role, lang)}</h5>
                      {stakeholder.needs.length ? (
                        <div className="mb-2">
                          <p className={`text-xs text-gray-500 mb-1 ${textFontClass}`}>{copy.needs}</p>
                          <ul className="text-xs text-gray-400 space-y-0.5">
                            {stakeholder.needs.map((need, needIndex) => (
                              <li key={`${need.en}-${needIndex}`} className={textFontClass}>
                                • {getLocalizedText(need, lang)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {stakeholder.painPoints.length ? (
                        <div>
                          <p className={`text-xs text-gray-500 mb-1 ${textFontClass}`}>{copy.painPoints}</p>
                          <ul className="text-xs text-gray-400 space-y-0.5">
                            {stakeholder.painPoints.map((pain, painIndex) => (
                              <li key={`${pain.en}-${painIndex}`} className={textFontClass}>
                                • {getLocalizedText(pain, lang)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {stakeholder.influence ? (
                        <p className={`text-xs text-gray-500 mt-3 ${textFontClass}`}>
                          {copy.influence}: <span className="text-gray-300">{getLocalizedText(stakeholder.influence, lang)}</span>
                        </p>
                      ) : null}
                      {stakeholder.interest ? (
                        <p className={`text-xs text-gray-500 mt-1 ${textFontClass}`}>
                          {copy.interest}: <span className="text-gray-300">{getLocalizedText(stakeholder.interest, lang)}</span>
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`text-sm uppercase tracking-wider text-gray-500 mb-3 ${textFontClass}`}>{copy.secondaryStakeholders}</h4>
                <div className="space-y-3">
                  {problem.stakeholderMap.secondary.map((stakeholder, index) => (
                    <div key={`${stakeholder.role.en}-${index}`} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                      <h5 className={`font-medium text-white mb-2 ${textFontClass}`}>{getLocalizedText(stakeholder.role, lang)}</h5>
                      {stakeholder.needs.length ? (
                        <div className="mb-2">
                          <p className={`text-xs text-gray-500 mb-1 ${textFontClass}`}>{copy.needs}</p>
                          <ul className="text-xs text-gray-400 space-y-0.5">
                            {stakeholder.needs.map((need, needIndex) => (
                              <li key={`${need.en}-${needIndex}`} className={textFontClass}>
                                • {getLocalizedText(need, lang)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {stakeholder.painPoints.length ? (
                        <div>
                          <p className={`text-xs text-gray-500 mb-1 ${textFontClass}`}>{copy.painPoints}</p>
                          <ul className="text-xs text-gray-400 space-y-0.5">
                            {stakeholder.painPoints.map((pain, painIndex) => (
                              <li key={`${pain.en}-${painIndex}`} className={textFontClass}>
                                • {getLocalizedText(pain, lang)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {stakeholder.influence ? (
                        <p className={`text-xs text-gray-500 mt-3 ${textFontClass}`}>
                          {copy.influence}: <span className="text-gray-300">{getLocalizedText(stakeholder.influence, lang)}</span>
                        </p>
                      ) : null}
                      {stakeholder.interest ? (
                        <p className={`text-xs text-gray-500 mt-1 ${textFontClass}`}>
                          {copy.interest}: <span className="text-gray-300">{getLocalizedText(stakeholder.interest, lang)}</span>
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title={copy.rootCauses} icon={AlertTriangle} color={problem.color}>
            <div className="space-y-3">
              {problem.rootCauses.map((cause, index) => (
                <div key={`${cause.cause.en}-${index}`} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className={`font-medium text-white ${textFontClass}`}>{getLocalizedText(cause.cause, lang)}</h4>
                    {cause.systemic ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Systemic
                      </span>
                    ) : null}
                  </div>
                  <p className={`text-sm text-gray-400 ${textFontClass}`}>{getLocalizedText(cause.explanation, lang)}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title={copy.existingSolutions} icon={Target} color={problem.color}>
            <div className="grid md:grid-cols-2 gap-4">
              {problem.existingSolutions.map((solution, index) => (
                <div key={`${solution.name.en}-${index}`} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className={`font-medium text-white ${textFontClass}`}>{getLocalizedText(solution.name, lang)}</h4>
                    <span className={`text-xs text-gray-500 ${textFontClass}`}>{getLocalizedText(solution.region, lang)}</span>
                  </div>
                  <p className={`text-sm text-gray-400 mb-3 ${textFontClass}`}>{getLocalizedText(solution.approach, lang)}</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className={`text-xs text-green-400 mb-1 ${textFontClass}`}>{copy.strengths}</p>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {solution.strengths.map((strength, strengthIndex) => (
                          <li key={`${strength.en}-${strengthIndex}`} className={textFontClass}>
                            + {getLocalizedText(strength, lang)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className={`text-xs text-red-400 mb-1 ${textFontClass}`}>{copy.weaknesses}</p>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {solution.weaknesses.map((weakness, weaknessIndex) => (
                          <li key={`${weakness.en}-${weaknessIndex}`} className={textFontClass}>
                            - {getLocalizedText(weakness, lang)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title={copy.opportunityAreas} icon={Zap} color={problem.color} defaultOpen>
            <div className="grid md:grid-cols-2 gap-4">
              {problem.opportunityAreas.map((opportunity, index) => (
                <div key={`${opportunity.area.en}-${index}`} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <h4 className={`font-medium text-white mb-2 ${textFontClass}`}>{getLocalizedText(opportunity.area, lang)}</h4>
                  <p className={`text-sm text-gray-400 mb-3 ${textFontClass}`}>{getLocalizedText(opportunity.description, lang)}</p>
                  {opportunity.potentialImpact ? (
                    <p className={`text-xs text-gray-500 mb-3 ${textFontClass}`}>
                      {copy.impactLabel}: <span className="text-gray-300">{getLocalizedText(opportunity.potentialImpact, lang)}</span>
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${textFontClass}`} style={{ background: `${problem.color}18`, color: problem.color }}>
                      {copy.feasibility}: {getLocalizedText(opportunity.feasibility, lang)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title={copy.keyInsights} icon={Lightbulb} color={problem.color}>
            <div className="space-y-3">
              {problem.keyInsights.map((insight, index) => (
                <div key={`${insight.en}-${index}`} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `${problem.color}06` }}>
                  <span className="text-lg" style={{ color: problem.color }}>
                    💡
                  </span>
                  <p className={`text-sm text-gray-300 ${textFontClass}`}>{getLocalizedText(insight, lang)}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>

          <ExpandableSection title={copy.resources} icon={ExternalLink} color={problem.color}>
            <div className="grid md:grid-cols-2 gap-3">
              {problem.resources.map((resource, index) => (
                <a
                  key={`${resource.title}-${index}`}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                  style={{ background: "rgba(13,18,25,0.5)" }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className={`font-medium text-white group-hover:text-[#91C4E3] transition-colors text-sm ${textFontClass}`}>
                      {resource.title}
                    </h4>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#91C4E3] transition-colors" />
                  </div>
                  <p className={`text-xs text-gray-500 mb-1 ${textFontClass}`}>{resource.type}</p>
                  <p className={`text-xs text-gray-600 ${textFontClass}`}>{resource.description}</p>
                </a>
              ))}
            </div>
          </ExpandableSection>
        </div>
      </section>

      <section className="py-16 border-t border-white/5">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className={`text-2xl font-medium mb-4 ${textFontClass}`} style={{ color: problem.color }}>
            {copy.ready}
          </h2>
          <p className={`text-gray-400 mb-8 ${textFontClass}`}>{copy.cta}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/hackathon/register")}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${textFontClass}`}
              style={{
                background: `linear-gradient(135deg, ${problem.color}20, ${problem.color}40)`,
                border: `1px solid ${problem.color}55`,
                color: problem.color,
                boxShadow: `0 0 30px ${problem.color}20`,
              }}
            >
              {copy.register}
            </button>
            <button
              onClick={() => router.push("/hackathon/challenge")}
              className={`px-8 py-3 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 border border-white/10 hover:border-white/20 ${textFontClass}`}
            >
              {copy.viewAll}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
