"use client";

import { Search } from "lucide-react";

import { Kbd } from "@/components/admin/shared/Kbd";
import { usePlatformModifier } from "./usePlatformModifier";

/** Topbar button that looks like a search field and opens the palette. */
export function CommandPaletteTrigger({ onOpen }: { onOpen: () => void }) {
  const modifier = usePlatformModifier();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="admin-palette-trigger"
      aria-haspopup="dialog"
      aria-label="Search or jump to"
      aria-keyshortcuts={
        modifier ? (modifier === "⌘" ? "Meta+K" : "Control+K") : undefined
      }
    >
      <Search size={16} aria-hidden="true" />
      <span className="admin-palette-trigger-label" aria-hidden="true">
        Search or jump to
      </span>
      {modifier && (
        <span className="admin-palette-trigger-keys" aria-hidden="true">
          <Kbd>{modifier}</Kbd>
          <Kbd>K</Kbd>
        </span>
      )}
    </button>
  );
}
