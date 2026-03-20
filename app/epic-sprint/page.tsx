import { createAdminClient } from "@/utils/supabase/admin";
import { ParticipantTable, BetaTable } from "./ParticipantTable";

export const dynamic = "force-dynamic";

const BETA_FORM_TOKEN = "2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11";

async function fetchHackathonParticipants() {
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

  if (error) {
    console.error("Error fetching hackathon participants:", error);
    return [];
  }

  return (data || []).map((p: any) => {
    const membership = Array.isArray(p.hackathon_team_members)
      ? p.hackathon_team_members[0]
      : p.hackathon_team_members;
    const teamData = membership?.hackathon_teams;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      university: p.university,
      role: p.role,
      referral_source: p.referral_source,
      team: teamData ? { name: teamData.name } : null,
      created_at: p.created_at,
    };
  });
}

async function fetchBetaRegistrations() {
  const admin = createAdminClient();

  const { data: form } = await admin
    .from("ps_feedback_forms")
    .select("id")
    .eq("token", BETA_FORM_TOKEN)
    .single();

  if (!form) return [];

  const { data: submissions, error } = await admin
    .from("ps_submissions")
    .select(`
      id, created_at,
      ps_submission_answers(field_id, answer_text, ps_form_fields(label))
    `)
    .eq("form_id", form.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching beta registrations:", error);
    return [];
  }

  return (submissions || []).map((s: any) => {
    const answers: Record<string, string> = {};
    (s.ps_submission_answers || []).forEach((a: any) => {
      const label = a.ps_form_fields?.label;
      if (label) answers[label] = a.answer_text || "";
    });
    return {
      id: s.id,
      created_at: s.created_at,
      full_name: answers["Full name"] || "",
      nickname: answers["Nickname"] || "",
      email: answers["Email address"] || "",
      phone: answers["Phone number"] || "",
      school: answers["School"] || "",
      grade: answers["Grade"] || "",
      platform: answers["Platform"] || "",
      motivation: answers["What interests you about testing?"] || "",
      faculty_interest: answers["Faculty of Interest"] || "",
      major_interest: answers["Major Interest"] || "",
    };
  });
}

