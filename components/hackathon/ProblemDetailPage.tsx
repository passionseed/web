"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Users, 
  Target, 
  Lightbulb, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Heart,
  Zap,
  Clock
} from "lucide-react";

type ProblemData = {
  problemId: string;
  title: { en: string; th: string };
  track: string;
  trackNum: string;
  color: string;
  hook: { en: string; th: string };
  challenge: { en: string; th: string };
  tangibleEquivalent?: { en: string; th: string };
  tags: string[];
  grading: {
    severity: { score: number; justification: string };
    difficulty: { score: number; justification: string };
    impact: { score: number; justification: string };
    urgency: { score: number; justification: string };
  };
  statistics: Array<{ stat: string; source: string; year: string }>;
  affectedPopulations: Array<{ group: string; size: string; painPoints: string[] }>;
  stakeholderMap: {
    primary: Array<{ role: string; needs?: string[]; painPoints?: string[] }>;
    secondary: Array<{ role: string; needs?: string[]; painPoints?: string[] }>;
  };
  rootCauses: Array<{ cause: string; explanation: string; systemic: boolean }>;
  existingSolutions: Array<{ 
    name: string; 
    approach: string; 
    strengths: string[]; 
    weaknesses: string[]; 
    region: string 
  }>;
  opportunityAreas: Array<{ 
    area: string; 
    description: string; 
    potentialImpact: string; 
    feasibility: string 
  }>;
  resources: Array<{ title: string; type: string; url: string; description: string }>;
  keyInsights: string[];
};

const TRACK_INFO: Record<string, { title: string; subtitle: string; icon: string }> = {
  "01": { 
    title: "Traditional & Integrative Healthcare", 
    subtitle: "แพทย์แผนไทยและการแพทย์เชิงป้องกัน",
    icon: "🏥"
  },
  "02": { 
    title: "Mental Health", 
    subtitle: "สุขภาพจิตและความเป็นอยู่ที่ดี",
    icon: "🧠"
  },
  "03": { 
    title: "Community, Public & Environmental Health", 
    subtitle: "สุขภาพชุมชนและสิ่งแวดล้อม",
    icon: "🌍"
  },
};

function GradingBar({ label, score, icon: Icon, color }: { 
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
        <span className="text-lg font-bold" style={{ color }}>{score}/10</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div 
          className="h-full rounded-full transition-all duration-700"
          style={{ 
            width: `${score * 10}%`, 
            background: `linear-gradient(90deg, ${color}60, ${color})`,
            boxShadow: `0 0 8px ${color}40`
          }}
        />
      </div>
    </div>
  );
}

function StatCard({ stat, source, year, color }: { stat: string; source: string; year: string; color: string }) {
  return (
    <div 
      className="rounded-xl p-4 border-l-2"
      style={{ borderColor: color, background: `${color}08` }}
    >
      <p className="text-sm text-gray-300 leading-relaxed mb-2">{stat}</p>
      <p className="text-xs text-gray-500">
        {source} ({year})
      </p>
    </div>
  );
}

