"use client";

import { EMOTES } from "@/lib/whiteboard/core";

/** Emoji reactions for everyone on the board; stays open so people can send a few. */
export function ReactionPicker({ onPick }: { onPick: (emoji: (typeof EMOTES)[number]) => void }) {
  return (
    <div className="p-2">
      <p className="wb-popover__label">รีแอคชัน · Reactions</p>
      <div className="grid grid-cols-4 gap-1">
        {EMOTES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            aria-label={`ส่ง ${emoji} · React ${emoji}`}
            className="wb-emoji"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
