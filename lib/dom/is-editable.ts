export function isEditable(target: EventTarget | null): boolean {
  if (typeof document === "undefined") return false;

  const resolveEl = (t: EventTarget | null): Element | null => {
    if (!t) return null;
    if (t instanceof Element) return t;
    if ((t as any).ownerDocument && (t as any).ownerDocument.activeElement) {
      return (t as any).ownerDocument.activeElement as Element;
    }
    return document.activeElement;
  };

  const el = (resolveEl(target) || document.activeElement) as Element | null;
  if (!el) return false;

  // Inside a contentEditable ancestor (and not explicitly disabled)
  const ceAncestor = (el as HTMLElement).closest(
    '[contenteditable]:not([contenteditable="false"])'
  );
  if (ceAncestor) return true;

  const he = el as HTMLElement;
  if (he.isContentEditable) return true;

  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  const role = he.getAttribute && he.getAttribute("role");
  if (role === "textbox") return true;

  return false;
}