function StatCard({
  label,
  value,
  sub,
  accent = "indigo",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "violet";
}) {
  const colors = {
    indigo: "border-indigo-500/30 bg-indigo-500/10",
    emerald: "border-emerald-500/30 bg-emerald-500/10",
    amber: "border-amber-500/30 bg-amber-500/10",
    rose: "border-rose-500/30 bg-rose-500/10",
    violet: "border-violet-500/30 bg-violet-500/10",
  };
  const textColors = {
    indigo: "text-indigo-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[accent]}`}>
      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColors[accent]}`}>{value}</p>
      {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-white/20 font-mono text-sm">{number}</span>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function KpiRow({
  kpi,
  why,
  target,
  result,
  pass,
}: {
  kpi: string;
  why: string;
  target: string;
  result: string;
  pass: boolean | null;
}) {
  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-3 text-white font-medium">{kpi}</td>
      <td className="px-4 py-3 text-white/50 text-sm">{why}</td>
      <td className="px-4 py-3 text-white/60 text-sm font-mono">{target}</td>
      <td className="px-4 py-3 text-white/80 text-sm font-mono">{result}</td>
      <td className="px-4 py-3">
        {pass === null ? (
          <span className="text-white/20 text-xs">—</span>
        ) : pass ? (
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ✓ Pass
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ✗ Miss
          </span>
        )}
      </td>
    </tr>
  );
}

export default async function EpicSprintPage() {
  const [participants, betaRegistrations] = await Promise.all([
    fetchHackathonParticipants(),
    fetchBetaRegistrations(),
  ]);

  const withTeam = participants.filter((p) => p.team !== null).length;
  const withoutTeam = participants.filter((p) => p.team === null).length;
  const teamRate = participants.length > 0
    ? ((withTeam / participants.length) * 100).toFixed(1)
    : "0";

  const referralCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const src = p.referral_source || "ไม่ระบุ";
    referralCounts[src] = (referralCounts[src] || 0) + 1;
  });
  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(135deg, #06000f 0%, #1a0336 40%, #0f172a 100%)",
      }}
    >
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-2">
                Epic Sprint Report — March 2026
              </p>
              <h1 className="text-3xl font-bold text-white mb-2">
                PassionSeed Customer Engagement Report
              </h1>
              <p className="text-white/50 text-sm max-w-2xl">
                Demonstrating that early-stage interest translates into committed action.
                Two parallel campaigns to validate the core hypothesis: students want
                structured, active career exploration.
              </p>
            </div>
            <a
              href="/Epic_Sprint_Report_PassionSeed.md"
              download
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Full Report
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">

        {/* Executive Summary Stats */}
        <section>
          <SectionHeader number="00" title="Executive Summary" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Hackathon Registrations"
              value={participants.length}
              sub={`${teamRate}% formed teams`}
              accent="indigo"
            />
            <StatCard
              label="Beta Sign-ups"
              value={betaRegistrations.length}
              sub="64.1% completion rate"
              accent="violet"
            />
            <StatCard
              label="Sprint Threshold"
              value="100"
              sub={`${participants.length} achieved — ${((participants.length / 100) * 100).toFixed(0)}% of target`}
              accent="emerald"
            />
            <StatCard
              label="Email Open Rate"
              value="20.39%"
              sub="208 recipients"
              accent="amber"
            />
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <p className="text-emerald-300 font-semibold text-sm mb-1">Sprint Status: Passed</p>
            <p className="text-white/60 text-sm">
              The hackathon produced <strong className="text-white">{participants.length} committed registrations</strong> —{" "}
              {(participants.length / 75).toFixed(1)}× the 75-action minimum and{" "}
              {(participants.length / 100).toFixed(1)}× the 100-action target. The beta sign-up
              campaign added {betaRegistrations.length} additional engaged users through a
              high-friction referral gate.
            </p>
          </div>
        </section>

        {/* Section 1: Why these actions */}
        <section>
          <SectionHeader number="01" title="Choice of Action & MVP" />
          <div className="space-y-6 text-white/65 text-sm leading-relaxed">
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h3 className="text-white font-semibold mb-2">
                Action A — Gated Beta Registration (Concierge MVP)
              </h3>
              <p>
                Students who wanted early access had to complete a multi-step registration form
                and share an invitation post to their own social media. The share requirement
                acted as a commitment filter and a viral distribution mechanism simultaneously.
                Completing both steps demonstrated real intent — not just curiosity.
              </p>
              <p className="mt-3">
                This mirrors the product experience: PassionSeed requires students to{" "}
                <em>do</em> things, not just browse. A student who shares a post before they
                have even tried the product signals intrinsic motivation.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h3 className="text-white font-semibold mb-2">
                Action B — Hackathon Registration (Live MVP)
              </h3>
              <p>
                We built and launched a real hackathon at{" "}
                <code className="text-indigo-300 text-xs bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  /hackathon
                </code>
                , giving students a structured team challenge — the closest analog to
                PassionSeed&apos;s quest-based format we could ship in the sprint window.
              </p>
              <p className="mt-3">
                Registering for a team event and coordinating with peers requires far more
                commitment than a passive sign-up. We selected the hackathon because it:
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-white/50">
                <li>Mirrors the actual product (collaborative, goal-oriented, time-bounded)</li>
                <li>Required students to form or join a team — a social contract</li>
                <li>Generated usable behavioural data: team formation rate, return visits, peak day</li>
                <li>Required no upfront payment or long-term commitment from the student</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Email Campaign */}
        <section>
          <SectionHeader number="02" title="Email Campaign" />

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-bold text-white">208</p>
              <p className="text-white/40 text-xs mt-1">Recipients</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-amber-300">20.39%</p>
              <p className="text-white/40 text-xs mt-1">Open Rate (42 opens)</p>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-rose-300">1.94%</p>
              <p className="text-white/40 text-xs mt-1">CTR (4 clicks)</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 mb-8">
            <p className="text-amber-300 font-medium text-sm mb-1">Deliverability note</p>
            <p className="text-white/55 text-sm">
              The campaign landed in recipients&apos; promotional inboxes, not their primary inbox.
              This is the primary driver of low clicks and zero direct conversions. A 20.39% open
              rate from a promotional folder is actually a reasonable signal — the subject lines
              worked for those who saw them. Future campaigns must address sender reputation,
              plain-text formatting, and domain warm-up before send.
            </p>
          </div>

          {/* Note on email campaign scope */}
          <div className="rounded-xl border border-white/10 bg-white/3 px-5 py-4 mb-6 text-white/50 text-sm">
            <strong className="text-white/70">Scope note:</strong> The email campaign was run specifically for the beta sign-up (Hypothesis 1). The hackathon (Hypothesis 2) was driven entirely through Instagram and peer referral — no separate email campaign was sent for it.
          </div>

          <div className="space-y-4">
            {/* Campaign 1 — actual email sent, translated from PDF */}
            <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-xs">Email 1 — Sent to 208 recipients</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    20.39% open rate
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    1.94% CTR
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm text-white/65">
                <p className="text-white font-semibold text-base">What&apos;s up seedlings 🌱</p>
                <p>
                  เคยถามตัวเองไหมว่า คณะที่กำลังจะเลือก คือ{" "}
                  <span className="text-amber-300 font-medium">&quot;ทางที่ใช่สำหรับเรา&quot;</span>{" "}
                  จริงๆ หรือเป็นเพียงทางที่ใครหลายคนบอกว่า &quot;ดี&quot;? 🤔
                </p>
                <p>
                  หลายคนเพิ่งมารู้ตัวหลังจากเข้าเรียนไปแล้วว่า สิ่งที่คิดไว้กับความจริงนั้นต่างกันมาก
                  บางคนรู้สึกเสียดายเวลา บางคนรู้สึกว่าตัวเองหลงทาง 🥹
                </p>
                <p className="text-white/40 italic text-xs">
                  ความจริงคือ การเลือกคณะตอนอายุเท่านี้ ไม่ใช่เรื่องง่ายเลย เพราะคุณกำลังตัดสินใจโดยที่ยังไม่เคย &quot;ได้ลองใช้ชีวิตในเส้นทางนั้นจริงๆ&quot;
                </p>
                <div className="border-l-2 border-amber-500/40 pl-4 mt-4">
                  <p className="text-white/80 font-medium">PassionSeed App ถูกสร้างขึ้นเพื่อแก้ปัญหานี้</p>
                  <p className="mt-1">
                    เราอยากให้น้องๆ ได้ลอง{" "}
                    <span className="text-amber-300">สัมผัสเส้นทางอาชีพที่สนใจ</span>{" "}
                    ตั้งแต่ช่วงมหาลัยไปจนถึงชีวิตการทำงานจริง ก่อนที่จะตัดสินใจเลือกทางของตัวเอง
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                  <p className="text-white font-semibold">
                    ตอนนี้เราเปิด <span className="text-amber-300">Beta Test รุ่นแรก ✈️</span>
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    สำหรับ <span className="text-white font-bold">100 คนแรก</span>{" "}
                    ที่อยากลองสำรวจเส้นทางของตัวเองให้ชัดขึ้น
                  </p>
                </div>
                <p>
                  ถ้าน้องกำลังตั้งคำถามกับอนาคตของตัวเอง นี่อาจเป็นโอกาสที่จะได้ลองค้นหาคำตอบน้าา
                  (พิเศษสุดๆ เลยล่ะ แค่ 100 คนแรกเท่านั้น 🤩)
                </p>
                <div className="mt-2">
                  <a
                    href="https://www.passionseed.org/app/beta"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/30 transition-colors"
                  >
                    👉 สมัคร Beta Test → passionseed.org/app/beta
                  </a>
                </div>
                <p className="text-white/40 text-xs mt-4">
                  ก่อนจะตัดสินใจ 4 ปี++ ของชีวิต ลองให้ตัวเองได้สำรวจมันจริงๆ ก่อน
                </p>
                <p className="text-white/50 italic text-xs">ด้วยรักและห่วงใย, จาก พี่ๆ Passionseed 🫶🔥🌱</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: KPIs */}
        <section>
          <SectionHeader number="03" title="KPIs & Success Factors" />
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-4 py-3 text-white/50 font-medium">KPI</th>
                  <th className="text-left px-4 py-3 text-white/50 font-medium">Why It Matters</th>
                  <th className="text-left px-4 py-3 text-white/50 font-medium">Target</th>
                  <th className="text-left px-4 py-3 text-white/50 font-medium">Actual</th>
                  <th className="text-left px-4 py-3 text-white/50 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <KpiRow
                  kpi="Total actions taken"
                  why="Proves willingness to commit time, not just attention"
                  target="≥ 100"
                  result={`${participants.length} hackathon + ${betaRegistrations.length} beta`}
                  pass={true}
                />
                <KpiRow
                  kpi="Team formation rate"
                  why="Forming a team requires coordination — strongest signal of intent"
                  target="≥ 50% of registrants"
                  result={`${teamRate}% (${withTeam} of ${participants.length})`}
                  pass={parseFloat(teamRate) >= 50}
                />
                <KpiRow
                  kpi="Beta completion rate"
                  why="Multi-step form + share = high-effort filter"
                  target="≥ 50%"
                  result="64.1% (25 of 39 who reached upload step)"
                  pass={true}
                />
                <KpiRow
                  kpi="Email open rate"
                  why="Baseline engagement signal from prior list"
                  target="≥ 20%"
                  result="20.39% (42 of 208)"
                  pass={true}
                />
                <KpiRow
                  kpi="Email click-through rate"
                  why="Measures persuasiveness of messaging"
                  target="≥ 3%"
                  result="1.94% (4 of 208)"
                  pass={false}
                />
                <KpiRow
                  kpi="Referral-driven registrations"
                  why="Peer-sharing proves organic social proof"
                  target="≥ 20% of total"
                  result="~30% via friend referral"
                  pass={true}
                />
                <KpiRow
                  kpi="Cost per engaged user (beta)"
                  why="Validates paid channel efficiency"
                  target="< ฿15/user"
                  result="฿11.03 (฿320.01 / 29 registrations)"
                  pass={true}
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Results */}
        <section>
          <SectionHeader number="04" title="Results Evaluation" />

          <div className="space-y-8">
            {/* Hackathon */}
            <div>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">
                  Hypothesis 2
                </span>
                Hackathon — Live MVP
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard label="Total Registrations" value={participants.length} accent="indigo" />
                <StatCard label="With Team" value={withTeam} sub={`${teamRate}% of total`} accent="emerald" />
                <StatCard label="Without Team" value={withoutTeam} sub={`${(100 - parseFloat(teamRate)).toFixed(1)}% of total`} accent="rose" />
                <StatCard label="Peak Day" value="163" sub="March 15, 2026" accent="amber" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard label="Unique Visitors" value="1,555" sub="Last 30 days" accent="violet" />
                <StatCard label="Page Views" value="2,846" accent="violet" />
                <StatCard label="Avg Daily Visitors" value="86" accent="violet" />
                <StatCard label="Instagram Followers" value="697" sub="Owned audience base" accent="amber" />
              </div>

              {/* Traffic sources */}
              <div className="rounded-xl border border-white/10 bg-white/3 p-5 mb-4">
                <h4 className="text-white/60 text-xs uppercase tracking-wider mb-4">
                  Traffic Sources
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "Instagram", pct: 44, color: "bg-pink-400" },
                    { label: "Friend Referral (เพื่อนแนะนำ)", pct: 30, color: "bg-indigo-400" },
                    { label: "Facebook", pct: 10, color: "bg-blue-400" },
                    { label: "Other (อื่นๆ)", pct: 10, color: "bg-white/30" },
                    { label: "Teacher (ครู/อาจารย์แนะนำ)", pct: 3, color: "bg-emerald-400" },
                    { label: "TikTok", pct: 3, color: "bg-cyan-400" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-white/50 text-xs w-52 shrink-0">{label}</span>
                      <div className="flex-1 bg-white/5 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-white/60 text-xs w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-white/50 text-sm leading-relaxed">
                349 registrations from a base of 697 Instagram followers represents a{" "}
                <strong className="text-white">50.1% conversion rate</strong> from our owned
                audience. Friend referral at 30% means peer-to-peer spread accounted for
                roughly 105 additional organic registrations. The 66.2% team formation rate
                is the strongest engagement signal: forming a team requires coordination with
                at least one other person — a social contract, not a click.
              </p>
            </div>

            {/* Beta */}
            <div>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-xs border border-violet-500/30">
                  Hypothesis 1
                </span>
                Beta Sign-up — Concierge MVP
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard label="Total Registrations" value={betaRegistrations.length} accent="violet" />
                <StatCard label="Completed Form + Evidence" value="25" sub="86.2% of registrants" accent="emerald" />
                <StatCard label="Completion Rate" value="64.1%" sub="Form → Upload" accent="amber" />
                <StatCard label="Ad Spend" value="฿320.01" sub="฿11.03 per sign-up" accent="rose" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard label="Post Views (post 1)" value="2,211" accent="violet" />
                <StatCard label="Post Views (post 2)" value="8,435" accent="violet" />
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                29 registrations from ฿320.01 is an efficient ฿11 cost-per-committed-sign-up.
                The 35.9% abandonment at the share step reveals a key product insight: students
                will register for themselves, but public sharing creates friction.
                Future referral mechanics should feel natural and low-stakes — pre-written
                copy, one-tap share — or replace the gate with a softer incentive.
              </p>
            </div>

            {/* Key Learnings */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h4 className="text-white font-semibold mb-4">Key Learnings</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-emerald-400 text-xs uppercase tracking-wider mb-2">
                    What Worked
                  </p>
                  <ul className="space-y-2 text-white/55 text-sm">
                    <li>• Framing the MVP as a live event (hackathon) dramatically increased commitment signals vs. a static waitlist</li>
                    <li>• Instagram + peer referral outperformed email — our audience lives on social, not their inbox</li>
                    <li>• Team formation mechanic served as a natural commitment filter</li>
                    <li>• ฿11/sign-up validates paid social as an efficient acquisition channel</li>
                  </ul>
                </div>
                <div>
                  <p className="text-rose-400 text-xs uppercase tracking-wider mb-2">
                    What to Fix
                  </p>
                  <ul className="space-y-2 text-white/55 text-sm">
                    <li>• Email deliverability — fix SPF/DKIM, warm up sender domain, use plain-text formatting</li>
                    <li>• Beta referral gate has 35.9% abandonment — lower friction or replace with softer incentive</li>
                    <li>• Email-to-landing-page funnel produced 0 conversions — align CTA with landing page</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Appendix: Participant Lists */}
        <section>
          <SectionHeader number="A1" title={`Hackathon Participant List (${participants.length} total)`} />
          <p className="text-white/40 text-sm mb-6">
            All {participants.length} registrations constitute the primary committed actions for
            this sprint. Participants with a team assigned represent the highest-commitment tier
            ({withTeam} people, {teamRate}% of total).
          </p>
          <ParticipantTable participants={participants} />
        </section>

        <section>
          <SectionHeader
            number="A2"
            title={`Beta Registration List (${betaRegistrations.length} total)`}
          />
          <p className="text-white/40 text-sm mb-6">
            Beta registrants completed a multi-step form and share requirement. All{" "}
            {betaRegistrations.length} registrations represent high-intent early adopters.
          </p>
          <BetaTable registrations={betaRegistrations} />
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-8 pb-4">
          <p className="text-white/20 text-xs text-center">
            PassionSeed · Epic Sprint Report · March 2026 ·{" "}
            <span className="text-emerald-400/60">Sprint Passed — {participants.length} actions recorded</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
