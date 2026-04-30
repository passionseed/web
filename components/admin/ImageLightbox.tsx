"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "Submission image", onClose }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!src) return;

    // Store the element that had focus before opening
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: cycle through focusable elements inside the dialog
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    // Auto-focus the close button
    requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog) {
        const closeBtn = dialog.querySelector<HTMLElement>("[data-lightbox-close]");
        closeBtn?.focus();
      }
    });

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      // Restore focus to the element that opened the lightbox
      previousFocusRef.current?.focus();
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </a>
        <button
          data-lightbox-close
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div
        className="max-h-[90vh] max-w-[90vw] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
