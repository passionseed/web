import type { ReactNode } from "react";
import Link from "next/link";

import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import { INK } from "@/components/shift/poster/riso";
import { CopyBox } from "@/components/shift/seedstack/SeedstackCopyBox";
import { SEEDSTACK_GUIDE as G } from "@/lib/content/seedstack-guide";

/** The one-page SeedStack guide: install, start, commands, rules, privacy. */

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const cardStyle = { backgroundColor: paper("0d"), boxShadow: `inset 0 0 0 1px ${paper("26")}` };

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-baseline gap-3 font-kodchasan text-xl font-bold">
        <span className="text-sm" style={{ color: INK.yellow }}>
          0{n}
        </span>
        {title}
      </h2>
      {children}
    </section>
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

function InstallSection() {
  return (
    <Section n={1} title={G.install.title}>
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
    <Section n={2} title={G.start.title}>
      <p className="leading-relaxed" style={{ color: paper("cc") }}>
        {G.start.body}
      </p>
      <pre className="rounded-xl p-4 text-sm leading-relaxed" style={cardStyle}>
        {G.start.board.join("\n")}
      </pre>
    </Section>
  );
}

function CommandsSection() {
  return (
    <Section n={3} title={G.commands.title}>
      <ul className="divide-y rounded-xl" style={{ ...cardStyle, borderColor: paper("1a") }}>
        {G.commands.rows.map((row) => (
          <li key={row.cmd} className="space-y-1 p-4" style={{ borderColor: paper("1a") }}>
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
          </li>
        ))}
      </ul>
      <Note>{G.commands.note}</Note>
    </Section>
  );
}

function RulesSection() {
  return (
    <Section n={4} title={G.rules.title}>
      <Steps items={G.rules.items} />
    </Section>
  );
}

function PrivacySection() {
  return (
    <Section n={5} title={G.privacy.title}>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: paper("cc") }}>
        {G.privacy.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
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
          <p className="font-kodchasan text-sm font-bold tracking-wide" style={{ color: INK.yellow }}>
            {G.eyebrow}
          </p>
          <h1 className="font-kodchasan text-3xl font-bold leading-tight sm:text-4xl">{G.title}</h1>
          <p className="leading-relaxed" style={{ color: paper("cc") }}>
            {G.intro}
          </p>
        </header>
        <InstallSection />
        <StartSection />
        <CommandsSection />
        <RulesSection />
        <PrivacySection />
        <Note>{G.update}</Note>
      </main>
    </div>
  );
}
