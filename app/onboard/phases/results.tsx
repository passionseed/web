'use client';

import type { CollectedData, OnboardingStep } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

function getDirectionCopy(data: CollectedData, isEn: boolean): string {
  if (data.interests?.length) {
    const list = data.interests.join(', ');
    return isEn ? `You're drawn to ${list}` : `คุณสนใจใน ${list}`;
  }

  return isEn
    ? "You're still exploring - that's a great place to start"
    : 'คุณยังสำรวจอยู่ - นั่นคือจุดเริ่มต้นที่ดี';
}

function getSituationCopy(data: CollectedData, isEn: boolean): string {
  if (isEn) {
    switch (data.user_type) {
      case 'lost':
        return "You have a lot of questions and not many answers yet - that's exactly what PassionSeed is built for";
      case 'explorer':
        return "You have a sense of direction but haven't locked in yet - let's find your signal";
      case 'planner':
        return "You know where you're headed - now let's build the path";
      case 'executor':
        return "You're already moving - let's make sure you're moving in the right direction";
      default:
        return "Figuring out where you stand is the first step - we'll help";
    }
  }

  switch (data.user_type) {
    case 'lost':
      return 'คุณมีคำถามมากมาย - PassionSeed สร้างมาเพื่อคุณโดยเฉพาะ';
    case 'explorer':
      return 'คุณมีทิศทางบ้างแล้วแต่ยังไม่แน่ใจ - มาหา signal ที่ใช่กัน';
    case 'planner':
      return 'คุณรู้ว่าอยากไปไหน - มาสร้างเส้นทางกัน';
    case 'executor':
      return 'คุณเดินหน้าอยู่แล้ว - มาให้แน่ใจว่าถูกทิศทาง';
    default:
      return 'การรู้ว่าตัวเองอยู่จุดไหนคือก้าวแรก - เราจะช่วย';
  }
}

function getCircleCopy(data: CollectedData, isEn: boolean): string | null {
  if (!data.influencers?.length) {
    return null;
  }

  const hasExternal = data.influencers.some((influencer) =>
    ['parents', 'social_media'].includes(influencer),
  );
  const selfOnly = data.influencers.length === 1 && data.influencers[0] === 'self';

  if (isEn) {
    if (selfOnly) {
      return "You're figuring this out on your own - we'll give you real signals to work with";
    }

    if (hasExternal) {
      return "Your path may feel shaped by others - we'll help you find what's actually yours";
    }

    return null;
  }

  if (selfOnly) {
    return 'คุณหาคำตอบด้วยตัวเอง - เราจะให้ข้อมูลจริงๆ เพื่อช่วยคุณ';
  }

  if (hasExternal) {
    return 'เส้นทางของคุณอาจรู้สึกว่าถูกกำหนดโดยคนอื่น - เราจะช่วยให้คุณค้นพบสิ่งที่ใช่สำหรับตัวเอง';
  }

  return null;
}

export function ResultsPhase({ data, advance }: Props) {
  const isEn = (data.language || 'en') === 'en';
  const circleCopy = getCircleCopy(data, isEn);

  return (
    <div className="w-full max-w-xl px-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-8 shadow-[0_24px_80px_rgba(6,0,15,0.45)] sm:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-orange-400/12 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-orange-300/80">
              {isEn ? 'Your Snapshot' : 'ภาพรวมของคุณ'}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              {isEn ? "Here's what we know about you" : 'นี่คือสิ่งที่เรารู้เกี่ยวกับคุณ'}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            <div className="ei-card rounded-3xl border border-orange-300/20 bg-orange-400/[0.06] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                {isEn ? 'Your Direction' : 'ทิศทางของคุณ'}
              </p>
              <p className="text-sm leading-7 text-white/90">
                {getDirectionCopy(data, isEn)}
              </p>
            </div>

            <div className="ei-card rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                {isEn ? 'Your Situation' : 'สถานการณ์ของคุณ'}
              </p>
              <p className="text-sm leading-7 text-white/90">
                {getSituationCopy(data, isEn)}
              </p>
            </div>

            {circleCopy ? (
              <div className="ei-card rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                  {isEn ? 'Your Circle' : 'คนรอบข้างคุณ'}
                </p>
                <p className="text-sm leading-7 text-white/90">{circleCopy}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => advance('account', {})}
            className="ei-button-dusk w-full justify-center rounded-2xl py-3 text-sm font-semibold"
          >
            {isEn ? 'Save my profile ->' : 'บันทึกโปรไฟล์ ->'}
          </button>
        </div>
      </div>
    </div>
  );
}
