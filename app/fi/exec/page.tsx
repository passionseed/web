import { createAdminClient } from "@/utils/supabase/admin";
import Link from "next/link";
import {
  Users,
  Target,
  Zap,
  TrendingUp,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Calendar,
  Building2,
  Lightbulb,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ============================================================================
// DATA FETCHING
// ============================================================================

const BETA_FORM_TOKEN = "2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11";

async function fetchHackathonData() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hackathon_participants")
    .select(`
      id, name, email, university, role, referral_source, created_at,
      hackathon_team_members!hackathon_team_members_participant_id_fkey(
        hackathon_teams(id, name)
      )
    `)
    .order("created_at", { ascending: true });

  if (error) return { participants: [], withTeam: 0, teamRate: "0" };

  const participants = (data || []).map((p: any) => {
    const membership = Array.isArray(p.hackathon_team_members)
      ? p.hackathon_team_members[0]
      : p.hackathon_team_members;
    const teamData = membership?.hackathon_teams;
    return {
      id: p.id,
      name: p.name,
      team: teamData ? { name: teamData.name } : null,
      referral_source: p.referral_source,
    };
  });

  const withTeam = participants.filter((p) => p.team !== null).length;
  const teamRate = participants.length > 0
    ? ((withTeam / participants.length) * 100).toFixed(1)
    : "0";

  return { participants, withTeam, teamRate };
}

