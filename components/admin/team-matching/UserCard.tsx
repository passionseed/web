"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { PreferenceCombobox } from "./PreferenceCombobox";
import type { SimUser } from "./types";

const MAX_PREFS = 5;

type Props = {
  user: SimUser;
  allUsers: SimUser[];
  totalUsers: number;
  onChange: (updated: SimUser) => void;
  onDelete: (id: string) => void;
};

export function UserCard({
  user,
  allUsers,
  totalUsers,
  onChange,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed) onChange({ ...user, name: trimmed });
    else setDraft(user.name);
    setEditing(false);
  };

  const setPreference = (index: number, userId: string | null) => {
    const prefs = [...user.preferences];
    if (userId === null) {
      prefs.splice(index, 1);
    } else {
      prefs[index] = userId;
    }
    onChange({ ...user, preferences: prefs });
  };

  const optionsFor = (index: number) => {
    const otherSelected = user.preferences.filter((_, j) => j !== index);
    return allUsers.filter(
      (u) => u.id !== user.id && !otherSelected.includes(u.id)
    );
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(user.name);
                setEditing(false);
              }
            }}
            className="bg-transparent border-b border-[#555] text-sm font-semibold text-white outline-none w-32"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(user.name);
              setEditing(true);
            }}
            className="text-sm font-semibold text-white hover:text-purple-400 transition-colors text-left"
            title="Click to rename"
          >
            {user.name}
          </button>
        )}
        <button
          onClick={() => onDelete(user.id)}
          disabled={totalUsers <= 2}
          className="text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={`Delete ${user.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">
          Preferences (up to {MAX_PREFS})
        </p>
        {Array.from({ length: MAX_PREFS }).map((_, i) => (
          <PreferenceCombobox
            key={i}
            value={user.preferences[i] ?? null}
            onChange={(val) => setPreference(i, val)}
            options={optionsFor(i)}
            placeholder={`Choice ${i + 1}...`}
          />
        ))}
      </div>
    </div>
  );
}
