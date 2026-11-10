"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BoardSettings } from "@/lib/whiteboard/settings";

import { focusCanvas } from "../chrome/useActiveTool";
import { WB_FONT_VARS } from "../fonts";
import { SETTING_ROWS } from "./rows";
import type { UpdateBoardSettings } from "./useBoardSettings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BoardSettings;
  update: UpdateBoardSettings;
};

/** Board settings: a short list of rows from `SETTING_ROWS`. Changes apply as they are made. */
export function BoardSettingsDialog({ open, onOpenChange, settings, update }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // No veil: the board behind shows each change as it is made, in its real colours.
        overlayClassName="bg-transparent"
        // Portalled out of the board: `wb-theme` gives it the board's tokens, light or dark.
        className={`wb-theme wb-dialog wb-settings max-w-sm ${WB_FONT_VARS}`}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          focusCanvas();
        }}
      >
        <DialogHeader>
          <DialogTitle>ตั้งค่าบอร์ด · Board settings</DialogTitle>
          <DialogDescription className="wb-soft">เก็บไว้ในเบราว์เซอร์นี้ คนอื่นในบอร์ดยังเห็นแบบของตัวเอง</DialogDescription>
        </DialogHeader>
        <ul className="wb-settings__rows">
          {SETTING_ROWS.map(({ id, label, hint, layout, Control }) => {
            const labelId = `wb-setting-${id}`;
            return (
              <li key={id} className={`wb-setting wb-setting--${layout}`}>
                <div className="min-w-0 flex-1">
                  <p id={labelId} className="wb-setting__label">
                    {label}
                  </p>
                  {hint && <p className="wb-setting__hint">{hint}</p>}
                </div>
                <Control settings={settings} update={update} labelId={labelId} />
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
