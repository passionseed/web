import type { ReactNode } from "react";
import Link from "next/link";
import {
  Blocks,
  Cable,
  ClipboardCheck,
  Compass,
  Crosshair,
  Download,
  EyeOff,
  Globe,
  HardDrive,
  Keyboard,
  Megaphone,
  MessageCircleQuestion,
  RefreshCw,
  Scale,
  ShieldCheck,
  SquareTerminal,
  Terminal,
  Trash2,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { RisoBand, RisoPageTexture } from "@/components/shift/ShiftRiso";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { FLOW_TEXT, flowPanelClass, paper } from "@/components/shift/join/shiftFlowInk";
import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { CopyBox } from "@/components/shift/seedstack/SeedstackCopyBox";
import { SEEDSTACK_GUIDE as G } from "@/lib/content/seedstack-guide";

/** The one-page SeedStack guide: install, start, commands, rules, privacy. */

/** Section numbers are text, so blue sections print the sky's lighter blue (INK.blue is 3.8:1). */
const textTint = (tint: string) => (tint === INK.blue ? FLOW_TEXT.sky : tint);

type SectionId = keyof typeof G.nav;

type SectionDef = {
  id: SectionId;
  n: number;
  title: string;
  icon: LucideIcon;
  tint: string;
};

const SECTIONS: SectionDef[] = [
  { id: "install", n: 1, title: G.install.title, icon: Terminal, tint: INK.yellow },
  { id: "start", n: 2, title: G.start.title, icon: Compass, tint: INK.orange },
  { id: "commands", n: 3, title: G.commands.title, icon: SquareTerminal, tint: INK.pink },
  { id: "rules", n: 4, title: G.rules.title, icon: Scale, tint: INK.paper },
  { id: "privacy", n: 5, title: G.privacy.title, icon: ShieldCheck, tint: INK.blue },
];

const COMMAND_ICONS: Record<string, LucideIcon> = {
  "/seedstack-install": Download,
  "/seedstack-scope": Crosshair,
  "/seedstack-ship": ClipboardCheck,
  "/seedstack-test": Users,
  "/seedstack-build": Blocks,
  "/seedstack-autobuild": Zap,
  "/seedstack-live": Globe,
  "/seedstack-connect": Cable,
};

const RULE_ICONS: LucideIcon[] = [Keyboard, MessageCircleQuestion, Megaphone];
// One per G.privacy.items, in order: local only, nothing leaves, parent consent, withdraw.
const PRIVACY_ICONS: LucideIcon[] = [HardDrive, EyeOff, UserCheck, Trash2];

/** Ink square with a pink offset shadow: the riso misregistration wink. */
function InkChip({
  tint,
  size = "md",
  children,
}: {
  tint: string;
  size?: "md" | "sm";
  children: ReactNode;
}) {
  const box = size === "md" ? "h-10 w-10 rounded-lg" : "h-8 w-8 rounded-md";
  const offsetColor = tint === INK.pink ? INK.yellow : INK.pink;
  return (
    <span className={`relative inline-flex shrink-0 ${box}`} aria-hidden="true">
      <span
        className={`absolute inset-0 translate-x-[2px] translate-y-[2px] ${box}`}
        style={{ backgroundColor: offsetColor, opacity: 0.55 }}
      />
      <span
        className={`relative flex h-full w-full items-center justify-center ${box}`}
        style={{ backgroundColor: tint, color: INK.black }}
      >
        {children}
      </span>
    </span>
  );
}

function Section({ def, children }: { def: SectionDef; children: ReactNode }) {
  const Icon = def.icon;
  return (
    <section id={def.id} className="scroll-mt-28 space-y-4">
      <h2 className="flex items-center gap-3 font-kodchasan text-xl font-bold">
        <InkChip tint={def.tint}>
          <Icon className="h-5 w-5" />
        </InkChip>
        <span className="flex items-baseline gap-2.5">
          <span className="text-sm" style={{ color: textTint(def.tint) }}>
            0{def.n}
          </span>
          {def.title}
        </span>
      </h2>
      {children}
    </section>
  );
}

/**
 * One row that scrolls sideways on narrow screens instead of wrapping, so its
 * height stays fixed and sections can clear it with a matching scroll margin.
 */
function Nav() {
  return (
    <nav aria-label="สารบัญ" className="sticky top-2 z-30 -mx-2">
      <ol
        className="flex justify-between overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          backgroundColor: `${INK.black}f2`,
          boxShadow: `inset 0 0 0 1px ${paper("66")}, 3px 3px 0 0 rgba(0, 120, 191, 0.5)`,
          backdropFilter: "blur(8px)",
        }}
      >
        {SECTIONS.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              className="flex min-h-12 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-semibold sm:gap-1.5 sm:px-3 transition-colors hover:bg-[rgba(242,234,217,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffe800]"
              style={{ color: FLOW_TEXT.body }}
            >
              <span className="text-xs font-bold" style={{ color: textTint(s.tint) }}>
                0{s.n}
              </span>
              {G.nav[s.id]}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
      {children}
    </p>
  );
}

