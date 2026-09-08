import React from "react";

interface SlideFrameProps {
  number: number;
  section: string;
  source: string;
  children: React.ReactNode;
  className?: string;
}

export function SlideFrame({ number, section, source, children, className = "" }: SlideFrameProps) {
  return (
    <section className={`relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#000006_0%,#05091d_60%,#151b42_100%)] px-10 py-8 text-white sm:px-12 sm:py-10 lg:px-16 lg:py-12 ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "linear-gradient(to bottom, black, transparent 72%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[34%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(254,217,92,0.16)_0%,rgba(59,130,246,0.08)_34%,transparent_72%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#fed95c]/80 to-transparent shadow-[0_0_24px_rgba(254,217,92,0.45)]" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 sm:text-xs">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#fed95c] shadow-[0_0_10px_rgba(254,217,92,0.65)]" />
            <span className="font-bold text-white/90">PassionSeed</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{section}</span>
            <span className="text-[#fed95c]">0{number}</span>
          </div>
        </header>

        <div className="min-h-0 flex-1">{children}</div>

        <footer className="flex items-end justify-between gap-6 border-t border-white/10 pt-3 text-[9px] leading-tight text-white/45 sm:text-[10px] lg:text-xs">
          <span className="max-w-[70%]">Source: {source}</span>
          <span className="whitespace-nowrap font-mono text-[#fed95c]/85">Submitted 3 Sep 2026</span>
        </footer>
      </div>
    </section>
  );
}
