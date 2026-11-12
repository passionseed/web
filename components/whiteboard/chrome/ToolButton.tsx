"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  /** "ไทย · English", read by screen readers and shown as the tooltip. */
  label: string;
  /** Keyboard shortcut shown in the tooltip, e.g. "V". */
  shortcut?: string;
  /** Set for tools and toggles: highlights the button and sets aria-pressed. */
  active?: boolean;
  /** Where the tooltip shows. */
  tip?: "top" | "bottom";
  children: ReactNode;
};

/** A 44px icon button for the board chrome, with a tooltip and the active state. */
export const ToolButton = forwardRef<HTMLButtonElement, Props>(function ToolButton(
  { label, shortcut, active, tip = "top", className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active}
      data-tip={shortcut ? `${label}  ${shortcut}` : label}
      data-tip-side={tip}
      className={`wb-tool ${active ? "wb-tool--on" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
