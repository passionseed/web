import { ChevronDown } from "lucide-react";

import { GROWTH_STAGES } from "@/lib/content/growth-stages";

/** Native disclosure keeps stage explanations available without another dashboard. */
export function GrowthStageGuide() {
  return (
    <section aria-labelledby="growth-stage-heading" className="mb-6 font-bai-jamjuree">
      <h2 id="growth-stage-heading" className="font-kodchasan text-xl font-semibold text-white">
        เติบโตในจังหวะของเรา
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        ไม่ต้องมีโปรเจกต์ก็เป็นส่วนหนึ่งของที่นี่ได้ เริ่มจากความสงสัย การลองทำ หรือการช่วยเพื่อนก็ได้
      </p>
      <details className="group mt-4 border-y border-white/10">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-blue-200 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-200 [&::-webkit-details-marker]:hidden">
          <span>Seed, Sprout, Bloom, Tree คืออะไร?</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <p className="pb-4 text-sm leading-7 text-slate-300">
          แต่ละช่วงบอกสิ่งที่เรากำลังเรียนรู้ ไม่ใช่อันดับหรือคะแนน เราเลือกช่วงที่ตรงกับตัวเองและเปลี่ยนได้เสมอ ในเรื่องใหม่ ๆ เรากลับมาเป็น Seed ได้อีก
        </p>
        <ul className="grid gap-x-8 gap-y-6 pb-6 sm:grid-cols-2">
          {GROWTH_STAGES.map((stage) => (
            <li key={stage.id}>
              <p className="font-space-mono text-xs text-blue-200">{stage.name}</p>
              <h3 className="mt-1 font-kodchasan text-base font-semibold leading-7 text-white">{stage.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">{stage.description}</p>
              <p className="mt-2 text-sm leading-7 text-blue-200">{stage.prompt}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
