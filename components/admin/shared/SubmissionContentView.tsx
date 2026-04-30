"use client";

import { Image as ImageIcon, Paperclip } from "lucide-react";

interface SubmissionData {
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null | string[];
}

export function SubmissionContentView({
  submission,
  onViewImage,
}: {
  submission: SubmissionData;
  onViewImage: (url: string) => void;
}) {
  const hasText = Boolean(submission.text_answer?.trim());
  const files = submission.file_urls ?? [];

  return (
    <div className="space-y-3">
      {hasText && (
        <div>
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1">
            Submitted Answer
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-md p-3 max-h-[200px] overflow-y-auto">
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {submission.text_answer}
            </p>
          </div>
        </div>
      )}

      {submission.image_url && (
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-2 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Image
            <span className="text-[9px] normal-case tracking-normal text-slate-500">(click to enlarge)</span>
          </div>
          <button
            type="button"
            onClick={() => onViewImage(submission.image_url!)}
            className="block w-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={submission.image_url}
              alt=""
              className="max-h-96 w-full rounded-md border border-slate-800 object-contain hover:opacity-90 transition-opacity"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Paperclip className="h-3 w-3" /> Files
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((url, i) => {
              const isImage = /\.(jpg|jpeg|png|webp|gif|heic|heif)(\?|$)/i.test(url);
              if (isImage) {
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onViewImage(url)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-slate-700 rounded px-2 py-1 cursor-zoom-in"
                  >
                    <ImageIcon className="h-2.5 w-2.5" />
                    Image {i + 1}
                  </button>
                );
              }
              return (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-slate-700 rounded px-2 py-1"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  File {i + 1}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {!hasText && !submission.image_url && files.length === 0 && (
        <p className="text-xs text-slate-600 italic">No content submitted.</p>
      )}
    </div>
  );
}