async function fetchBetaData() {
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("ps_feedback_forms")
    .select("id")
    .eq("token", BETA_FORM_TOKEN)
    .single();

  if (!form) return { count: 0 };

  const { count, error } = await admin
    .from("ps_submissions")
    .select("*", { count: "exact", head: true })
    .eq("form_id", form.id);

  return { count: count || 0 };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatBox({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Icon className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function SprintBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    current: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    overdue: "bg-red-500/15 text-red-400 border-red-500/30",
    upcoming: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default async function FIExecPage() {
  const [hackathonData, betaData] = await Promise.all([
    fetchHackathonData(),
    fetchBetaData(),
  ]);

  const { participants, withTeam, teamRate } = hackathonData;
  const totalActions = participants.length + betaData.count;

  // Sprint data from docs/fi/
  const sprints = [
    { name: "Onboarding", status: "completed" },
    { name: "Accelerator Kickoff", status: "completed" },
    { name: "Vision & Mission", status: "completed" },
    { name: "Customer Development", status: "completed" },
    { name: "Revenue & Business Models", status: "completed" },
    { name: "Pitch Mastery", status: "completed" },
    { name: "Mentor Idea Review", status: "completed" },
    { name: "Legal & Equity", status: "overdue" },
    { name: "Go-to-Market", status: "current" },
    { name: "Product Development", status: "in_progress" },
    { name: "Investor Progress", status: "upcoming" },
    { name: "Co-Founders & Team", status: "upcoming" },
    { name: "Growth", status: "upcoming" },
    { name: "Funding", status: "upcoming" },
    { name: "Graduation", status: "upcoming" },
  ];

  const completedSprints = sprints.filter((s) => s.status === "completed").length;
  const sprintProgress = Math.round((completedSprints / sprints.length) * 100);

  return (
    <main className="min-h-screen bg-[#06000f] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, #06000f 0%, #1a0336 40%, #3b0764 70%, #2a0818 100%)",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-amber-500/5 to-transparent" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PassionSeed</h1>
                <p className="text-xs text-slate-500">Founder Institute — Chula UIH 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              SF → Bangkok
            </div>
          </div>

          {/* One-liner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-200 leading-relaxed">
              AI-powered career discovery platform helping SEA students test-drive their future
              through interactive quests built from expert interviews.
            </p>
          </div>

          {/* Sprint Progress */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Program Progress</span>
              <span className="text-slate-300">{completedSprints}/{sprints.length} sprints ({sprintProgress}%)</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                style={{ width: `${sprintProgress}%` }}
              />
            </div>
          </div>
        </header>

        {/* Traction — Real Data */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Traction
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="Hackathon Sign-ups"
              value={participants.length}
              sub={`${teamRate}% formed teams`}
              icon={Users}
            />
            <StatBox
              label="Beta Registrations"
              value={betaData.count}
              sub="Concierge MVP"
              icon={Target}
            />
            <StatBox
              label="Total Actions"
              value={totalActions}
              sub="Sprint target: 100"
              icon={Zap}
            />
            <StatBox
              label="Cost per Sign-up"
              value="฿11"
              sub="Beta campaign"
              icon={TrendingUp}
            />
          </div>
        </section>

        {/* Market & Moat */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Market & Moat
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2">Market Size</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">SAM</span>
                  <span className="text-white font-semibold">$400M+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">SOM (3yr)</span>
                  <span className="text-white font-semibold">$50M</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-slate-500 mb-2">Target Markets</p>
                <div className="flex flex-wrap gap-1.5">
                  {["🇹🇭 Thailand", "🇻🇳 Vietnam", "🇮🇩 Indonesia", "🇵🇭 Philippines", "🇲🇾 Malaysia"].map((m) => (
                    <span key={m} className="text-xs text-slate-300 bg-white/5 px-2 py-0.5 rounded">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2">Competitive Moat</p>
              <p className="text-sm text-white font-medium mb-2">Expert Interview AI Bot</p>
              <p className="text-xs text-slate-400 mb-3">
                Converts expert surveys into interactive learning modules at scale.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Proprietary AI content pipeline",
                  "Network effects: experts → modules → students",
                  "Data flywheel improves recommendations",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Sprint Status */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Sprint Status
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {sprints.map((sprint, i) => (
              <SprintBadge key={i} status={sprint.status} />
            ))}
          </div>
        </section>

        {/* Key Learnings */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Key Learnings
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-emerald-400 text-xs uppercase tracking-wider mb-2">What Worked</p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>• Live event (hackathon) drove 3.5× more commitment than static waitlist</li>
                <li>• Instagram + peer referral outperformed email significantly</li>
                <li>• Team formation = natural commitment filter (66% rate)</li>
                <li>• ฿11/sign-up validates paid social as efficient channel</li>
              </ul>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
              <p className="text-rose-400 text-xs uppercase tracking-wider mb-2">To Fix</p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>• Email deliverability — landed in promo folder (20% open, 2% CTR)</li>
                <li>• Beta referral gate has 36% abandonment — lower friction</li>
                <li>• Revenue model needs validation — pick ONE and test pricing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Next Steps
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { week: "Now", title: "Build AI Quest Generator MVP", items: ["Expert interview bot", "5 test quests", "10 student completions"] },
              { week: "Week 3-4", title: "Validate Revenue Model", items: ["Pricing survey 50+ parents", "Test 3 price points", "Calculate real CAC"] },
              { week: "Week 5-6", title: "Vietnam Expansion", items: ["Localize content", "Partner 2-3 schools", "100 student pilot"] },
              { week: "Week 7-8", title: "Fundraising Prep", items: ["Update pitch deck", "Financial model", "20+ investor pipeline"] },
            ].map((step, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {step.week}
                  </span>
                  <span className="text-sm font-medium text-white">{step.title}</span>
                </div>
                <ul className="space-y-1">
                  {step.items.map((item, j) => (
                    <li key={j} className="text-xs text-slate-400 flex items-center gap-1.5">
                      <ArrowRight className="w-2.5 h-2.5 text-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/hackathon", label: "Hackathon" },
              { href: "/app/beta", label: "Beta Test" },
              { href: "/epic-sprint", label: "Epic Sprint Report" },
              { href: "https://passionseed.org", label: "Landing Page" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {item.label}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-slate-600">
            Last Updated: March 2026 · Founder Institute Chula UIH 2026
          </p>
        </footer>
      </div>
    </main>
  );
}