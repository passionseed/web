"use client";

/**
 * The level map in a bottom sheet. Every level is open: "ahead" levels look
 * locked but are tappable, so a student can jump anywhere.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LevelMap, guideArtSrc } from "@/components/radar/guide/story";
import { GuideSheet } from "../GuideSheet";
import { coverHref, deckHref, levelHref } from "./guide-routes";
import { useGuideShell } from "./shell-context";

export interface PageMapSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function PageMapSheet({ open, onOpenChange }: PageMapSheetProps) {
  const router = useRouter();
  const { slug, index, progress, pageKey, reducedMotion } = useGuideShell();
  return (
    <GuideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="แผนที่ด่าน"
      description="แตะด่านไหนก็ได้ ไม่มีด่านไหนล็อก"
      showDescription
      accent={index.accent}
      className="rg-sheet"
    >
      <LevelMap
        pages={index.pages}
        progress={progress}
        currentKey={pageKey}
        backgroundSrc={guideArtSrc(slug, "map")}
        reducedMotion={reducedMotion}
        onJump={(key: string) => {
          onOpenChange(false);
          // No event: interactive_tap counts game players in the funnel.
          if (key !== pageKey) router.push(levelHref(slug, key));
        }}
      />
      <div className="rg-sheet__links">
        <Link href={coverHref(slug)} className="rg-link" onClick={() => onOpenChange(false)}>
          หน้าปก
        </Link>
        <Link href={deckHref(slug)} className="rg-link" onClick={() => onOpenChange(false)}>
          ดูข้อมูลแบบเต็ม
        </Link>
      </div>
    </GuideSheet>
  );
}
