import Link from "next/link";
import {
  Building2,
  GraduationCap,
  LineChart,
  Users2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Market Research | College Pathfinding for High-School Students",
  description:
    "Current landscape and positioning of businesses helping high-school students and families choose college paths.",
};

const segments = [
  {
    title: "School-embedded platforms",
    category: "Institutional scale play",
    signal: "Mass-market through district/counseling workflows",
    players: "Naviance, Xello, Cialfo, College Board/BigFuture",
    positioning:
      "Integrate with schools and counselors, normalize guidance at population scale, and turn fragmented workflows into tracked pathways.",
  },
  {
    title: "Premium coaching + admissions consulting",
    category: "High-conversion, high-price segment",
    signal: "Family spend concentrates in affluent / selective-application cohorts",
    players: "IvyWise, CollegeVine, private coaching firms",
    positioning:
      "High-touch human optimization for essays, applications, strategy planning, and school selection.",
  },
  {
    title: "Aid-first and access-focused support",
    category: "Mission and inclusion play",
    signal: "High demand from low-income and first-gen students",
    players: "QuestBridge, UStrive, scholarship-focused mentoring orgs",
    positioning:
      "Prioritize scholarship matching, aid navigation, and trust-rich mentorship before packaging premium services.",
  },
];

const contextSignals = [
  {
    icon: Users2,
    heading: "Context pressure: counselor access gap",
    detail:
      "School counselor capacity remains a structural constraint, so scalable guidance overlays are in demand.",
  },
  {
    icon: LineChart,
    heading: "Context pressure: higher complexity",
    detail:
      "Families now compare far more variables: admissions style, cost transparency, profile fit, and scholarship timing.",
  },
  {
    icon: ShieldCheck,
    heading: "Context pressure: trust sensitivity",
    detail:
      "Selection and transparency matter more than shiny features—outcome boundaries and evidence matter most.",
  },
];

const compactSnapshot = [
  "Best entry wedge: school/counselor partnerships for scalable path guidance.",
  "Differentiate by combining fit + affordability + execution, not just resume optimization.",
  "Keep value proof simple: scholarship outcomes, decision clarity, and onboarding completion.",
];

const competitiveGrid = [
  {
    brand: "College Board (BigFuture)",
    line: "Democratizes planning through broad free tools and scholarship discovery.",
    posture: "High top-of-funnel relevance",
  },
  {
    brand: "Xello / Naviance / Cialfo",
    line: "Owns the school distribution layer, counselor workflow, and reporting value.",
    posture: "High institutional lock-in",
  },
  {
    brand: "IvyWise",
    line: "Premium advisory depth with high-stakes, reputation-sensitive families.",
    posture: "High-touch premium strength",
  },
  {
    brand: "QuestBridge / UStrive",
    line: "Mission-first positioning with scholarships and mentorship for constrained-income students.",
    posture: "Strong equity trust brand",
  },
];

const sources = [
  {
    label: "College Board BigFuture",
    url: "https://bigfuture.collegeboard.org/",
  },
  {
    label: "Xello press and integrations",
    url: "https://xello.world/en/press-releases/school-district-of-philadelphia-partners-with-xello/",
  },
  {
    label: "Cialfo K12 platform",
    url: "https://www.cialfo.co/k12-platform",
  },
  {
    label: "IvyWise admissions counseling",
    url: "https://www.ivywise.com/admissions-counseling/",
  },
  {
    label: "CollegeVine advisor changes",
    url: "https://go.collegevine.com/advisor-resources",
  },
  {
    label: "QuestBridge College Prep Scholars",
    url: "https://www.questbridge.org/apply-to-college/programs/college-prep-scholars-program",
  },
  {
    label: "UStrive",
    url: "https://ustrive.org/",
  },
];

export default function MarketResearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <main className="container mx-auto px-4 py-12 md:py-16">
        <section className="mb-12">
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 md:p-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-800/60 px-4 py-1 text-sm font-medium">
              Market Research: College Pathfinding
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              Finding the Right College Path for High-School Students
            </h1>
            <p className="mt-5 max-w-3xl text-white/90 text-base md:text-lg">
              Snapshot for 2026: incumbents are strong in access and premium guidance, but there is room for a contextualized product that blends fit, cost certainty, and clear decision support.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/map">Back to market maps</Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/95 text-slate-900">
                <Link href="/contact">Request founder summary</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.title} className="bg-white/95 text-slate-900 border-indigo-200/50">
              <CardHeader>
                <div className="inline-flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-700" />
                  <CardTitle>{segment.title}</CardTitle>
                </div>
                <CardDescription className="text-xs text-indigo-900/80">{segment.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900/80">{segment.signal}</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  <span className="font-semibold">Players:</span> {segment.players}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{segment.positioning}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          <Card className="bg-white/95 border-indigo-200/50 text-slate-900">
            <CardHeader>
              <div className="inline-flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-700" />
                <CardTitle>Context to track</CardTitle>
              </div>
              <CardDescription>
                Admissions guidance is increasingly a context stack, not a one-product decision.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contextSignals.map((signal) => (
                <div
                  key={signal.heading}
                  className="rounded-xl border border-indigo-200/60 bg-indigo-50 p-3"
                >
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <signal.icon className="h-4 w-4 text-indigo-700" />
                    {signal.heading}
                  </div>
                  <p className="mt-2 text-sm text-slate-700 leading-6">{signal.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/95 border-indigo-200/50 text-slate-900">
            <CardHeader className="space-y-2">
              <CardTitle>Compact when it&apos;s time</CardTitle>
              <CardDescription>Executive summary for fast decisions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {compactSnapshot.map((point) => (
                <div key={point} className="rounded-xl border border-indigo-200/70 bg-indigo-50 p-3">
                  <p className="text-sm text-slate-700 leading-6">• {point}</p>
                </div>
              ))}
              <a
                href="#competitive-positioning"
                className="inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline"
              >
                View competitive posture
              </a>
            </CardContent>
          </Card>
        </section>

        <section id="competitive-positioning" className="mt-10">
          <Card className="bg-white/95 border-indigo-200/50 text-slate-900">
            <CardHeader>
              <CardTitle>Quick competitive positioning</CardTitle>
              <CardDescription>How incumbents currently defend the category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {competitiveGrid.map((item) => (
                  <div key={item.brand} className="rounded-xl border border-slate-200 p-4">
                    <div className="font-semibold text-slate-900">{item.brand}</div>
                    <p className="mt-2 text-sm text-slate-700 leading-6">{item.line}</p>
                    <p className="mt-2 text-xs text-emerald-700 font-semibold">Posture: {item.posture}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-12">
          <Card className="bg-indigo-950/80 border-indigo-300/40 text-white">
            <CardHeader>
              <div className="inline-flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                <CardTitle>Sources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 text-sm space-y-2 text-white/90">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
