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
  Users,
  type LucideIcon,
} from "lucide-react";

import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { CopyBox } from "@/components/shift/seedstack/SeedstackCopyBox";
import { SEEDSTACK_GUIDE as G } from "@/lib/content/seedstack-guide";

/** The one-page SeedStack guide: install, start, commands, rules, privacy. */

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const cardStyle = { backgroundColor: paper("0d"), boxShadow: `inset 0 0 0 1px ${paper("26")}` };

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
  "/seedstack-live": Globe,
  "/seedstack-connect": Cable,
};

const RULE_ICONS: LucideIcon[] = [Keyboard, MessageCircleQuestion, Megaphone];
const PRIVACY_ICONS: LucideIcon[] = [HardDrive, EyeOff, Trash2];

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
    <section id={def.id} className="scroll-mt-20 space-y-4">
      <h2 className="flex items-center gap-3 font-kodchasan text-xl font-bold">
        <InkChip tint={def.tint}>
          <Icon className="h-5 w-5" />
        </InkChip>
        <span className="flex items-baseline gap-2.5">
          <span className="text-sm" style={{ color: def.tint }}>
            0{def.n}
          </span>
          {def.title}
        </span>
      </h2>
      {children}
    </section>
  );
}

function Nav() {
  return (
    <nav aria-label="สารบัญ" className="sticky top-3 z-20">
      <ol
        className="flex flex-wrap gap-1 rounded-2xl p-1.5"
        style={{
          backgroundColor: `${INK.black}e6`,
          boxShadow: `inset 0 0 0 1px ${paper("26")}`,
          backdropFilter: "blur(8px)",
        }}
      >
        {SECTIONS.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-colors"
              style={{ color: paper("cc") }}
            >
              <span className="text-xs font-bold" style={{ color: s.tint }}>
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
    <p className="text-sm" style={{ color: paper("99") }}>
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
            <p className="text-sm" style={{ color: paper("b3") }}>
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
        const Icon = icons[i];
        return (
          <li key={head} className="flex gap-3">
            <InkChip tint={tint} size="sm">
              <Icon className="h-4 w-4" />
            </InkChip>
            <div>
              <p className="font-semibold">{head}</p>
              <p className="text-sm" style={{ color: paper("b3") }}>
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
    <div className="overflow-hidden rounded-xl" style={{ boxShadow: `inset 0 0 0 1px ${paper("26")}` }}>
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ backgroundColor: paper("14") }}
        aria-hidden="true"
      >
        {[INK.pink, INK.yellow, INK.blue].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
        <span className="ml-2 font-mono text-xs" style={{ color: paper("80") }}>
          /seedstack
        </span>
      </div>
      <pre
        className="p-4 font-mono text-sm leading-relaxed"
        style={{ backgroundColor: paper("0d"), color: INK.paper }}
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
      <p className="leading-relaxed" style={{ color: paper("cc") }}>
        {G.start.body}
      </p>
      <TerminalBoard lines={G.start.board} />
    </Section>
  );
}

function CommandsSection() {
  return (
    <Section def={SECTIONS[2]}>
      <ul className="divide-y rounded-xl" style={{ ...cardStyle, borderColor: paper("1a") }}>
        {G.commands.rows.map((row) => {
          const Icon = COMMAND_ICONS[row.cmd] ?? SquareTerminal;
          return (
            <li key={row.cmd} className="flex items-start gap-3 p-4" style={{ borderColor: paper("1a") }}>
              <InkChip tint={INK.pink} size="sm">
                <Icon className="h-4 w-4" />
              </InkChip>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <code className="font-semibold" style={{ color: INK.yellow }}>
                    {row.cmd}
                  </code>
                  <span className="text-xs" style={{ color: paper("99") }}>
                    → {row.out}
                  </span>
                </div>
                <p className="text-sm" style={{ color: paper("cc") }}>
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
          const Icon = PRIVACY_ICONS[i];
          return (
            <li key={item} className="flex items-start gap-3">
              <InkChip tint={INK.blue} size="sm">
                <Icon className="h-4 w-4" />
              </InkChip>
              <p className="pt-1 text-sm leading-relaxed" style={{ color: paper("cc") }}>
                {item}
              </p>
            </li>
          );
        })}
      </ul>
      <Link href={G.privacy.link.href} className="inline-block text-sm underline" style={{ color: INK.paper }}>
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
    >
      <RisoPageTexture />
      <main className="relative mx-auto max-w-xl space-y-12 px-6 py-16">
        <header className="space-y-4">
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-kodchasan text-sm font-bold"
            style={{ color: INK.yellow, boxShadow: `inset 0 0 0 1px ${paper("33")}` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: INK.yellow }} aria-hidden="true" />
            {G.eyebrow}
          </p>
          <h1
            className="font-kodchasan text-3xl font-bold leading-tight sm:text-4xl"
            style={MISREG_TEXT}
          >
            {G.title}
          </h1>
          <p className="leading-relaxed" style={{ color: paper("cc") }}>
            {G.intro}
          </p>
        </header>
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
