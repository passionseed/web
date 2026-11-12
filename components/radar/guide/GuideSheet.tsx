"use client";

/**
 * Bottom sheet used by every guide overlay (transcript, chapters, sources,
 * replay). It portals out of the deck: the deck is `fixed z-[100]` and mobile
 * sections use `contain: content`, which would clip a fixed child. The z-index
 * pair matches the CtaCard dialog (`!z-[190]` overlay, `!z-[200]` content).
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./guide.css";

export interface GuideSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  /** Visually hidden unless `showDescription`; always read by screen readers. */
  description?: string;
  showDescription?: boolean;
  children: ReactNode;
  className?: string;
  /** Accent for the grab handle, normally `var(--radar-accent)`. */
  accent?: string;
}

export function GuideSheet({
  open,
  onOpenChange,
  title,
  description,
  showDescription = false,
  children,
  className,
  accent,
}: GuideSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="radar-guide-sheet__overlay fixed inset-0 !z-[190] bg-black/70" />
        <DialogPrimitive.Content
          className={cn(
            "radar-guide-sheet fixed inset-x-0 bottom-0 !z-[200] mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-2xl border border-b-0 border-white/10 bg-neutral-950 text-white shadow-2xl outline-none sm:bottom-6 sm:rounded-2xl sm:border-b",
            className
          )}
          style={accent ? ({ "--radar-guide-sheet-accent": accent } as CSSProperties) : undefined}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="radar-guide-sheet__handle" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 px-5 pt-2">
            <div className="min-w-0 pt-2">
              <DialogPrimitive.Title className="radar-guide-sheet__title">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description
                  className={showDescription ? "mt-1 text-sm text-neutral-400" : "sr-only"}
                >
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              className="radar-guide-icon-button -mr-2 shrink-0"
              aria-label="ปิด"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="radar-guide-sheet__body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
