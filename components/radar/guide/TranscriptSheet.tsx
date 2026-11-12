"use client";

/**
 * "อ่านสิ่งที่พูด": the chapter clip's words, from the caption cues. A dialog,
 * so opening it never changes the video section's height.
 */
import { GuideSheet } from "./GuideSheet";

export interface TranscriptSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  chapterTitleTh: string;
  /** Cue texts in order, from the clip's VTT. */
  transcriptTh: readonly string[];
  accent?: string;
}

export function TranscriptSheet({
  open,
  onOpenChange,
  chapterTitleTh,
  transcriptTh,
  accent,
}: TranscriptSheetProps) {
  return (
    <GuideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="สิ่งที่พูดในคลิปนี้"
      description={chapterTitleTh}
      showDescription
      accent={accent}
    >
      {transcriptTh.length > 0 ? (
        <div className="radar-guide-transcript space-y-3">
          {transcriptTh.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">คลิปนี้ยังไม่มีคำบรรยาย</p>
      )}
    </GuideSheet>
  );
}
