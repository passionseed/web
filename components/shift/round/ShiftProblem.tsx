import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

import { RisoHeading } from "@/components/shift/ShiftRiso";
import type { ShiftArtKind } from "@/components/shift/theme";
import { T, tint } from "@/components/shift/theme/tokens";

import { PixelCertArt, PixelLiveArt } from "./PixelArt";
import { CertStackArt, LiveWindowArt } from "./ShiftArt";
import { revealClass } from "./motion";

const CAMP_POINTS = [
  "นั่งฟังบรรยาย 6 ชั่วโมง และเล่นเกมกลุ่ม",
  "ใบประกาศเข้าร่วมที่เด็กอีก 1,000 คนก็มีเหมือนกัน",
  "พอร์ตสร้างภาพ “ทำสำเร็จ 100%” ซึ่งอาจารย์มองว่าเมค",
];

const SHIFT_POINTS: { lead: string; body: string }[] = [
  { lead: "Zero Theory, 100% Execution:", body: "ลงมือสร้างตั้งแต่วันแรก ไม่มีสไลด์บรรยาย" },
  { lead: "Live Project:", body: "ผลงานที่มีคนภายนอกใช้งานจริง พร้อมเมตริกจริง" },
  {
    lead: "The Pivot Log:",
    body: "บันทึกจุดพังและการแก้ปัญหา ซึ่งคือสัญญาณที่แรงที่สุดในสายตาอาจารย์",
  },
];

function ComparePanel({
  art,
  label,
  tone,
  children,
  index,
}: {
  art: ReactNode;
  label: ReactNode;
  tone: "muted" | "bright";
  children: ReactNode;
  index: number;
}) {
  const bright = tone === "bright";
  return (
    <div
      className={`shift-tile ${revealClass(index)} flex flex-col p-6 sm:p-8`}
      style={
        bright
          ? { borderColor: `color-mix(in srgb, ${T.accent3} 45%, transparent)` }
          : { opacity: 0.92 }
      }
    >
      <div className="flex justify-center pb-6">{art}</div>
      <p
        className={`mb-5 flex items-center gap-2 ${
          bright
            ? "font-mono text-xs font-bold uppercase tracking-[0.18em]"
            : "text-sm font-semibold"
        }`}
        style={{ color: bright ? T.accent3 : tint("73") }}
      >
        {label}
      </p>
      <ul className="space-y-4">{children}</ul>
    </div>
  );
}

function Point({ icon, children, muted }: { icon: ReactNode; children: ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed" style={muted ? { color: tint("80") } : undefined}>
      <span className="mt-1 shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/** Cert camp vs SHIFT, drawn: a grey pile of the same paper vs a live window. */
export function ShiftProblem({ kind }: { kind: ShiftArtKind }) {
  const pixel = kind === "pixel";
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="The Problem">
        กับดัก &ldquo;พอร์ตเมค&rdquo; ที่กรรมการรู้ทัน
      </RisoHeading>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <ComparePanel
          index={0}
          tone="muted"
          art={pixel ? <PixelCertArt /> : <CertStackArt />}
          label={
            <>
              <X className="h-4 w-4" /> ใบเซอร์ค่ายทั่วไป
            </>
          }
        >
          {CAMP_POINTS.map((point) => (
            <Point key={point} muted icon={<X className="h-4 w-4" style={{ color: tint("59") }} />}>
              {point}
            </Point>
          ))}
        </ComparePanel>

        <ComparePanel
          index={1}
          tone="bright"
          art={pixel ? <PixelLiveArt /> : <LiveWindowArt />}
          label={
            <>
              <Check className="h-4 w-4" /> SHIFT Sandbox
            </>
          }
        >
          {SHIFT_POINTS.map((point) => (
            <Point key={point.lead} icon={<Check className="h-4 w-4" style={{ color: T.accent3 }} />}>
              <strong>{point.lead}</strong> {point.body}
            </Point>
          ))}
        </ComparePanel>
      </div>
    </section>
  );
}
