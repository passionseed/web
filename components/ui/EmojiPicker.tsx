"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface EmojiPickerProps {
  value: string;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

const EMOJI_CATEGORIES = {
  Faces: [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
    "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋",
  ],
  Objects: [
    "🎯", "🎨", "🎭", "🎪", "🎬", "🎮", "🎲", "🎰", "🎳", "🎹",
    "🎺", "🎸", "🎻", "🎤", "🎧", "🎼", "🎵", "🎶", "🎙️", "🎚️",
  ],
  Symbols: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟",
    "✨", "💫", "🔥", "💥", "💯", "✅", "🎯", "🏆", "🎖️", "🎨",
  ],
  Nature: [
    "🌸", "🌺", "🌻", "🌷", "🌹", "🥀", "🌼", "🌵", "🎄", "🌲",
    "🌳", "🌴", "🌱", "🌿", "☘️", "🍀", "🎍", "🎋", "🍃", "🍂",
  ],
  Animals: [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
    "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦄",
  ],
  Food: [
    "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑",
    "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕", "🌽",
  ],
  Travel: [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
    "🚚", "🚛", "🚜", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚁", "✈️",
  ],
  Activities: [
    "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸",
    "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🎯", "🏹", "🎣", "🥊",
  ],
};

export function EmojiPicker({
  value,
  onSelect,
  disabled = false,
  className,
}: EmojiPickerProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = Object.entries(EMOJI_CATEGORIES).reduce(
    (acc, [category, emojis]) => {
      const filtered = emojis.filter((emoji) => {
        if (!search) return true;
        return category.toLowerCase().includes(search.toLowerCase());
      });
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, string[]>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected Emoji Display */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-4xl">
          {value}
        </div>
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        </div>
      </div>

      {/* Emoji Grid */}
      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50">
        {Object.entries(filteredCategories).map(([category, emojis]) => (
          <div key={category} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              {category}
            </div>
            <div className="grid grid-cols-10 gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  disabled={disabled}
                  className={cn(
                    "text-2xl p-2 rounded-md hover:bg-white transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    value === emoji && "bg-blue-100 ring-2 ring-blue-500"
                  )}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
