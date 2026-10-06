import Image from "next/image";
import { SHIFT_GUIDE_SLIDES } from "@/lib/content/shift-guide";
import { DeckCard, GridSlideFrame } from "./grid/GridSlideFrame";
import { PX } from "./pixel/pixelKit";

export function ShiftGuideCarousel() {
  return (
    <div className="flex gap-8">
      {SHIFT_GUIDE_SLIDES.map((slide, index) => (
        <GridSlideFrame key={slide.title} id={`shift-guide-${index + 1}`} tag="FIELD NOTES · SHIFT" title={slide.title} page={`${index + 1}/${SHIFT_GUIDE_SLIDES.length}`} heightCells={225}>
          <h2 className="whitespace-pre-line font-kodchasan text-[66px] font-bold leading-[1.35]" style={{ color: PX.cream }}>{slide.headline}</h2>
          {"shot" in slide ? (
            <div className="mt-7 flex items-start gap-8">
              <p className="w-[560px] text-[42px] leading-[1.65]" style={{ color: PX.cream }}>{slide.body}</p>
              <div className="relative h-[610px] w-[300px] shrink-0 overflow-hidden">
                <Image src={slide.shot} alt="หน้าจอปฏิทิน กสพท70 ผลงาน SHIFT[0]" fill unoptimized className="object-contain object-top" sizes="300px" />
              </div>
            </div>
          ) : (
            <p className="mt-9 whitespace-pre-line text-[46px] leading-[1.65]" style={{ color: PX.cream }}>{slide.body}</p>
          )}
          <DeckCard hot className="mt-8 !px-7 !py-5">
            <p className="text-[34px] font-semibold leading-[1.5]">{slide.note}</p>
          </DeckCard>
        </GridSlideFrame>
      ))}
    </div>
  );
}
