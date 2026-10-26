/**
 * Page shortcuts (DM inbox, campaign review, round review) listen for single
 * keys on window. They stand down while any dialog is open, and when something
 * already handled the key (a dialog closing on Escape, the "?" shortcut), so a
 * key meant for a dialog never sends a DM or marks a log underneath it.
 */
export function pageShortcutsPaused(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector('[role="dialog"], [role="alertdialog"]'),
  );
}