function ExpandableSection({ 
  title, 
  icon: Icon, 
  color, 
  children,
  defaultOpen = false 
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
        background: isOpen ? `${color}06` : "rgba(13,18,25,0.6)"
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" style={{ color }} />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" style={{ color: `${color}60` }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: `${color}60` }} />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

type Lang = "en" | "th";

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      className="flex items-center rounded-full border border-white/10 overflow-hidden text-xs font-mono"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {(["en", "th"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className="px-3 py-1.5 transition-all duration-200"
          style={{
            background: lang === l ? "rgba(145,196,227,0.15)" : "transparent",
            color: lang === l ? "#91C4E3" : "rgba(255,255,255,0.3)",
            fontWeight: lang === l ? 600 : 400,
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function ProblemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = params?.problemId as string;
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (problemId) {
      fetch(`/data/hackathon/problems/${problemId.toLowerCase()}.json`)
        .then(res => res.json())
        .then(data => {
          setProblem(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [problemId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}>
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 50%, #010D18 100%)" }}>
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Problem not found</h1>
          <button 
            onClick={() => router.push("/hackathon/challenge")}
            className="text-[#91C4E3] hover:underline"
          >
            ← Back to Challenge Brief
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
      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ background: "rgba(1,1,8,0.8)" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/hackathon/challenge")}
            className="flex items-center gap-2 text-sm transition-all duration-200 hover:gap-3 shrink-0"
            style={{ color: "#65ABFC", textShadow: "0 0 12px rgba(101,171,252,0.4)" }}
          >
            ← Back to Challenge Brief
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600 font-mono tracking-widest hidden md:block">
              {problem.problemId} · {trackInfo.title}
            </span>
            <LangToggle lang={lang} onChange={setLang} />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-24 pb-16 relative border-b border-white/5 overflow-hidden">
        {/* Abstract Cover Background */}
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
          {/* Track Badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{trackInfo.icon}</span>
            <div>
              <p className="text-sm font-mono" style={{ color: problem.color }}>
                Track {problem.trackNum}
              </p>
              <p className="text-xs text-gray-500">{trackInfo.subtitle}</p>
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ color: problem.color }}
          >
            {problem.title[lang]}
          </h1>

          {/* Hook */}
          <div 
            className="rounded-xl p-6 border-l-2 mb-8"
            style={{ borderColor: problem.color, background: `${problem.color}08` }}
          >
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">The Problem</p>
            <p className="text-lg text-gray-200 leading-relaxed">{problem.hook[lang]}</p>
          </div>

          {/* Challenge */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-bai-jamjuree)]" style={{ color: `${problem.color}70` }}>
              The Challenge
            </p>
            <p className="text-xl text-white/80 leading-relaxed font-light font-[family-name:var(--font-bai-jamjuree)]">
              {problem.challenge[lang]}
            </p>
          </div>

          {/* Tangible Equivalent */}
          {problem.tangibleEquivalent && (
            <div className="mb-12 rounded-2xl p-6 md:p-8 border border-white/10 relative overflow-hidden group shadow-2xl" style={{ background: "rgba(13,18,25,0.7)", boxShadow: `0 10px 40px -10px ${problem.color}20` }}>
              <div className="absolute inset-0 transition-opacity duration-1000 opacity-0 group-hover:opacity-100" style={{ background: `radial-gradient(circle at top right, ${problem.color}15 0%, transparent 60%)` }} />
              <div className="relative z-10 flex items-start gap-5">
                <div className="p-3 rounded-full shrink-0" style={{ background: `${problem.color}15` }}>
                  <Zap className="w-6 h-6" style={{ color: problem.color }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-bai-jamjuree)]" style={{ color: `${problem.color}80` }}>
                    Real-World Impact
                  </p>
                  <p className="text-xl md:text-2xl font-semibold text-white leading-relaxed font-[family-name:var(--font-bai-jamjuree)] drop-shadow-md">
                    "{problem.tangibleEquivalent[lang]}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-12">
            {problem.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: `${problem.color}18`,
                  border: `1px solid ${problem.color}40`,
                  color: problem.color
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Grading */}
          <div className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl border border-white/5" style={{ background: "rgba(13,18,25,0.7)" }}>
            <GradingBar label="Severity" score={problem.grading.severity.score} icon={AlertTriangle} color={problem.color} />
            <GradingBar label="Difficulty" score={problem.grading.difficulty.score} icon={Target} color={problem.color} />
            <GradingBar label="Impact" score={problem.grading.impact.score} icon={Heart} color={problem.color} />
            <GradingBar label="Urgency" score={problem.grading.urgency.score} icon={Clock} color={problem.color} />
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          {/* Statistics */}
          <ExpandableSection title="Research & Statistics" icon={BarChart3} color={problem.color} defaultOpen>
            <div className="grid md:grid-cols-2 gap-4">
              {problem.statistics.map((stat, i) => (
                <StatCard key={i} {...stat} color={problem.color} />
              ))}
            </div>
          </ExpandableSection>

          {/* Affected Populations */}
          <ExpandableSection title="Affected Populations" icon={Users} color={problem.color}>
            <div className="space-y-4">
              {problem.affectedPopulations.map((pop, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white">{pop.group}</h4>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${problem.color}18`, color: problem.color }}>
                      {pop.size}
                    </span>
                  </div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {pop.painPoints.map((pp, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span style={{ color: problem.color }}>•</span>
                        {pp}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Root Causes */}
          <ExpandableSection title="Root Causes" icon={Target} color={problem.color}>
            <div className="space-y-3">
              {problem.rootCauses.map((cause, i) => (
                <div key={i} className="p-4 rounded-xl border-l-2" style={{ borderColor: cause.systemic ? problem.color : `${problem.color}40`, background: `${problem.color}06` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-white">{cause.cause}</h4>
                    {cause.systemic && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        Systemic
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{cause.explanation}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Existing Solutions */}
          <ExpandableSection title="Existing Solutions" icon={Lightbulb} color={problem.color}>
            <div className="space-y-4">
              {problem.existingSolutions.map((sol, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white">{sol.name}</h4>
                    <span className="text-xs text-gray-500">{sol.region}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{sol.approach}</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-green-400 mb-1">Strengths</p>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {sol.strengths.map((s, j) => <li key={j}>+ {s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-red-400 mb-1">Weaknesses</p>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {sol.weaknesses.map((w, j) => <li key={j}>- {w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Opportunity Areas */}
          <ExpandableSection title="Opportunity Areas" icon={Zap} color={problem.color} defaultOpen>
            <div className="grid md:grid-cols-2 gap-4">
              {problem.opportunityAreas.map((opp, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/5" style={{ background: "rgba(13,18,25,0.5)" }}>
                  <h4 className="font-semibold text-white mb-2">{opp.area}</h4>
                  <p className="text-sm text-gray-400 mb-3">{opp.description}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full" style={{ background: `${problem.color}18`, color: problem.color }}>
                      Feasibility: {opp.feasibility}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Key Insights */}
          <ExpandableSection title="Key Insights" icon={Lightbulb} color={problem.color}>
            <div className="space-y-3">
              {problem.keyInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `${problem.color}06` }}>
                  <span className="text-lg" style={{ color: problem.color }}>💡</span>
                  <p className="text-sm text-gray-300">{insight}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Resources */}
          <ExpandableSection title="Resources & References" icon={ExternalLink} color={problem.color}>
            <div className="grid md:grid-cols-2 gap-3">
              {problem.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                  style={{ background: "rgba(13,18,25,0.5)" }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-white group-hover:text-[#91C4E3] transition-colors text-sm">
                      {res.title}
                    </h4>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#91C4E3] transition-colors" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{res.type}</p>
                  <p className="text-xs text-gray-600">{res.description}</p>
                </a>
              ))}
            </div>
          </ExpandableSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/5">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-4" style={{ color: problem.color }}>
            Ready to solve this problem?
          </h2>
          <p className="text-gray-400 mb-8">
            Join the hackathon and build a solution that could change millions of lives.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/hackathon/register")}
              className="px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${problem.color}20, ${problem.color}40)`,
                border: `1px solid ${problem.color}55`,
                color: problem.color,
                boxShadow: `0 0 30px ${problem.color}20`
              }}
            >
              Register Now
            </button>
            <button
              onClick={() => router.push("/hackathon/challenge")}
              className="px-8 py-3 rounded-full text-sm font-semibold text-gray-400 hover:text-white transition-all duration-300 border border-white/10 hover:border-white/20"
            >
              View All Problems
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}