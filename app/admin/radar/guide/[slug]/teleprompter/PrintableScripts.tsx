import Link from "next/link";
import { clipCommand, teleprompterSteps, type TeleprompterPage } from "@/lib/radar-guide/teleprompter";
import { PrintButton } from "./PrintButton";

/**
 * `?all=1`: the clip slate. Every cutscene script on one page in recording
 * order, for printing or a second screen. Replaces docs/radar-guide/session-1.md.
 */
export function PrintableScripts({ slug, guideName, pages }: { slug: string; guideName: string; pages: TeleprompterPage[] }) {
  const totalSeconds = pages.reduce((sum, p) => sum + p.seconds, 0);
  return (
    <div className="mx-auto max-w-3xl space-y-8 bg-background print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/radar/guide/${slug}/teleprompter`} className="text-sm underline underline-offset-4">
          Open the teleprompter
        </Link>
        <PrintButton />
      </div>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{guideName}: cutscene clip slate</h1>
        <p className="text-sm text-muted-foreground">
          {pages.length} clips, about {Math.round(totalSeconds / 6) / 10} minutes on camera. Recording order: required, then safety,
          then level order. Vertical 9:16, one take per clip, face on screen for every safety line.
        </p>
      </header>
      {pages.length === 0 ? <p className="text-muted-foreground">No clip slots in this guide yet.</p> : null}
      {pages.map((page, i) => (
        <section
          key={page.pageKey}
          className="break-inside-avoid space-y-3 border-t pt-6"
          style={{ fontFamily: "var(--font-kodchasan), var(--font-bai-jamjuree), sans-serif" }}
        >
          <h2 className="text-lg font-semibold">
            {i + 1}. Lv{page.order} {page.titleTh}
            <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
              {page.pageKey} · {page.seconds}s{page.required ? " · required" : ""}
              {page.safety ? " · safety" : ""} · {page.status}
              {page.recordedAt ? ` ${page.recordedAt}` : ""}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">On screen: {page.hookTh}</p>
          {teleprompterSteps(page).map((step, j) => (
            <div key={j} className={step.safety ? "border-l-4 border-amber-400 pl-3" : undefined}>
              {step.kind === "reelHook" ? <p className="font-sans text-xs text-muted-foreground">{step.cue}</p> : null}
              <p className="text-lg leading-relaxed">{step.say}</p>
            </div>
          ))}
          {page.sendToFriendTh ? <p className="text-sm text-muted-foreground">End card: {page.sendToFriendTh}</p> : null}
          <p className="font-mono text-xs text-muted-foreground">{clipCommand(slug, page.pageKey)}</p>
        </section>
      ))}
    </div>
  );
}