function Steps({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <ol className="space-y-3">
      {items.map(([head, detail], i) => (
        <li key={head} className="flex gap-3">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: INK.yellow, color: INK.black }}
          >
            {i + 1}
          </span>
          <div>
            <p className="font-semibold">{head}</p>
            <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
              {detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function IconSteps({
  items,
  icons,
  tint,
}: {
  items: readonly (readonly [string, string])[];
  icons: LucideIcon[];
  tint: string;
}) {
  return (
    <ol className="space-y-3">
      {items.map(([head, detail], i) => {
        const Icon = icons[i] ?? icons[icons.length - 1];
        return (
          <li key={head} className="flex gap-3">
            <InkChip tint={tint} size="sm">
              <Icon className="h-4 w-4" />
            </InkChip>
            <div>
              <p className="font-semibold">{head}</p>
              <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
                {detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The /seedstack progress board, dressed as the terminal it prints in. */
function TerminalBoard({ lines }: { lines: readonly string[] }) {
  return (
    <div className={`${flowPanelClass} overflow-hidden`}>
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ backgroundColor: paper("14"), borderBottom: `1px solid ${paper("40")}` }}
        aria-hidden="true"
      >
        {[INK.pink, INK.yellow, INK.blue].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
        <span className="ml-2 font-mono text-xs" style={{ color: FLOW_TEXT.muted }}>
          /seedstack
        </span>
      </div>
      <pre
        className="overflow-x-auto p-4 font-mono text-sm leading-relaxed"
        style={{ color: FLOW_TEXT.strong }}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}

function InstallSection() {
  return (
    <Section def={SECTIONS[0]}>
      {G.install.lines.map((line) => (
        <CopyBox key={line.label} label={line.label} value={line.value} />
      ))}
      <Steps items={G.install.steps} />
      <Note>{G.install.note}</Note>
    </Section>
  );
}

function StartSection() {
  return (
    <Section def={SECTIONS[1]}>
      <p className="leading-relaxed" style={{ color: FLOW_TEXT.body }}>
        {G.start.body}
      </p>
      <TerminalBoard lines={G.start.board} />
      <p className="leading-relaxed" style={{ color: FLOW_TEXT.body }}>
        {G.start.create}
      </p>
    </Section>
  );
}

function CommandsSection() {
  return (
    <Section def={SECTIONS[2]}>
      <ul className={`${flowPanelClass} divide-y divide-[rgba(242,234,217,0.2)]`}>
        {G.commands.rows.map((row) => {
          const Icon = COMMAND_ICONS[row.cmd] ?? SquareTerminal;
          return (
            <li key={row.cmd} className="flex items-start gap-3 p-4">
              <InkChip tint={INK.pink} size="sm">
                <Icon className="h-4 w-4" />
              </InkChip>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <code className="font-semibold" style={{ color: INK.yellow }}>
                    {row.cmd}
                  </code>
                  <span className="text-[13px]" style={{ color: FLOW_TEXT.muted }}>
                    → {row.out}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.body }}>
                  {row.when}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Note>{G.commands.note}</Note>
    </Section>
  );
}

function RulesSection() {
  return (
    <Section def={SECTIONS[3]}>
      <IconSteps items={G.rules.items} icons={RULE_ICONS} tint={INK.paper} />
    </Section>
  );
}

function PrivacySection() {
  return (
    <Section def={SECTIONS[4]}>
      <ul className="space-y-3">
        {G.privacy.items.map((item, i) => {
          const Icon = PRIVACY_ICONS[i] ?? ShieldCheck;
          return (
            <li key={item} className="flex items-start gap-3">
              <InkChip tint={INK.blue} size="sm">
                <Icon className="h-4 w-4" />
              </InkChip>
              <p className="pt-1 text-sm leading-relaxed" style={{ color: FLOW_TEXT.body }}>
                {item}
              </p>
            </li>
          );
        })}
      </ul>
      <Link
        href={G.privacy.link.href}
        className="inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
        style={{ color: FLOW_TEXT.strong }}
      >
        {G.privacy.link.label}
      </Link>
    </Section>
  );
}

export function SeedstackGuide() {
  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
      lang="th"
    >
      <RisoPageTexture />
      <ShiftTopBar />
      <RisoBand>
        <div className="mx-auto max-w-xl space-y-4 px-6">
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-kodchasan text-sm font-bold"
            style={{ color: INK.yellow, boxShadow: `inset 0 0 0 1px ${paper("66")}` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: INK.yellow }} aria-hidden="true" />
            {G.eyebrow}
          </p>
          <h1 className="text-balance font-kodchasan text-3xl font-bold leading-snug sm:text-4xl" style={MISREG_TEXT}>
            {G.title}
          </h1>
          <p className="text-[17px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
            {G.intro}
          </p>
        </div>
      </RisoBand>
      <main className="relative mx-auto max-w-xl space-y-12 px-6 pb-20 pt-8">
        <Nav />
        <InstallSection />
        <StartSection />
        <CommandsSection />
        <RulesSection />
        <PrivacySection />
        <Note>
          <span className="inline-flex items-start gap-2">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" style={{ color: INK.orange }} aria-hidden="true" />
            {G.update}
          </span>
        </Note>
      </main>
    </div>
  );
}
