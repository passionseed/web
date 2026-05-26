import { Users, Target, AlertTriangle, Heart, Compass, BookOpen, Lightbulb, Flame } from "lucide-react";

export const metadata = {
  title: "Workspace — Personas | PassionSeed",
  description: "Student personas across Grade 9, Grade 10–12, and University — who we serve and why.",
};

const tagline = "Guidance for young people to choose a path that's actually theirs.";
const purpose = "To guide the newer generation to design their own future so they can live fully.";

const stats = [
  { value: "52%", label: "of Grade 9 students lack formal aptitude testing" },
  { value: "400:1", label: "student-to-counselor ratio in Thai public schools" },
  { value: "Grade 9", label: "decision point that locks university eligibility" },
  { value: "3 tracks", label: "Science / Arts / Vocational — chosen at age 14–15" },
];

const segments = [
  {
    label: "Segment 1",
    name: "Grade 9 Students",
    age: "14–15 years old",
    decision: "Choose high school track: Science / Arts / Vocational",
    stakes: "Locks university eligibility and career options for years",
    deadline: "Hard deadline — school application season",
    payer: "Parents",
    accentClass: "bg-indigo-600/10",
    iconColor: "text-indigo-400",
    borderColor: "border-indigo-500/30",
    personas: [
      {
        id: "anxious-achiever",
        name: "The Anxious Achiever",
        icon: Target,
        accentColor: "from-blue-500/20 to-indigo-500/10",
        borderColor: "border-blue-500/30",
        tagColor: "bg-blue-500/20 text-blue-300",
        iconColor: "text-blue-400",
        dotColor: "bg-blue-400",
        priority: "Priority 1 — Start here",
        priorityColor: "bg-emerald-500/20 text-emerald-300",
        profile: {
          Age: "14–15",
          GPA: "Top 10–20% of class",
          Location: "Bangkok / Major cities",
          Parents: "Professional, high expectations",
        },
        situation:
          "High achiever with strong grades but no clarity on what they actually want. Treats life as an optimization problem. Researches every option obsessively but still can't decide.",
        pain: [
          "Terrified of choosing 'wrong' and wasting potential",
          "Every choice feels permanent and irreversible",
          "Compares themselves to peers constantly",
          "Parents push Science track by default",
        ],
        quote:
          '"I have good grades in everything so I don\'t know what I\'m actually good at. Everyone says Science but I don\'t even know if I like Science."',
        behavior:
          "Seeks external validation — rankings, counselors, online quizzes — but discounts every answer because nothing feels certain enough.",
        howWeHelp:
          "Give them structured self-discovery with clear frameworks. They need permission to explore, not just more information.",
        reachability: "High — active online, parents already spending on tutoring/prep",
      },
      {
        id: "the-pleaser",
        name: "The Pleaser",
        icon: Heart,
        accentColor: "from-pink-500/20 to-rose-500/10",
        borderColor: "border-pink-500/30",
        tagColor: "bg-pink-500/20 text-pink-300",
        iconColor: "text-pink-400",
        dotColor: "bg-pink-400",
        priority: "Priority 2",
        priorityColor: "bg-yellow-500/20 text-yellow-300",
        profile: {
          Age: "14–15",
          GPA: "Average to above average",
          Location: "Bangkok + provincial cities",
          Parents: "Traditional families, career expectations",
        },
        situation:
          "Has a quiet sense of what they want — art, writing, music, sports — but suppresses it. Family expects a 'stable' career. They go along to avoid conflict.",
        pain: [
          "Knows deep down what they want but fears disappointing family",
          "No language to explain their interests as legitimate paths",
          "Chronic guilt when considering non-traditional tracks",
          "Disconnected from their own instincts",
        ],
        quote:
          '"My parents want me to do Science so I\'ll do Science. I kind of like drawing but that\'s not a real job anyway."',
        behavior:
          "Outwardly compliant, inwardly conflicted. Will choose the safe track, disengage slowly, underperform in years 2–3.",
        howWeHelp:
          "Show them real career paths from their interests. Give vocabulary and data to have the conversation with parents.",
        reachability: "Medium — pain is hidden, needs trusted community or peer referral to find us",
      },
      {
        id: "the-drifter",
        name: "The Drifter",
        icon: Compass,
        accentColor: "from-amber-500/20 to-orange-500/10",
        borderColor: "border-amber-500/30",
        tagColor: "bg-amber-500/20 text-amber-300",
        iconColor: "text-amber-400",
        dotColor: "bg-amber-400",
        priority: "Priority 3",
        priorityColor: "bg-slate-500/20 text-slate-300",
        profile: {
          Age: "14–15",
          GPA: "Average or inconsistent",
          Location: "Urban and provincial",
          Parents: "Limited guidance, busy or disengaged",
        },
        situation:
          "No strong passion, no clear direction. Chooses based on friends or gut feeling. Not anxious — just genuinely unmotivated and unexposed.",
        pain: [
          "Never been asked what they actually care about",
          "Limited exposure to careers beyond what parents do",
          "Feels like the decision doesn't matter much",
          "Low confidence that any path is 'for them'",
        ],
        quote:
          '"I\'ll just do what my friends do. I don\'t really know. Maybe Arts? I don\'t mind."',
        behavior:
          "Passive by default. Won't seek guidance independently. Needs direct intervention — school, parent, or peer nudge.",
        howWeHelp:
          "Exposure first. Show them the world is bigger than they think before asking them to choose.",
        reachability: "Low — low urgency, unlikely to self-select. Reach via schools or parents.",
      },
    ],
  },
  {
    label: "Segment 2",
    name: "Grade 10–12 Students",
    age: "15–18 years old",
    decision: "Navigate chosen track + prepare for TCAS university application",
    stakes: "University placement, major selection, first major life outcome",
    deadline: "TCAS application cycle — national deadline pressure",
    payer: "Parents + self",
    accentClass: "bg-violet-600/10",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/30",
    personas: [
      {
        id: "the-regretful",
        name: "The Regretful",
        icon: BookOpen,
        accentColor: "from-violet-500/20 to-purple-500/10",
        borderColor: "border-violet-500/30",
        tagColor: "bg-violet-500/20 text-violet-300",
        iconColor: "text-violet-400",
        dotColor: "bg-violet-400",
        priority: "Priority 1 — Highest pain",
        priorityColor: "bg-emerald-500/20 text-emerald-300",
        profile: {
          Age: "15–17",
          Track: "Wrong track — knew it by year 1",
          GPA: "Declining",
          Parents: "Invested in current path, resistant to change",
        },
        situation:
          "Chose Science (or Arts/Voc) under pressure, realized within months it wasn't them. Now stuck — switching tracks means losing a year. Parents won't hear it.",
        pain: [
          "Trapped in a path they didn't choose freely",
          "Grades falling, motivation gone",
          "Fear of wasting another year switching",
          "No one to validate that changing is okay",
        ],
        quote:
          '"I knew in month 2 that Science wasn\'t for me but I didn\'t say anything. Now I\'m in year 2 and I hate every class."',
        behavior:
          "Disengages gradually. Grades slip. Spends energy managing anxiety rather than learning. May drop out or just endure.",
        howWeHelp:
          "Normalize the pivot. Show real paths from where they are now. Give them language to talk to parents.",
        reachability: "High — actively searching for answers, emotionally primed to act",
      },
      {
        id: "the-anxious-achiever-major",
        name: "The Anxious Achiever (Major)",
        icon: Target,
        accentColor: "from-blue-500/20 to-indigo-500/10",
        borderColor: "border-blue-500/30",
        tagColor: "bg-blue-500/20 text-blue-300",
        iconColor: "text-blue-400",
        dotColor: "bg-blue-400",
        priority: "Priority 2",
        priorityColor: "bg-yellow-500/20 text-yellow-300",
        profile: {
          Age: "16–18",
          Track: "Right track, wrong destination",
          GPA: "Strong — top 20%",
          Parents: "Pushing Medicine / Engineering / Law",
        },
        situation:
          "Track is fine, grades are strong, but TCAS is coming and they have no idea which faculty to apply to. Parents want Medicine. They're not sure. Clock is ticking.",
        pain: [
          "University major feels like another permanent trap",
          "Comparing 10 faculties and paralyzed",
          "Social pressure to apply to prestige faculties",
          "No one asks what they actually want to do with their life",
        ],
        quote:
          '"My grades are good enough for Medicine but I don\'t know if I want to be a doctor. But what else do I do with Science?"',
        behavior:
          "Deep research spiral. Makes spreadsheets. Asks everyone. Still can't decide. Eventually picks by elimination or deadline.",
        howWeHelp:
          "Connect major choice to real work they'd do day-to-day. Explore via expert conversations, not rankings.",
        reachability: "High — motivated, online, parents paying",
      },
      {
        id: "the-lost-creative",
        name: "The Lost Creative",
        icon: Flame,
        accentColor: "from-rose-500/20 to-pink-500/10",
        borderColor: "border-rose-500/30",
        tagColor: "bg-rose-500/20 text-rose-300",
        iconColor: "text-rose-400",
        dotColor: "bg-rose-400",
        priority: "Priority 3",
        priorityColor: "bg-slate-500/20 text-slate-300",
        profile: {
          Age: "15–18",
          Track: "Arts or Science (against instinct)",
          GPA: "Average — unmotivated",
          Parents: "Dismissive of creative careers",
        },
        situation:
          "Passionate about something real — game design, music production, filmmaking, writing — but has no roadmap. Told it's not a career. Grinding through school with no inner fire.",
        pain: [
          "Passion exists but has no visible path",
          "Adults around them have no frame for creative careers",
          "Internalizing 'it's not practical' as truth",
          "Energy and identity suppressed for years",
        ],
        quote:
          '"I really want to make games but my parents say I should do Engineering first and do games as a hobby. Is that true?"',
        behavior:
          "Pursues passion underground — late nights, personal projects, online communities. Academic performance detached from actual potential.",
        howWeHelp:
          "Show them real career paths in their domain. Connect them with professionals doing what they love.",
        reachability: "Medium — passionate communities online, strong word-of-mouth once reached",
      },
    ],
  },
  {
    label: "Segment 3",
    name: "University Students",
    age: "18–22 years old",
    decision: "Navigate major, find direction, prepare for first job",
    stakes: "Wasted tuition, wrong career entry, years of financial + emotional cost",
    deadline: "Graduation — real-world entry in 2–4 years",
    payer: "Self + parents",
    accentClass: "bg-emerald-600/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    personas: [
      {
        id: "the-mismatched-major",
        name: "The Mismatched Major",
        icon: AlertTriangle,
        accentColor: "from-emerald-500/20 to-teal-500/10",
        borderColor: "border-emerald-500/30",
        tagColor: "bg-emerald-500/20 text-emerald-300",
        iconColor: "text-emerald-400",
        dotColor: "bg-emerald-400",
        priority: "Priority 1 — Highest pain",
        priorityColor: "bg-emerald-500/20 text-emerald-300",
        profile: {
          Age: "18–20",
          Year: "Year 1–2",
          Major: "Clearly wrong fit",
          Parents: "Tuition paid, expectations locked",
        },
        situation:
          "Enrolled in Medicine, Engineering, or Law based on Grade 9–12 path. Semester 1 confirmed the mismatch. Too scared to drop out. Too checked-out to perform well.",
        pain: [
          "Wrong major confirmed but no safe exit",
          "Tuition paid — sunk cost blocks rational decision",
          "Family shame of switching or dropping out",
          "Every semester compounds the wrong direction",
        ],
        quote:
          '"I\'m in year 2 of Engineering and I dread every morning. I don\'t know how I got here. I don\'t know how to leave."',
        behavior:
          "Shows up physically, disengages mentally. GPA tanks. Explores alternatives secretly. High dropout risk or low-engagement graduation.",
        howWeHelp:
          "Map what's transferable from their current major. Show real pivot paths with minimal wasted time.",
        reachability: "High — actively looking for answers, high emotional urgency",
      },
      {
        id: "the-directionless-graduate",
        name: "The Directionless Graduate",
        icon: Compass,
        accentColor: "from-teal-500/20 to-cyan-500/10",
        borderColor: "border-teal-500/30",
        tagColor: "bg-teal-500/20 text-teal-300",
        iconColor: "text-teal-400",
        dotColor: "bg-teal-400",
        priority: "Priority 2",
        priorityColor: "bg-yellow-500/20 text-yellow-300",
        profile: {
          Age: "21–23",
          Year: "Year 3–4 or recent grad",
          Major: "Completed — but unclear fit",
          Parents: "Expecting stable job entry",
        },
        situation:
          "Completed degree. No clarity on what job to take or why. Applying broadly, hoping something sticks. The anxiety is real but the urgency is low — until graduation hits.",
        pain: [
          "Degree done but no career identity",
          "Applying to jobs they're not excited about",
          "Comparison anxiety vs peers who seem to 'know'",
          "No one asks what kind of life they want — only what job",
        ],
        quote:
          '"I graduate in 3 months and I still don\'t know what I want to do. Everyone else seems to have a plan. I just apply and hope."',
        behavior:
          "Broad, unfocused job search. Takes any interview. May accept wrong job just to have an answer. Burnout or regret follows within 1–2 years.",
        howWeHelp:
          "Anchor career exploration to values and strengths, not just job titles. Expert conversations expose real day-to-day work.",
        reachability: "Medium — searchable pain, but urgency spikes only near graduation",
      },
      {
        id: "the-hidden-entrepreneur",
        name: "The Hidden Entrepreneur",
        icon: Lightbulb,
        accentColor: "from-yellow-500/20 to-amber-500/10",
        borderColor: "border-yellow-500/30",
        tagColor: "bg-yellow-500/20 text-yellow-300",
        iconColor: "text-yellow-400",
        dotColor: "bg-yellow-400",
        priority: "Priority 3",
        priorityColor: "bg-slate-500/20 text-slate-300",
        profile: {
          Age: "19–22",
          Year: "Any year",
          Major: "Any — often unrelated to project",
          Parents: "Want job security, unaware of entrepreneurial instinct",
        },
        situation:
          "Running side projects, freelancing, or building something quietly while attending classes. Instinctively entrepreneurial but no validation, no network, no path forward.",
        pain: [
          "Building things in isolation with no mentorship",
          "School doesn't validate or support what they're doing",
          "Pressure to get a 'real job' after graduation",
          "No community of people like them",
        ],
        quote:
          '"I\'ve been freelancing since year 1 and made more than my internship friends but my parents want me to join a company. Is my path even real?"',
        behavior:
          "Executes independently. Strong initiative. High self-doubt about legitimacy. Seeks external validation from mentors and communities.",
        howWeHelp:
          "Connect them with founders and builders. Show entrepreneurship as a career path, not a backup plan.",
        reachability: "Low-medium — niche community, but viral once reached (strong social proof potential)",
      },
    ],
  },
];

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white antialiased">
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-600/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">PassionSeed / Workspace</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Personas</h1>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl">
            Who we serve across all three segments, what they feel, and how we help.
          </p>

          {/* Brand block */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/3 max-w-2xl">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Brand</p>
            <p className="text-white font-semibold text-lg mb-2">{tagline}</p>
            <p className="text-slate-400 text-sm">{purpose}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {stats.map((stat) => (
            <div key={stat.value} className="border border-white/10 rounded-xl p-5 bg-white/3">
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-slate-400 text-xs leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* All segments */}
        <div className="space-y-24">
          {segments.map((seg, segIdx) => (
            <section key={seg.label}>
              {/* Segment header */}
              <div className="flex items-start gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${seg.accentClass} border ${seg.borderColor} flex items-center justify-center`}>
                    <Users className={`w-4 h-4 ${seg.iconColor}`} />
                  </div>
                  <div>
                    <span className={`text-xs font-mono uppercase tracking-widest ${seg.iconColor}`}>{seg.label}</span>
                    <h2 className="text-2xl font-bold text-white">{seg.name} — {seg.age}</h2>
                  </div>
                </div>
              </div>

              {/* Segment context */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                <div className="border border-white/10 rounded-xl p-5 bg-white/3">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Decision</p>
                  <p className="text-white text-sm font-medium">{seg.decision}</p>
                </div>
                <div className="border border-white/10 rounded-xl p-5 bg-white/3">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Stakes</p>
                  <p className="text-white text-sm font-medium">{seg.stakes}</p>
                </div>
                <div className="border border-white/10 rounded-xl p-5 bg-white/3">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Who Pays</p>
                  <p className="text-white text-sm font-medium">{seg.payer} — {seg.deadline}</p>
                </div>
              </div>

              {/* Personas */}
              <div className="space-y-8">
                {seg.personas.map((persona) => {
                  const Icon = persona.icon;
                  return (
                    <div
                      key={persona.id}
                      className={`border ${persona.borderColor} rounded-2xl bg-gradient-to-br ${persona.accentColor} p-8`}
                    >
                      {/* Persona header */}
                      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl border ${persona.borderColor} bg-white/5 flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${persona.iconColor}`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{persona.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {Object.entries(persona.profile).slice(0, 2).map(([k, v]) => (
                                <span key={k} className={`text-xs font-mono px-2 py-0.5 rounded-full ${persona.tagColor}`}>
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-mono px-3 py-1.5 rounded-full ${persona.priorityColor}`}>
                          {persona.priority}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left */}
                        <div className="space-y-6">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Profile</p>
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries(persona.profile).map(([key, val]) => (
                                <div key={key} className="bg-black/20 rounded-lg p-3">
                                  <p className="text-xs text-slate-500 capitalize mb-0.5">{key}</p>
                                  <p className="text-white text-sm font-medium">{val}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Situation</p>
                            <p className="text-slate-300 text-sm leading-relaxed">{persona.situation}</p>
                          </div>

                          <div className="border-l-2 border-white/20 pl-4">
                            <p className="text-slate-300 text-sm italic leading-relaxed">{persona.quote}</p>
                          </div>
                        </div>

                        {/* Right */}
                        <div className="space-y-6">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" /> Pain Points
                            </p>
                            <ul className="space-y-2">
                              {persona.pain.map((p) => (
                                <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${persona.dotColor}`} />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Behavior Pattern</p>
                            <p className="text-slate-300 text-sm leading-relaxed">{persona.behavior}</p>
                          </div>

                          <div className="bg-black/20 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">How We Help</p>
                            <p className="text-white text-sm leading-relaxed">{persona.howWeHelp}</p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Reachability</p>
                            <p className="text-slate-400 text-sm">{persona.reachability}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {segIdx < segments.length - 1 && (
                <div className="mt-16 border-t border-white/5" />
              )}
            </section>
          ))}
        </div>

        <div className="mt-20 text-center text-slate-600 text-xs font-mono">
          PassionSeed / Internal Workspace — Personas v1 · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
