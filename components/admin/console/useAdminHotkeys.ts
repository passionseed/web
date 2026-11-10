"use client";

import { useEffect, useRef } from "react";
import { isEditable } from "@/lib/dom/is-editable";
import { detectMac } from "./usePlatformModifier";

export interface AdminChord {
  /** Second key after "g". */
  key: string;
  href: string;
  label: string;
}

/** "g then key" jumps. Listed in the shortcuts dialog and the palette. */
export const ADMIN_CHORDS: readonly AdminChord[] = [
  { key: "o", href: "/admin", label: "Overview" },
  { key: "d", href: "/admin/dm-leads", label: "DM leads" },
  { key: "l", href: "/admin/line", label: "LINE inbox" },
  { key: "i", href: "/admin/ig-comments", label: "IG comments" },
  { key: "a", href: "/admin/shift/applications", label: "SHIFT applications" },
  { key: "r", href: "/admin/shift/rounds", label: "Rounds" },
  { key: "u", href: "/admin/users", label: "Users" },
  { key: "p", href: "/admin/maps", label: "PathLabs" },
];

const CHORD_BY_KEY = new Map(ADMIN_CHORDS.map((chord) => [chord.key, chord]));

/** How long after "g" the second key still completes a chord. */
export const CHORD_TIMEOUT_MS = 1000;

export function chordForHref(href: string): AdminChord | undefined {
  return ADMIN_CHORDS.find((chord) => chord.href === href);
}

export interface AdminHotkeyHandlers {
  onTogglePalette: () => void;
  onShowShortcuts: () => void;
  onNavigate: (href: string) => void;
}

/** IME composition (Thai, Japanese, and others) must never trigger a shortcut. */
export function isComposingKey(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

/**
 * The Latin key a shortcut means. On a Thai (or other non-Latin) layout the
 * G key types "เ", so a non-ASCII key falls back to its physical position.
 * Latin layouts (including Dvorak) keep the key they type.
 */
export function shortcutKey(event: KeyboardEvent): string {
  const { key, code } = event;
  if (key.length === 1 && key.charCodeAt(0) < 128) return key;
  const letter = /^Key([A-Z])$/.exec(code ?? "");
  if (letter) return event.shiftKey ? letter[1] : letter[1].toLowerCase();
  if (code === "Slash") return event.shiftKey ? "?" : "/";
  return key;
}

/**
 * Cmd+K on Apple devices, Ctrl+K elsewhere. On macOS, Ctrl+K deletes to the
 * end of the line in text fields, so it is left alone there.
 */
function isPaletteKey(event: KeyboardEvent, mac: boolean): boolean {
  const modifier = mac
    ? event.metaKey && !event.ctrlKey
    : event.metaKey || event.ctrlKey;
  return (
    modifier &&
    !event.altKey &&
    !event.shiftKey &&
    shortcutKey(event).toLowerCase() === "k"
  );
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

/** A confirm or other blocking dialog is open: leave the keyboard to it. */
function blockingDialogOpen(): boolean {
  return Boolean(document.querySelector('[role="alertdialog"]'));
}

function anyDialogOpen(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"], [role="alertdialog"]'),
  );
}

function swallow(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

/**
 * Global admin shortcuts. Listens on window in the capture phase so it runs
 * before page handlers (the DM inbox and round review bind single letters):
 * - Cmd+K (Ctrl+K off Apple devices) toggles the palette, even while typing.
 * - "?" opens the shortcuts dialog when not typing.
 * - "g" then a key jumps to a tool. Only a completed chord is swallowed; any
 *   other second key reaches the page untouched. "gg" is left to the page
 *   (DM inbox: first lead) and does not re-arm, so the key after it is the
 *   page's too.
 */
export function useAdminHotkeys(handlers: AdminHotkeyHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    let armedAt = 0;
    const mac = detectMac();

    const onKeyDown = (event: KeyboardEvent) => {
      if (isComposingKey(event)) return;
      const key = shortcutKey(event);

      if (isPaletteKey(event, mac)) {
        armedAt = 0;
        if (blockingDialogOpen()) return;
        swallow(event);
        latest.current.onTogglePalette();
        return;
      }

      if (armedAt) {
        const fresh = Date.now() - armedAt <= CHORD_TIMEOUT_MS;
        armedAt = 0;
        if (fresh && !hasModifier(event) && !isEditable(event.target)) {
          const chord = CHORD_BY_KEY.get(key);
          if (chord) {
            swallow(event);
            latest.current.onNavigate(chord.href);
            return;
          }
          // The second "g" of "gg" goes to the page and stays disarmed.
          if (key === "g") return;
        }
      }

      if (hasModifier(event) || event.repeat || isEditable(event.target))
        return;
      if (anyDialogOpen()) return;

      if (key === "g") {
        // Arm only. The "g" itself still reaches the page (DM inbox "gg").
        armedAt = Date.now();
        return;
      }
      if (key === "?") {
        event.preventDefault();
        latest.current.onShowShortcuts();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
