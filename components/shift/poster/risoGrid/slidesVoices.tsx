import { SHIFT_COHORT_0 } from "@/lib/content/shift-cohort";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";

import { INK } from "../riso";
import { COVER_TOTALS } from "./RisoGridCovers";
import { CommentCta, DIM, FAINT, QuoteCard, RisoSlide, Stamp } from "./RisoSlide";

/**
 * Post B, students in their own words. One voice per slide so each quote
 * gets room, then the pilot's real projects as the proof behind the words.
 * Slide 2 opens on the shy-student quote: it is the objection most students
 * have and few camps answer.
 */

const sheet = (n: number) => ({ id: `shift2-grid-b-${n}`, page: n, total: COVER_TOTALS.b });

export function VoiceIntrovert() {
  return (
    <RisoSlide {...sheet(2)} tag="ไม่ต้องเป็นคนกล้าก่อน" title="introvert ก็ทำได้">
      <QuoteCard voice={SHIFT_VOICES.potterIntrovert} size={44} />
      <p className="pathlab-note pathlab-note--tilt-r mt-auto self-start text-[32px]">
        พ็อตเตอร์ทำปฏิทิน กสพท70 สำหรับคนสายหมอ
      </p>
    </RisoSlide>
  );
}

export function VoiceSelfTaught() {
  return (
    <RisoSlide {...sheet(3)} tag="ไม่มีใครทำให้" title="ค้นเอง ทำเอง">
      <QuoteCard voice={SHIFT_VOICES.potterSelfTaught} size={44} />
    </RisoSlide>
  );
}

export function VoiceFishingRod() {
  return (
    <RisoSlide {...sheet(4)} tag="จากผู้ก่อตั้ง" title="ให้เบ็ด ไม่ใช่ให้ปลา">
      <QuoteCard voice={SHIFT_VOICES.founderFishingRod} size={44} hot />
      <p className="mt-10 text-[30px] leading-[1.5]" style={{ color: DIM }}>
        OpenCode คือเครื่องมือ AI ที่ใช้สร้างต้นแบบ ไม่ต้องเขียนโค้ดเป็นมาก่อน แต่ต้องคิดและตัดสินใจเอง
      </p>
    </RisoSlide>
  );
}

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function VoiceProjects() {
  const projects = (SHIFT_COHORT_0.showcase ?? []).filter((p) => p.featured).slice(0, 3);
  return (
    <RisoSlide {...sheet(5)} tag={`${SHIFT_COHORT_0.name} · เปิดดูได้จริง`} title="สิ่งที่รุ่นแรกสร้างใน 7 วัน">
      <div className="space-y-6">
        {projects.map((project, i) => (
          <div key={project.url} className="flex items-start gap-6">
            <Stamp n={i + 1} hot={i === 0} size={52} />
            <div className="min-w-0">
              <p className="font-kodchasan text-[38px] font-bold leading-tight" style={{ color: INK.paper }}>
                {project.title}
              </p>
              <p className="mt-1 text-[28px] leading-[1.45]" style={{ color: DIM }}>
                {project.pitch}
              </p>
              <p className="mt-1 font-mono text-[20px]" style={{ color: FAINT }}>
                {shortUrl(project.url)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto">
        <CommentCta />
      </div>
    </RisoSlide>
  );
}

export const VOICE_SLIDES = [VoiceIntrovert, VoiceSelfTaught, VoiceFishingRod, VoiceProjects];
