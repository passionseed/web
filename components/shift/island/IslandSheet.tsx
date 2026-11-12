"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { X } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

import { COMMON } from "./copy";
import styles from "./island.module.css";

const DESKTOP = "(min-width: 1024px)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isDesktop(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP).matches;
}

/** True at 1024px or wider. Server and first paint assume a phone. */
export function useDesktop(): boolean {
  return useSyncExternalStore(subscribe, isDesktop, () => false);
}

interface IslandSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Short line under the title; also the dialog's accessible description. */
  description?: ReactNode;
  /** Keep the description for screen readers only (the body already shows it another way). */
  descriptionHidden?: boolean;
  /**
   * An action bar that stays in view while the body scrolls: under the
   * scrolling body in the drawer, a sticky bottom bar in the dialog.
   */
  footer?: ReactNode;
  /** Radix's open auto-focus: preventDefault and focus something else (the first field, say). */
  onOpenAutoFocus?: (event: Event) => void;
  children: ReactNode;
}

/** The island stays in view behind a sheet, dimmed, so closing it feels like going back to the world. */
const OVERLAY = "bg-black/45";

/**
 * A bottom sheet on phones (vaul Drawer) and a centred dialog at 1024px and
 * up. Both portal to <body>, so the island tokens ride on `styles.sheet`.
 */
export function IslandSheet({ open, onOpenChange, title, description, descriptionHidden, footer, onOpenAutoFocus, children }: IslandSheetProps) {
  const desktop = useDesktop();
  const hasFooter = footer != null && footer !== false;
  const descriptionClass = descriptionHidden ? "sr-only" : styles.sheetDescription;
  const body = (
    <div lang="th" className={styles.sheetBody}>
      {children}
    </div>
  );
  const bar = hasFooter ? (
    <div lang="th" className={styles.sheetFooter}>
      {footer}
    </div>
  ) : null;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideClose
          overlayClassName={OVERLAY}
          onOpenAutoFocus={onOpenAutoFocus}
          className={`dawn-panel ${styles.sheet} ${styles.sheetDialog}`}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <SheetHead title={<DialogTitle className={styles.sheetTitle}>{title}</DialogTitle>} onClose={() => onOpenChange(false)} />
          {description ? <DialogDescription className={descriptionClass}>{description}</DialogDescription> : null}
          {body}
          {bar}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent
        overlayClassName={OVERLAY}
        onOpenAutoFocus={onOpenAutoFocus}
        className={`dawn-panel rounded-t-3xl border-0 ${hasFooter ? "" : "pb-[env(safe-area-inset-bottom)]"} ${styles.sheet} ${styles.sheetDrawer}`}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <SheetHead title={<DrawerTitle className={styles.sheetTitle}>{title}</DrawerTitle>} onClose={() => onOpenChange(false)} />
        {description ? <DrawerDescription className={descriptionClass}>{description}</DrawerDescription> : null}
        {body}
        {bar}
      </DrawerContent>
    </Drawer>
  );
}

function SheetHead({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  return (
    <div className={styles.sheetHead}>
      {title}
      <button type="button" className={styles.sheetClose} onClick={onClose} aria-label={COMMON.close}>
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
