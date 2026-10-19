import { INK } from "@/components/shift/poster/riso";

import styles from "./shiftFlow.module.css";

/**
 * Shared ink for the SHIFT flow pages. Text levels are picked for contrast
 * on the near-black page and on the paper-tint panels: body 12.9:1 (11.2:1
 * on a panel), muted 9.1:1 (8:1 on a panel). Nothing a student must read
 * goes below muted.
 */

export const paper = (alpha: string) => `${INK.paper}${alpha}`;

export const FLOW_TEXT = {
  strong: INK.paper,
  body: paper("eb"),
  muted: paper("c2"),
  warn: INK.orange,
  link: INK.yellow,
  /** INK.blue is 3.8:1 on black, too dark for text; this is the sky's lighter blue. */
  sky: "#5a9fd4",
} as const;

/** Extends the global .shift-button; set data-variant="discord" | "quiet". */
export const flowButtonClass = `shift-button ${styles.button}`;
export type FlowButtonVariant = "primary" | "discord" | "quiet";

export const flowPanelClass = styles.panel;
export const flowPanelWarnClass = styles.panelWarn;
export const flowFieldClass = styles.field;
