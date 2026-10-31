"use client";

import { Fragment } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/admin/shared/Kbd";
import { ADMIN_CHORDS } from "./useAdminHotkeys";
import { usePlatformModifier } from "./usePlatformModifier";

interface ShortcutRow {
  keys: string[];
  label: string;
  /** Keys pressed one after another ("G then D") instead of together. */
  sequence?: boolean;
}

function ShortcutSection({
  title,
  rows,
}: {
  title: string;
  rows: ShortcutRow[];
}) {
  return (
    <section className="admin-shortcuts-section" aria-label={title}>
      <h3>{title}</h3>
      <dl>
        {rows.map((row) => (
          <div
            key={`${row.keys.join("+")}-${row.label}`}
            className="admin-shortcuts-row"
          >
            <dt>{row.label}</dt>
            <dd>
              {row.keys.map((key, index) => (
                <Fragment key={`${key}-${index}`}>
                  {index > 0 && row.sequence && (
                    <span className="admin-shortcuts-then">then</span>
                  )}
                  <Kbd>{key}</Kbd>
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Every global admin shortcut, opened with "?" or from the palette. */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mod = usePlatformModifier() ?? "Ctrl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="admin-dialog admin-shortcuts max-h-[calc(100svh-2rem)] max-w-md overflow-y-auto"
        // Enter on the close button must not reach page shortcuts on window.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            These work on every admin page. Letter shortcuts pause while you
            type in a field.
          </DialogDescription>
        </DialogHeader>
        <ShortcutSection
          title="Anywhere"
          rows={[
            { keys: [mod, "K"], label: "Open or close the command palette" },
            { keys: ["?"], label: "Show this list" },
            { keys: ["Esc"], label: "Close a dialog" },
          ]}
        />
        <ShortcutSection
          title="Go to"
          rows={ADMIN_CHORDS.map((chord) => ({
            keys: ["G", chord.key.toUpperCase()],
            label: chord.label,
            sequence: true,
          }))}
        />
        <ShortcutSection
          title="In the palette"
          rows={[
            { keys: ["↑", "↓"], label: "Move between results" },
            { keys: ["Enter"], label: "Open" },
            { keys: [mod, "Enter"], label: "Open in a new tab" },
          ]}
        />
        <p className="admin-shortcuts-note">
          The DM inbox and round review have their own keys, such as J and K to
          move between items.
        </p>
      </DialogContent>
    </Dialog>
  );
}
